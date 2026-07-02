import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { StationKey } from "@/queue/stations";
import type { QueueSnapshot } from "@/queue/types";

export type StationQueueState = QueueSnapshot & {
  resetDateKey: string;
  passedTickets: string[];
  counters: Array<{
    counter: number;
    ticket: string;
  }>;
};

type QueueStoreState = {
  stations: Record<StationKey, StationQueueState>;
  lastMutation?: {
    station: StationKey;
    type: "call" | "complete" | "pass" | "moveCounterTicketToPassed" | "dismissPassedTicket" | "clearCounterTicket" | "dailyReset";
    atISO: string;
  };
  callTicket: (station: StationKey, ticketInput: string, counter: number) => void;
  completeTicket: (station: StationKey, ticketInput: string, counter: number) => void;
  passTicket: (station: StationKey, ticketInput: string, counter: number) => void;
  moveCounterTicketToPassed: (station: StationKey, counter: number) => void;
  dismissPassedTicket: (station: StationKey, ticket: string) => void;
  clearCounterTicket: (station: StationKey, counter: number) => void;
  cycleCounterTicket: (station: StationKey, counter: number) => void;
  ensureDailyReset: () => void;
};

const CHANNEL_NAME = "queue-display-channel";
let isApplyingRemote = false;

function broadcastStations(stations: QueueStoreState["stations"]) {
  if (isApplyingRemote) return;
  if (typeof BroadcastChannel === "undefined") return;
  const channel = new BroadcastChannel(CHANNEL_NAME);
  channel.postMessage({ type: "stations", stations });
  channel.close();
}

function getPrefix(station: StationKey) {
  if (station === "dr") return "D";
  if (station === "nurse") return "N";
  if (station === "lab") return "L";
  return "P";
}

function padNumber(value: number, length: number) {
  return String(value).padStart(length, "0");
}

function getHongKongResetKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  return `${year}-${month}-${day}-${hour}`;
}

function parseTicket(ticket: string) {
  const match = ticket.trim().toUpperCase().match(/^([A-Z]+)(\d+)$/);
  if (!match) return null;
  const prefix = match[1];
  const numStr = match[2];
  const num = Number(numStr);
  if (!Number.isFinite(num)) return null;
  return { prefix, num, width: numStr.length };
}

function formatTicket(prefix: string, num: number, width: number) {
  return `${prefix}${padNumber(num, width)}`;
}

function normalizeTicket(input: string) {
  return input.trim();
}

function appendPassedTicket(items: string[], ticket: string) {
  return [...items.filter((item) => item !== ticket), ticket].slice(-120);
}

const COUNTER_CYCLE = ["SKH1234", "SML5678", "SHM1123", ""];

function nextCycleValue(current: string) {
  const idx = COUNTER_CYCLE.indexOf(current);
  if (idx < 0) return COUNTER_CYCLE[0];
  return COUNTER_CYCLE[(idx + 1) % COUNTER_CYCLE.length];
}

function buildInitialStation(station: StationKey): StationQueueState {
  const prefix = getPrefix(station);
  const nowIso = new Date().toISOString();
  const nowServing = `${prefix}${padNumber(1, 3)}`;
  const next = Array.from({ length: 30 }).map((_, idx) => `${prefix}${padNumber(2 + idx, 3)}`);
  return {
    station,
    resetDateKey: getHongKongResetKey(),
    nowServing,
    next,
    recentlyCalled: [],
    passedTickets: [],
    counters: [
      { counter: 1, ticket: "" },
      { counter: 2, ticket: "" },
      { counter: 3, ticket: "" },
      { counter: 4, ticket: "" },
    ],
    updatedAtISO: nowIso,
  };
}

function buildResetStation(station: StationKey, nowIso: string, resetDateKey: string): StationQueueState {
  const base = buildInitialStation(station);
  return {
    ...base,
    updatedAtISO: nowIso,
    resetDateKey,
  };
}

function appendRecentlyCalled(prev: StationQueueState, ticket: string, nowIso: string) {
  return [{ ticket, calledAtISO: nowIso }, ...prev.recentlyCalled.filter((x) => x.ticket !== ticket)].slice(0, 50);
}

function ensureNextLength(station: StationKey, nowServing: string, next: string[]) {
  if (next.length >= 30) return next;
  const parsed = parseTicket(nowServing);
  if (!parsed) return next;
  const start = parsed.num + 1;
  const width = Math.max(parsed.width, 3);
  const existing = new Set(next);
  const out = [...next];
  let num = start;
  while (out.length < 30 && out.length < 120) {
    const t = formatTicket(getPrefix(station), num, width);
    if (!existing.has(t)) {
      out.push(t);
      existing.add(t);
    }
    num += 1;
  }
  return out;
}

