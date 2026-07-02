import type { StationKey } from "@/queue/stations";
import type { QueueSnapshot } from "@/queue/types";

function padNumber(value: number, length: number) {
  return String(value).padStart(length, "0");
}

function getPrefix(station: StationKey) {
  if (station === "dr") return "D";
  if (station === "nurse") return "N";
  if (station === "lab") return "L";
  return "P";
}

function getBase(station: StationKey) {
  if (station === "dr") return 10;
  if (station === "nurse") return 100;
  if (station === "lab") return 200;
  return 1;
}

export function getMockQueueSnapshot(station: StationKey, nowMs = Date.now()): QueueSnapshot {
  const prefix = getPrefix(station);
  const base = getBase(station);

  const tick = Math.floor(nowMs / 8000);
  const servingNo = base + (tick % 90);

  const nowServing = `${prefix}${padNumber(servingNo, 3)}`;
  const next = Array.from({ length: 7 }).map((_, idx) => `${prefix}${padNumber(servingNo + idx + 1, 3)}`);

  const recentlyCalled = Array.from({ length: 8 }).map((_, idx) => {
    const ticket = `${prefix}${padNumber(servingNo - (idx + 1), 3)}`;
    const calledAtMs = nowMs - (idx + 1) * 3 * 60 * 1000;
    return { ticket, calledAtISO: new Date(calledAtMs).toISOString() };
  });

  return {
    station,
    nowServing,
    next,
    recentlyCalled,
    updatedAtISO: new Date(nowMs).toISOString(),
  };
}
