import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams, type SetURLSearchParams } from "react-router-dom";
import { MonitorPlay } from "lucide-react";
import StationSelect from "@/components/StationSelect";
import { getLastStation, isStationKey, setLastStation, type StationKey } from "@/queue/stations";
import { useQueueStore } from "@/queue/store";

export default function Call() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const stationFromQueryRaw = params.get("station");
  const stationCandidate: string = stationFromQueryRaw ? stationFromQueryRaw.toLowerCase() : getLastStation();
  const station: StationKey = isStationKey(stationCandidate) ? stationCandidate : "dr";
  const asset = (p: string) => `${import.meta.env.BASE_URL}${p}`;

  if (station === "lab") {
    return (
      <LabCallMockUI
        asset={asset}
        onHome={() => navigate("/")}
        onToggleFullscreen={async () => {
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
        }}
      />
    );
  }

  return <StandardCall station={station} asset={asset} setParams={setParams} onHome={() => navigate("/")} />;
}

type StandardCallProps = {
  station: StationKey;
  asset: (path: string) => string;
  setParams: SetURLSearchParams;
  onHome: () => void;
};

function StandardCall({ station, asset, setParams, onHome }: StandardCallProps) {
  const isNurseStation = station === "nurse";

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
            onClick={onHome}
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

type LabCallMockUIProps = {
  asset: (path: string) => string;
  onHome: () => void;
  onToggleFullscreen: () => void | Promise<void>;
};

function LabCallMockUI({ asset, onHome, onToggleFullscreen }: LabCallMockUIProps) {
  const [value, setValue] = useState("");
  const [mode, setMode] = useState<"num" | "alpha">("num");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!submitted) return;
    const timer = window.setTimeout(() => setSubmitted(null), 1800);
    return () => window.clearTimeout(timer);
  }, [submitted]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const update = () => {
      const doc = document as Document & {
        webkitFullscreenElement?: Element | null;
      };
      setIsFullscreen(Boolean(doc.fullscreenElement ?? doc.webkitFullscreenElement));
    };
    update();
    document.addEventListener("fullscreenchange", update);
    document.addEventListener("webkitfullscreenchange", update as EventListener);
    return () => {
      document.removeEventListener("fullscreenchange", update);
      document.removeEventListener("webkitfullscreenchange", update as EventListener);
    };
  }, []);

  const formatDateDDMMYYYY = (date: Date) => {
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = String(date.getFullYear());
    return `${dd}/${mm}/${yyyy}`;
  };

  const formatTimeHHmm = (date: Date) => {
    const hh = String(date.getHours()).padStart(2, "0");
    const min = String(date.getMinutes()).padStart(2, "0");
    return `${hh}:${min}`;
  };

  const formatWeekdayZhEn = (date: Date) => {
    const zh = new Intl.DateTimeFormat("zh-HK", { weekday: "long" }).format(date);
    const en = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(date);
    return `${zh} ${en}`;
  };

  const append = (next: string) => {
    setValue((prev) => {
      const merged = `${prev}${next}`;
      return merged.slice(0, 18);
    });
  };

  const backspace = () => {
    setValue((prev) => prev.slice(0, -1));
  };

  const clear = () => {
    setValue("");
  };

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setSubmitted(trimmed);
  };

  const numKeys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
  const alphaKeys = Array.from({ length: 26 }, (_, idx) => String.fromCharCode(65 + idx));

  return (
    <div className="min-h-screen w-full ui-sans-serif">
      <div className="flex min-h-screen w-full flex-col bg-gradient-to-r from-[#e2f3f4] to-[#d2f0e6] text-black">
        <div className="bg-[#008d63]">
          <div className="inset-x-0 top-0 flex flex-wrap items-center justify-between bg-white">
            <button
              type="button"
              onClick={onHome}
              className="m-2 flex items-center pl-5 text-left"
              style={{
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <img
                src={asset("qdisplay/assets/hksh_logo-CIMGYLsQ.png")}
                className="h-16 cursor-pointer"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
              <div className="ml-5 cursor-pointer text-2xl font-bold">
                檢驗
                <br />
                Lab
              </div>
            </button>
            <button
              type="button"
              onClick={onToggleFullscreen}
              className="m-2 flex items-center gap-3 pr-2 text-sm"
              style={{
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
              }}
              aria-label={isFullscreen ? "退出全屏" : "進入全屏"}
              title={isFullscreen ? "退出全屏" : "進入全屏"}
            >
              <div className="text-right leading-none">
                <div className="text-[clamp(14px,1.35vw,18px)] font-semibold">{formatWeekdayZhEn(now)}</div>
                <div className="mt-1 flex items-end justify-end gap-3">
                  <div className="text-[clamp(14px,1.35vw,18px)] font-semibold text-black/70">{formatDateDDMMYYYY(now)}</div>
                  <div className="text-[clamp(34px,3.8vw,56px)] font-semibold tabular-nums">{formatTimeHHmm(now)}</div>
                </div>
              </div>
              <div className="opacity-40">
                <img
                  src={asset("qdisplay/assets/logo-hksh-emc-sh-B1ezILO2.png")}
                  className="min-h-20"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
            </button>
          </div>
        </div>

        <div
          className="mx-auto w-[min(92vw,92vh)] max-w-3xl px-2 py-4"
          style={{ transform: "scale(0.9)", transformOrigin: "top center" }}
        >
          <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_18px_38px_rgba(0,0,0,0.10)]">
            <div className="bg-[#00B18B] px-6 py-5 text-white">
              <div className="text-[28px] font-semibold leading-none">自助報到機</div>
              <div className="mt-1 text-[18px] font-semibold opacity-95">Self Check In</div>
            </div>

            <div className="p-5">
              <div className="rounded-2xl bg-[#f6f9f1] p-5">
                <div className="mt-4 flex items-stretch gap-3">
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="relative">
                      <input
                        value={value}
                        readOnly
                        placeholder="請掃碼 / Please scan barcode"
                        className="h-16 w-full rounded-2xl border border-black/10 bg-white px-5 pr-14 text-center text-[26px] font-semibold tracking-wider text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          clear();
                          setSubmitted(null);
                        }}
                        className="absolute right-4 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/5 text-lg font-bold text-black/50 transition hover:bg-black/10"
                        aria-label="Clear"
                        title="Clear"
                        style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                      >
                        ×
                      </button>
                    </div>
                    {submitted && <div className="mt-2 text-center text-sm font-semibold text-[#008f70]">{`OK：${submitted}`}</div>}
                  </div>

                  <button
                    type="button"
                    onClick={backspace}
                    className="inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-black/10 bg-white text-[22px] font-semibold text-black/70 shadow-sm transition hover:bg-black/[0.03] active:translate-y-[1px]"
                    style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                    aria-label="Backspace"
                    title="Backspace"
                  >
                    ⌫
                  </button>
                </div>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_220px]">
                <div className="rounded-2xl border border-black/10 bg-white p-5">
                  {mode === "num" ? (
                    <div className="grid grid-cols-3 gap-3">
                      {numKeys.map((key) => (
                        <button
                          key={`num-${key}`}
                          type="button"
                          onClick={() => append(key)}
                          className="h-20 rounded-2xl border border-black/10 bg-[#f7f7f7] text-[28px] font-semibold text-black shadow-[0_8px_18px_rgba(0,0,0,0.08)] transition hover:bg-[#f0f0f0] active:translate-y-[1px] active:shadow-[0_2px_6px_rgba(0,0,0,0.10)]"
                          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                        >
                          {key}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setMode("alpha")}
                        className="h-20 rounded-2xl border border-black/10 bg-[#f7f7f7] text-[22px] font-semibold text-black/70 shadow-[0_8px_18px_rgba(0,0,0,0.08)] transition hover:bg-[#f0f0f0] active:translate-y-[1px] active:shadow-[0_2px_6px_rgba(0,0,0,0.10)]"
                        style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                      >
                        abc
                      </button>
                      <button
                        type="button"
                        onClick={() => append("0")}
                        className="h-20 rounded-2xl border border-black/10 bg-[#f7f7f7] text-[28px] font-semibold text-black shadow-[0_8px_18px_rgba(0,0,0,0.08)] transition hover:bg-[#f0f0f0] active:translate-y-[1px] active:shadow-[0_2px_6px_rgba(0,0,0,0.10)]"
                        style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                      >
                        0
                      </button>
                      <button
                        type="button"
                        onClick={backspace}
                        className="h-20 rounded-2xl border border-black/10 bg-[#f7f7f7] text-[22px] font-semibold text-black/70 shadow-[0_8px_18px_rgba(0,0,0,0.08)] transition hover:bg-[#f0f0f0] active:translate-y-[1px] active:shadow-[0_2px_6px_rgba(0,0,0,0.10)]"
                        style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                      >
                        X
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-6 gap-2">
                      {alphaKeys.map((key) => (
                        <button
                          key={`alpha-${key}`}
                          type="button"
                          onClick={() => append(key)}
                          className="h-14 rounded-xl border border-black/10 bg-[#f7f7f7] text-[18px] font-semibold text-black shadow-[0_8px_18px_rgba(0,0,0,0.08)] transition hover:bg-[#f0f0f0] active:translate-y-[1px] active:shadow-[0_2px_6px_rgba(0,0,0,0.10)]"
                          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                        >
                          {key}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setMode("num")}
                        className="col-span-2 h-14 rounded-xl border border-black/10 bg-[#f7f7f7] text-[18px] font-semibold text-black/70 shadow-[0_8px_18px_rgba(0,0,0,0.08)] transition hover:bg-[#f0f0f0] active:translate-y-[1px] active:shadow-[0_2px_6px_rgba(0,0,0,0.10)]"
                        style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                      >
                        123
                      </button>
                      <button
                        type="button"
                        onClick={() => append("-")}
                        className="col-span-2 h-14 rounded-xl border border-black/10 bg-[#f7f7f7] text-[18px] font-semibold text-black/70 shadow-[0_8px_18px_rgba(0,0,0,0.08)] transition hover:bg-[#f0f0f0] active:translate-y-[1px] active:shadow-[0_2px_6px_rgba(0,0,0,0.10)]"
                        style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                      >
                        -
                      </button>
                      <button
                        type="button"
                        onClick={backspace}
                        className="col-span-2 h-14 rounded-xl border border-black/10 bg-[#f7f7f7] text-[18px] font-semibold text-black/70 shadow-[0_8px_18px_rgba(0,0,0,0.08)] transition hover:bg-[#f0f0f0] active:translate-y-[1px] active:shadow-[0_2px_6px_rgba(0,0,0,0.10)]"
                        style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                      >
                        ⌫
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      clear();
                      setSubmitted(null);
                    }}
                    className="inline-flex h-20 items-center justify-center rounded-2xl border border-black/15 bg-white px-4 text-[22px] font-semibold text-black/80 shadow-sm transition hover:bg-black/[0.03] active:translate-y-[1px] active:scale-[0.99]"
                    style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                  >
                    清空 Clear
                  </button>
                  <button
                    type="button"
                    onClick={submit}
                    className="inline-flex h-20 items-center justify-center rounded-2xl bg-[#00B18B] px-4 text-[22px] font-semibold text-white shadow-[0_10px_22px_rgba(0,177,139,0.22)] transition hover:bg-[#009a78] active:translate-y-[1px] active:scale-[0.99]"
                    style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                  >
                    完成 OK
                  </button>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-black/10 bg-[#edeedd] px-5 py-4 text-center">
                <div className="text-sm font-semibold text-black/75">
                  提示：請掃描患者通行證或備忘單上的二維碼排隊取號
                </div>
                <div className="mt-1 text-sm font-semibold text-black/55">
                  Please scan Patient Pass/ Investigation Reminder to get queue ticket
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