export const useQueueStore = create<QueueStoreState>()(
  persist(
    (set, get) => ({
      stations: {
        dr: buildInitialStation("dr"),
        nurse: buildInitialStation("nurse"),
        pharmacy: buildInitialStation("pharmacy"),
        lab: buildInitialStation("lab"),
      },
      callTicket: (station, ticketInput, counter) => {
    const ticket = normalizeTicket(ticketInput);
    if (!ticket) return;

    const nowIso = new Date().toISOString();
    set((state) => {
      const prev = state.stations[station];
      const nextList = prev.next.filter((t) => t !== ticket);
      const nextPassed = prev.passedTickets.filter((t) => t !== ticket);
      const recentlyCalled = appendRecentlyCalled(prev, ticket, nowIso);
          const existingCounter = prev.counters.find((c) => c.ticket === ticket)?.counter;
          const targetCounter = existingCounter ?? counter;
          const nextCounters = prev.counters.map((c) => {
            if (c.counter === targetCounter) return { ...c, ticket };
            if (c.ticket === ticket) return { ...c, ticket: "" };
            return c;
          });
          const nextStations = {
            ...state.stations,
            [station]: {
              ...prev,
              nowServing: ticket,
              next: ensureNextLength(station, ticket, nextList),
              passedTickets: nextPassed,
              counters: nextCounters,
              recentlyCalled,
              updatedAtISO: nowIso,
            },
          };
          broadcastStations(nextStations);
          return { stations: nextStations, lastMutation: { station, type: "call", atISO: nowIso } };
    });
      },
      completeTicket: (station, ticketInput, counter) => {
    const state = get();
    const prev = state.stations[station];
    const inputTicket = normalizeTicket(ticketInput);
    const fallbackTicket = prev.counters.find((c) => c.counter === counter)?.ticket ?? prev.nowServing;
    const ticket = inputTicket || fallbackTicket;
    if (!ticket) return;

    const nowIso = new Date().toISOString();
    set((s) => {
      const current = s.stations[station];
      let nextNowServing = current.nowServing;
      let nextQueue = current.next;

      if (ticket === current.nowServing) {
        nextNowServing = current.next[0] ?? "";
        nextQueue = current.next.slice(1);
      } else {
        nextQueue = current.next.filter((t) => t !== ticket);
      }

      const passedTickets = current.passedTickets.filter((t) => t !== ticket);
          const counterFromTicket = current.counters.find((c) => c.ticket === ticket)?.counter;
          const targetCounter = counterFromTicket ?? counter;
          const nextCounters = current.counters.map((c) => (c.counter === targetCounter ? { ...c, ticket: "" } : c));
      const ensuredNext = nextNowServing ? ensureNextLength(station, nextNowServing, nextQueue) : nextQueue;

          const nextStations = {
            ...s.stations,
            [station]: {
              ...current,
              nowServing: nextNowServing,
              next: ensuredNext,
              passedTickets,
              counters: nextCounters,
              updatedAtISO: nowIso,
            },
          };
          broadcastStations(nextStations);
          return { stations: nextStations, lastMutation: { station, type: "complete", atISO: nowIso } };
    });
      },
      passTicket: (station, ticketInput, counter) => {
    const state = get();
    const prev = state.stations[station];
    const inputTicket = normalizeTicket(ticketInput);
    const fallbackTicket = prev.counters.find((c) => c.counter === counter)?.ticket ?? prev.nowServing;
    const ticket = inputTicket || fallbackTicket;
    if (!ticket) return;

    const nowIso = new Date().toISOString();
    set((s) => {
      const current = s.stations[station];
      let nextNowServing = current.nowServing;
      let nextQueue = current.next.filter((t) => t !== ticket);

      if (ticket === current.nowServing) {
        nextNowServing = current.next[0] ?? "";
        nextQueue = current.next.slice(1);
      }

      const passedTickets = appendPassedTicket(current.passedTickets, ticket);
          const counterFromTicket = current.counters.find((c) => c.ticket === ticket)?.counter;
          const targetCounter = counterFromTicket ?? counter;
          const nextCounters = current.counters.map((c) => (c.counter === targetCounter ? { ...c, ticket: "" } : c));
      const ensuredNext = nextNowServing ? ensureNextLength(station, nextNowServing, nextQueue) : nextQueue;

          const nextStations = {
            ...s.stations,
            [station]: {
              ...current,
              nowServing: nextNowServing,
              next: ensuredNext,
              passedTickets,
              counters: nextCounters,
              updatedAtISO: nowIso,
            },
          };
          broadcastStations(nextStations);
          return { stations: nextStations, lastMutation: { station, type: "pass", atISO: nowIso } };
    });
      },
      moveCounterTicketToPassed: (station, counter) => {
        const nowIso = new Date().toISOString();
        set((s) => {
          const current = s.stations[station];
          const ticket = current.counters.find((c) => c.counter === counter)?.ticket ?? "";
          const value = normalizeTicket(ticket);
          if (!value) return s;
          const passedTickets = appendPassedTicket(current.passedTickets, value);
          const counters = current.counters.map((c) => (c.counter === counter ? { ...c, ticket: "" } : c));
          const nextStations = {
            ...s.stations,
            [station]: {
              ...current,
              passedTickets,
              counters,
              updatedAtISO: nowIso,
            },
          };
          broadcastStations(nextStations);
          return { stations: nextStations, lastMutation: { station, type: "moveCounterTicketToPassed", atISO: nowIso } };
        });
      },
      dismissPassedTicket: (station, ticket) => {
        const nowIso = new Date().toISOString();
        set((s) => {
          const current = s.stations[station];
          const passedTickets = current.passedTickets.filter((t) => t !== ticket);
          if (passedTickets.length === current.passedTickets.length) {
            return s;
          }

          const nextStations = {
            ...s.stations,
            [station]: {
              ...current,
              passedTickets,
              updatedAtISO: nowIso,
            },
          };
          broadcastStations(nextStations);
          return { stations: nextStations, lastMutation: { station, type: "dismissPassedTicket", atISO: nowIso } };
        });
      },
      clearCounterTicket: (station, counter) => {
        const nowIso = new Date().toISOString();
        set((s) => {
          const current = s.stations[station];
          const exists = current.counters.some((c) => c.counter === counter && c.ticket);
          if (!exists) return s;
          const nextCounters = current.counters.map((c) => (c.counter === counter ? { ...c, ticket: "" } : c));
          const nextStations = {
            ...s.stations,
            [station]: {
              ...current,
              counters: nextCounters,
              updatedAtISO: nowIso,
            },
          };
          broadcastStations(nextStations);
          return { stations: nextStations, lastMutation: { station, type: "clearCounterTicket", atISO: nowIso } };
        });
      },
      cycleCounterTicket: (station, counter) => {
        const nowIso = new Date().toISOString();
        set((s) => {
          const current = s.stations[station];
          const currentTicket = current.counters.find((c) => c.counter === counter)?.ticket ?? "";
          const nextTicket = nextCycleValue(currentTicket);
          const nextCounters = current.counters.map((c) => (c.counter === counter ? { ...c, ticket: nextTicket } : c));
          const nextStations = {
            ...s.stations,
            [station]: {
              ...current,
              counters: nextCounters,
              updatedAtISO: nowIso,
            },
          };
          broadcastStations(nextStations);
          return { stations: nextStations };
        });
      },
      ensureDailyReset: () => {
        const nowIso = new Date().toISOString();
        const resetDateKey = getHongKongResetKey();
        (["dr", "nurse", "pharmacy", "lab"] as StationKey[]).forEach((station) => {
          const current = get().stations[station];
          if (current.resetDateKey === resetDateKey) return;
          set((state) => {
            const nextStations = {
              ...state.stations,
              [station]: buildResetStation(station, nowIso, resetDateKey),
            };
            broadcastStations(nextStations);
            return {
              stations: nextStations,
              lastMutation: { station, type: "dailyReset", atISO: nowIso },
            };
          });
        });
      },
    }),
    {
      name: "queue-display-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ stations: s.stations }),
      version: 2,
      migrate: (persisted) => {
        const state = persisted as { stations?: Partial<Record<StationKey, Partial<StationQueueState>>> };
        const nextStations: QueueStoreState["stations"] = {
          dr: buildInitialStation("dr"),
          nurse: buildInitialStation("nurse"),
          pharmacy: buildInitialStation("pharmacy"),
          lab: buildInitialStation("lab"),
        };

        (["dr", "nurse", "pharmacy", "lab"] as StationKey[]).forEach((key) => {
          const incoming = state?.stations?.[key];
          if (!incoming) return;
          const base = nextStations[key];
          nextStations[key] = {
            ...base,
            ...incoming,
            station: key,
            resetDateKey: typeof incoming.resetDateKey === "string" ? incoming.resetDateKey : base.resetDateKey,
            passedTickets: Array.isArray(incoming.passedTickets) ? incoming.passedTickets : base.passedTickets,
            counters: Array.isArray(incoming.counters) ? (incoming.counters as StationQueueState["counters"]) : base.counters,
            next: Array.isArray(incoming.next) ? (incoming.next as string[]) : base.next,
            recentlyCalled: Array.isArray(incoming.recentlyCalled) ? (incoming.recentlyCalled as StationQueueState["recentlyCalled"]) : base.recentlyCalled,
          };
        });

        return { stations: nextStations };
      },
    },
  ),
);

if (typeof window !== "undefined") {
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.addEventListener("message", (event) => {
      const data = event.data as { type?: string; stations?: QueueStoreState["stations"] };
      if (data?.type !== "stations" || !data.stations) return;
      isApplyingRemote = true;
      try {
        useQueueStore.setState({ stations: data.stations });
      } finally {
        isApplyingRemote = false;
      }
    });
  }

  window.addEventListener("storage", (e) => {
    if (e.key !== "queue-display-store" || !e.newValue) return;
    try {
      const parsed = JSON.parse(e.newValue) as { state?: { stations?: QueueStoreState["stations"] } };
      if (!parsed?.state?.stations) return;
      isApplyingRemote = true;
      try {
        useQueueStore.setState({ stations: parsed.state.stations });
      } finally {
        isApplyingRemote = false;
      }
    } catch {
      return;
    }
  });
}
