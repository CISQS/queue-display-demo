import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MonitorPlay } from "lucide-react";
import StationSelect from "@/components/StationSelect";
import { getLastStation, isStationKey, setLastStation, type StationKey } from "@/queue/stations";
import { useQueueStore } from "@/queue/store";

export default function Call() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const stationFromQuery = params.get("station") ?? getLastStation();
  const station: StationKey = isStationKey(stationFromQuery) ? stationFromQuery : "dr";
  const isNurseStation = station === "nurse";
  const asset = (p: string) => `${import.meta.env.BASE_URL}${p}`;

  const [ticketInput, setTicketInput] = useState("");
  const [counter, setCounter] = useState(1);
  const stationState = useQueueStore((s) => s.stations[station]);
  const callTicket = useQueueStore((s) => s.callTicket);
  const completeTicket = useQueueStore((s) => s.completeTicket);
  const passTicket = useQueueStore((s) => s.passTicket);
  const lastCalled = stationState.recentlyCalled[0];

  const lastCallTimeLabel = useMemo(() => {
    if (!lastCalled?.calledAtISO) return "--";
    const date = new Date(lastCalled.calledAtISO);
    if (Number.isNaN(date.getTime())) return "--";
    return new Intl.DateTimeFormat("zh-HK", {
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(date);
  }, [lastCalled?.calledAtISO]);

  useEffect(() => {
    const counterTicket = stationState.counters.find((item) => item.counter === counter)?.ticket ?? "";
    setTicketInput(counterTicket);
  }, [stationState.counters, counter]);

  useEffect(() => {
    if (isNurseStation) setCounter(1);
  }, [isNurseStation]);

  useEffect(() => {
    setLastStation(station);
  }, [station]);

  const toggleFullscreen = async () => {
    const doc = document as Document & {
      webkitExitFullscreen?: () => Promise<void> | void;
      webkitFullscreenElement?: Element | null;
    };
    const root = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
    };

    const fullscreenElement = doc.fullscreenElement ?? doc.webkitFullscreenElement;
    try {
      if (fullscreenElement) {
        if (doc.exitFullscreen) await doc.exitFullscreen();
        else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
        return;
      }
      if (root.requestFullscreen) await root.requestFullscreen();
      else if (root.webkitRequestFullscreen) await root.webkitRequestFullscreen();
    } catch {
      return;
    }
  };

  return (
    <div className="min-h-screen bg-[#e6e6e6] text-[#222]">
      <div className="h-10 w-full bg-[#2aa9b8]" />
      <div className="flex items-center justify-between border-b border-black/10 bg-white px-4 py-2">
        <div className="flex items-center gap-3">
          <img
            src={asset("qdisplay/assets/hksh_logo-CIMGYLsQ.png")}
            className="h-6 w-6 rounded object-contain"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
          <div className="text-sm font-semibold">Queue System</div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleFullscreen}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-black/15 bg-white px-3 text-xs font-semibold text-black/70 shadow-sm transition hover:bg-black/[0.03] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#2aa9b8]/25"
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            aria-label="Full Screen"
            title="Full Screen"
          >
            Full Screen
          </button>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-black/15 bg-white px-3 text-xs font-semibold text-black/70 shadow-sm transition hover:bg-black/[0.03] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#2aa9b8]/25"
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
          >
            Home
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-6 py-8">
        <div className="rounded-xl border border-black/10 bg-white">
          <div className="bg-[#2aa9b8] px-4 py-2 text-sm font-semibold text-white">叫號系統 Calling System</div>
          <div className="p-6">
            <button
              type="button"
              onClick={() => {
                const url = `${import.meta.env.BASE_URL}#/display?station=${station}`;
                window.open(url, "_blank", "noopener,noreferrer");
              }}
              className="mb-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#2aa9b8] px-4 text-sm font-semibold text-white shadow-sm transition duration-150 hover:bg-[#2396a3] hover:shadow-md active:translate-y-[1px] active:scale-[0.98] active:bg-[#1e8691] active:shadow-inner focus:outline-none focus:ring-2 focus:ring-[#2aa9b8]/35"
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            >
              <MonitorPlay className="h-4 w-4" />
              Queue Display
            </button>
            <div className="grid gap-4">
              <div>
                <div className="text-xs font-semibold text-black/60">Station</div>
                <StationSelect
                  value={station}
                  onChange={(next) => {
                    setLastStation(next);
                    setParams({ station: next });
                  }}
                  className="mt-2"
                  variant="light"
                />
              </div>

              {!isNurseStation && (
                <div>
                  <div className="text-xs font-semibold text-black/60">Counter</div>
                  <div className="relative mt-2">
                    <select
                      value={counter}
                      onChange={(e) => setCounter(Number(e.target.value))}
                      className="h-11 w-full appearance-none rounded-lg border border-black/15 bg-white pl-4 pr-10 text-sm font-semibold text-black outline-none focus:ring-2 focus:ring-[#2aa9b8]/30"
                    >
                      {[1, 2, 3, 4].map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-black/60">▾</div>
                  </div>
                </div>
              )}

              <div>
                <div className="text-xs font-semibold text-black/60">Ticket No.</div>
                <input
                  value={ticketInput}
                  onChange={(e) => setTicketInput(e.target.value)}
                  placeholder="例如：OPD023 / 23"
                  className="mt-2 h-11 w-full rounded-lg border border-black/15 bg-white px-4 text-sm font-semibold tracking-wide text-black outline-none focus:ring-2 focus:ring-[#2aa9b8]/30"
                />
              </div>

              <div className="grid gap-3 rounded-lg border border-black/10 bg-black/[0.02] p-4 sm:grid-cols-2">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-black/50">Last Called</div>
                  <div className="mt-1 text-lg font-semibold text-black">{lastCalled?.ticket || "--"}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-black/50">Last Call Time</div>
                  <div className="mt-1 text-lg font-semibold text-black">{lastCallTimeLabel}</div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => callTicket(station, ticketInput, isNurseStation ? 1 : counter)}
                  className="inline-flex h-11 items-center justify-center rounded-lg bg-[#00B18B] px-4 text-sm font-semibold text-white shadow-sm transition duration-150 hover:bg-[#009a78] hover:shadow-md active:translate-y-[1px] active:scale-[0.98] active:bg-[#008f70] active:shadow-inner focus:outline-none focus:ring-2 focus:ring-[#00B18B]/35"
                  style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                >叫號</button>
                <button
                  type="button"
                  onClick={() => completeTicket(station, ticketInput, isNurseStation ? 1 : counter)}
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-black/15 bg-white px-4 text-sm font-semibold text-black/80 shadow-sm transition duration-150 hover:bg-black/[0.03] hover:shadow-md active:translate-y-[1px] active:scale-[0.98] active:bg-black/[0.06] active:shadow-inner focus:outline-none focus:ring-2 focus:ring-[#2aa9b8]/25"
                  style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                >
                  完成
                </button>
                <button
                  type="button"
                  onClick={() => passTicket(station, ticketInput, isNurseStation ? 1 : counter)}
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-black/15 bg-white px-4 text-sm font-semibold text-black/80 shadow-sm transition duration-150 hover:bg-black/[0.03] hover:shadow-md active:translate-y-[1px] active:scale-[0.98] active:bg-black/[0.06] active:shadow-inner focus:outline-none focus:ring-2 focus:ring-[#2aa9b8]/25"
                  style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                >
                  已過號
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
