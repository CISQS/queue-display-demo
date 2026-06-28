import type { StationKey } from "@/queue/stations";
import { useQueueStore, type StationQueueState } from "@/queue/store";

type FirebaseEnv = {
  VITE_ENABLE_FIREBASE_SYNC?: string;
  VITE_FIREBASE_API_KEY?: string;
  VITE_FIREBASE_AUTH_DOMAIN?: string;
  VITE_FIREBASE_PROJECT_ID?: string;
  VITE_FIREBASE_STORAGE_BUCKET?: string;
  VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  VITE_FIREBASE_APP_ID?: string;
};

type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
};

type RemoteStationDoc = StationQueueState & {
  lastUpdatedBy?: string;
};

const DEVICE_ID_KEY = "queue-display-device-id";

function getDeviceId() {
  if (typeof window === "undefined") return "server";
  const existing = window.localStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const value =
    typeof window.crypto !== "undefined" && "randomUUID" in window.crypto
      ? window.crypto.randomUUID()
      : `device-${Math.random().toString(16).slice(2)}-${Date.now()}`;
  window.localStorage.setItem(DEVICE_ID_KEY, value);
  return value;
}

function getFirebaseConfig(env: FirebaseEnv): FirebaseConfig | null {
  const apiKey = env.VITE_FIREBASE_API_KEY ?? "";
  const authDomain = env.VITE_FIREBASE_AUTH_DOMAIN ?? "";
  const projectId = env.VITE_FIREBASE_PROJECT_ID ?? "";
  const appId = env.VITE_FIREBASE_APP_ID ?? "";
  if (!apiKey || !authDomain || !projectId || !appId) return null;
  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId,
  };
}

function isStationKey(value: unknown): value is StationKey {
  return value === "dr" || value === "nurse" || value === "pharmacy";
}

function coerceStationState(station: StationKey, input: unknown, fallback: StationQueueState): StationQueueState {
  const data = input as Partial<StationQueueState> | null;
  const next: StationQueueState = {
    ...fallback,
    station,
    resetDateKey: typeof data?.resetDateKey === "string" ? data.resetDateKey : fallback.resetDateKey,
    nowServing: typeof data?.nowServing === "string" ? data.nowServing : fallback.nowServing,
    next: Array.isArray(data?.next) ? (data?.next.filter((x) => typeof x === "string") as string[]).slice(0, 120) : fallback.next,
    passedTickets: Array.isArray(data?.passedTickets)
      ? (data?.passedTickets.filter((x) => typeof x === "string") as string[]).slice(-120)
      : fallback.passedTickets,
    recentlyCalled: Array.isArray(data?.recentlyCalled)
      ? (data?.recentlyCalled
          .filter((x) => typeof x === "object" && x !== null)
          .map((x) => {
            const obj = x as { ticket?: unknown; calledAtISO?: unknown };
            return {
              ticket: typeof obj.ticket === "string" ? obj.ticket : "",
              calledAtISO: typeof obj.calledAtISO === "string" ? obj.calledAtISO : "",
            };
          })
          .filter((x) => x.ticket)
          .slice(0, 50) as StationQueueState["recentlyCalled"])
      : fallback.recentlyCalled,
    counters: Array.isArray(data?.counters)
      ? (data?.counters
          .filter((x) => typeof x === "object" && x !== null)
          .map((x) => {
            const obj = x as { counter?: unknown; ticket?: unknown };
            return {
              counter: typeof obj.counter === "number" ? obj.counter : Number(obj.counter),
              ticket: typeof obj.ticket === "string" ? obj.ticket : "",
            };
          })
          .filter((x) => Number.isFinite(x.counter))
          .slice(0, 20) as StationQueueState["counters"])
      : fallback.counters,
    updatedAtISO: typeof data?.updatedAtISO === "string" ? data.updatedAtISO : fallback.updatedAtISO,
  };
  return next;
}

let started = false;

export async function startFirebaseSync() {
  if (started) return;
  started = true;

  const env = import.meta.env as FirebaseEnv;
  const debug = (() => {
    if (typeof window === "undefined") return false;
    if (window.localStorage.getItem("debugSync") === "1") return true;
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has("debugSync")) return true;
    } catch {
      return false;
    }
    const hash = window.location.hash || "";
    const queryIdx = hash.indexOf("?");
    if (queryIdx < 0) return false;
    const params = new URLSearchParams(hash.slice(queryIdx + 1));
    return params.has("debugSync");
  })();

  if (env.VITE_ENABLE_FIREBASE_SYNC !== "true") {
    if (debug) console.info("[firebaseSync] disabled");
    return;
  }

  const config = getFirebaseConfig(env);
  if (!config) {
    console.error("[firebaseSync] missing Firebase env config");
    return;
  }

  const deviceId = getDeviceId();

  let initializeApp: typeof import("firebase/app").initializeApp;
  let getFirestore: typeof import("firebase/firestore").getFirestore;
  let doc: typeof import("firebase/firestore").doc;
  let setDoc: typeof import("firebase/firestore").setDoc;
  let onSnapshot: typeof import("firebase/firestore").onSnapshot;

  try {
    [{ initializeApp }, { getFirestore, doc, setDoc, onSnapshot }] = await Promise.all([
      import("firebase/app"),
      import("firebase/firestore"),
    ]);
  } catch (err) {
    console.error("[firebaseSync] failed to load Firebase SDK", err);
    return;
  }

  let db: ReturnType<typeof getFirestore>;
  try {
    const app = initializeApp(config);
    db = getFirestore(app);
  } catch (err) {
    console.error("[firebaseSync] failed to initialize Firebase", err);
    return;
  }

  console.info("[firebaseSync] enabled");

  const stationKeys: StationKey[] = ["dr", "nurse", "pharmacy"];

  stationKeys.forEach((station) => {
    const ref = doc(db, "stations", station);
    onSnapshot(
      ref,
      (snap) => {
        const data = snap.data() as RemoteStationDoc | undefined;
        if (!data) return;
        if (!isStationKey(data.station)) return;
        if (data.lastUpdatedBy === deviceId) return;

        const state = useQueueStore.getState();
        const localStation = state.stations[station];
        const localMutation = state.lastMutation?.station === station ? state.lastMutation : undefined;
        if (localMutation?.atISO && typeof data.updatedAtISO === "string" && localMutation.atISO >= data.updatedAtISO) {
          return;
        }

        const nextStation = coerceStationState(station, data, localStation);
        useQueueStore.setState((s) => ({
          stations: {
            ...s.stations,
            [station]: nextStation,
          },
        }));
      },
      (err) => {
        console.error(`[firebaseSync] snapshot failed (${station})`, err);
      },
    );
  });

  let lastPushedKey = "";
  useQueueStore.subscribe((state) => {
    const mutation = state.lastMutation;
    if (!mutation) return;
    if (!stationKeys.includes(mutation.station)) return;
    const key = `${mutation.station}:${mutation.type}:${mutation.atISO}`;
    if (key === lastPushedKey) return;
    lastPushedKey = key;

    const station = mutation.station;
    const snapshot = useQueueStore.getState().stations[station];
    const ref = doc(db, "stations", station);
    void setDoc(
      ref,
      {
        ...snapshot,
        lastUpdatedBy: deviceId,
      },
      { merge: false },
    ).catch((err) => {
      console.error(`[firebaseSync] push failed (${station})`, err);
    });
  });

  useQueueStore.getState().ensureDailyReset();
}
