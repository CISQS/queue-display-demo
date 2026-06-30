import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getLastStation, getStationOption, isStationKey, setLastStation, type StationKey } from "@/queue/stations";
import { useQueueSnapshot } from "@/hooks/useQueueSnapshot";
import { useQueueStore } from "@/queue/store";
import { DOCTOR_NAMES_STORAGE_KEY, DOCTOR_NAMES_UPDATED_EVENT, loadDoctorNames } from "@/queue/doctorConfig";

const MOCK_TICKET_PRESETS = [
  { prefix: "SHK", start: 123 },
  { prefix: "SHH", start: 304 },
  { prefix: "SML", start: 321 },
];

const FIXED_MISSED_TICKETS = Array.from({ length: 11 }, (_, idx) => {
  const preset = MOCK_TICKET_PRESETS[idx % MOCK_TICKET_PRESETS.length];
  const offset = Math.floor(idx / MOCK_TICKET_PRESETS.length);
  return `${preset.prefix}${String(preset.start + offset).padStart(3, "0")}`;
});
const FIXED_NOTICE_STORAGE_PREFIX = "queue-display-fixed-notice";
const DOCTOR_ROOMS = ["A", "B", "C", "D"];
const MOCK_TICKET_CYCLE = [
  "",
  "SHK123",
  "SHH304",
  "SML321",
];

function nextMockTicket(current: string) {
  const idx = MOCK_TICKET_CYCLE.indexOf(current);
  if (idx < 0) return MOCK_TICKET_CYCLE[1];
  return MOCK_TICKET_CYCLE[(idx + 1) % MOCK_TICKET_CYCLE.length];
}

function getFixedNoticeStorageKey(station: StationKey) {
  return `${FIXED_NOTICE_STORAGE_PREFIX}:${station}`;
}

function loadFixedNoticeState(station: StationKey) {
  if (typeof window === "undefined") {
    return { showFixedNoticeTickets: true, hiddenFixedNoticeTickets: [] as string[] };
  }

  try {
    const raw = window.localStorage.getItem(getFixedNoticeStorageKey(station));
    if (!raw) {
      return { showFixedNoticeTickets: true, hiddenFixedNoticeTickets: [] as string[] };
    }
    const parsed = JSON.parse(raw) as {
      showFixedNoticeTickets?: boolean;
      hiddenFixedNoticeTickets?: string[];
    };
    return {
      showFixedNoticeTickets: parsed.showFixedNoticeTickets ?? true,
      hiddenFixedNoticeTickets: Array.isArray(parsed.hiddenFixedNoticeTickets) ? parsed.hiddenFixedNoticeTickets : [],
    };
  } catch {
    return { showFixedNoticeTickets: true, hiddenFixedNoticeTickets: [] as string[] };
  }
}

function persistFixedNoticeState(station: StationKey, state: { showFixedNoticeTickets: boolean; hiddenFixedNoticeTickets: string[] }) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getFixedNoticeStorageKey(station), JSON.stringify(state));
}

function formatDateTimeDDMMYYYYHHmmss(date: Date) {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = String(date.getFullYear());
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${dd}-${mm}-${yyyy} ${hh}:${min}:${ss}`;
}

export default function QueueDisplay() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const stationFromQuery = params.get("station") ?? getLastStation();
  const station: StationKey = isStationKey(stationFromQuery) ? stationFromQuery : "dr";

  const stationOption = useMemo(() => getStationOption(station), [station]);
  const displayStationZh = station === "dr" ? "醫生站" : stationOption.labelZh;
  const displayStationEn = station === "dr" ? "Doctor Station" : stationOption.labelEn;

  const { snapshot, passedTickets } = useQueueSnapshot(station);
  const cycleCounterTicket = useQueueStore((s) => s.cycleCounterTicket);
  const moveCounterTicketToPassed = useQueueStore((s) => s.moveCounterTicketToPassed);
  const dismissPassedTicket = useQueueStore((s) => s.dismissPassedTicket);
  const clearCounterTicket = useQueueStore((s) => s.clearCounterTicket);
  const [now, setNow] = useState(() => new Date());
  const initialFixedNoticeState = useMemo(() => loadFixedNoticeState(station), [station]);
  const [showFixedNoticeTickets, setShowFixedNoticeTickets] = useState(initialFixedNoticeState.showFixedNoticeTickets);
  const [hiddenFixedNoticeTickets, setHiddenFixedNoticeTickets] = useState<Set<string>>(
    () => new Set(initialFixedNoticeState.hiddenFixedNoticeTickets),
  );
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [doctorNames, setDoctorNames] = useState(() => loadDoctorNames());
  const [doctorMockTickets, setDoctorMockTickets] = useState<string[]>(() => Array.from({ length: 4 }).map(() => ""));
  const [nurseMockTicket, setNurseMockTicket] = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setLastStation(station);
  }, [station]);

  useEffect(() => {
    setDoctorMockTickets(Array.from({ length: 4 }).map(() => ""));
    setNurseMockTicket("");
  }, [station]);

  useEffect(() => {
    const update = () => setDoctorNames(loadDoctorNames());
    const onStorage = (e: StorageEvent) => {
      if (e.key !== DOCTOR_NAMES_STORAGE_KEY) return;
      update();
    };
    update();
    window.addEventListener("storage", onStorage);
    window.addEventListener(DOCTOR_NAMES_UPDATED_EVENT, update as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(DOCTOR_NAMES_UPDATED_EVENT, update as EventListener);
    };
  }, []);

  useEffect(() => {
    setShowFixedNoticeTickets(initialFixedNoticeState.showFixedNoticeTickets);
    setHiddenFixedNoticeTickets(new Set(initialFixedNoticeState.hiddenFixedNoticeTickets));
  }, [initialFixedNoticeState]);

  useEffect(() => {
    persistFixedNoticeState(station, {
      showFixedNoticeTickets,
      hiddenFixedNoticeTickets: [...hiddenFixedNoticeTickets],
    });
  }, [station, showFixedNoticeTickets, hiddenFixedNoticeTickets]);

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

  const rows = useMemo(() => {
    return snapshot.counters.map((c) => ({
      ticket: c.ticket,
      counter: String(c.counter),
    }));
  }, [snapshot.counters]);

  const nurseTicket = useMemo(() => {
    return snapshot.counters.find((c) => c.counter === 1)?.ticket ?? "";
  }, [snapshot.counters]);

  const waitingMins = useMemo(() => {
    if (station === "pharmacy") return 20;
    if (station === "dr") return 15;
    return 10;
  }, [station]);

  const fixedNoticeTickets = useMemo(() => {
    return FIXED_MISSED_TICKETS.filter((t) => !hiddenFixedNoticeTickets.has(t));
  }, [hiddenFixedNoticeTickets]);

  const mergedNoticeTickets = useMemo(() => {
    const out: Array<{ ticket: string; isFixed: boolean }> = [];
    const fixedSet = new Set<string>();
    if (showFixedNoticeTickets) {
      fixedNoticeTickets.forEach((t) => {
        out.push({ ticket: t, isFixed: true });
        fixedSet.add(t);
      });
    }
    passedTickets.forEach((t) => {
      if (fixedSet.has(t)) return;
      out.push({ ticket: t, isFixed: false });
    });
    return out;
  }, [fixedNoticeTickets, passedTickets, showFixedNoticeTickets]);

  const columnLabelZh = station === "dr" ? "醫生" : "櫃位";
  const columnLabelEn = station === "dr" ? "Doctor" : "Counter";
  const asset = (p: string) => `${import.meta.env.BASE_URL}${p}`;

  const handleToggleMockNoticeTickets = () => {
    if (showFixedNoticeTickets) {
      setShowFixedNoticeTickets(false);
      return;
    }
    setHiddenFixedNoticeTickets(new Set());
    setShowFixedNoticeTickets(true);
  };

  if (station === "nurse") {
    const nurseTicketIsMock = MOCK_TICKET_CYCLE.includes(nurseTicket);
    const nurseDisplayTicket = nurseMockTicket || nurseTicket;
    return (
      <div className="min-h-screen w-full ui-sans-serif">
        <div className="flex min-h-screen w-full flex-col bg-gradient-to-b from-[#f1e8c4] to-[#dff0cc] text-black">
          <div className="bg-[#008d63]">
            <div className="inset-x-0 top-0 flex flex-wrap items-center justify-between bg-white">
              <button
                type="button"
                onClick={() => navigate("/")}
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
                  {displayStationZh}
                  <br />
                  {displayStationEn}
                </div>
              </button>
              <button
                type="button"
                onClick={toggleFullscreen}
                className="m-2 flex items-center text-sm"
                style={{
                  touchAction: "manipulation",
                  WebkitTapHighlightColor: "transparent",
                }}
                aria-label={isFullscreen ? "退出全屏" : "進入全屏"}
                title={isFullscreen ? "退出全屏" : "進入全屏"}
              >
                <div className="text-center text-xs">
                  <p className="text-base uppercase leading-none">
                    <br />
                    養和醫院
                    <br />
                    Hong Kong
                    <br />
                    Sanatorium &amp; Hospital <br />
                    <br />
                    <span className="font-semibold">{formatDateTimeDDMMYYYYHHmmss(now)}</span>
                  </p>
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

          <div className="flex h-24 w-full items-center justify-center bg-[#008d63] px-6 text-white">
            <div className="text-4xl font-semibold tracking-wide">護士分流站 Nurse Station</div>
          </div>

          <div className="flex flex-1 items-stretch justify-center px-10">
            <button
              type="button"
              onClick={() => {
                const base = nurseMockTicket || (nurseTicketIsMock ? nurseTicket : "");
                setNurseMockTicket(nextMockTicket(base));
              }}
              aria-label="點擊循環顯示測試票號"
              className="flex w-full items-center justify-center font-sans text-[180px] font-semibold tabular-nums"
              style={{
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {nurseDisplayTicket}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full ui-sans-serif">
      <div className="flex min-h-screen w-full select-none flex-col bg-gradient-to-r from-[#eedcac] to-[#bce4be] text-black">
        <div className="bg-[#008d63]">
          <div className="inset-x-0 top-0 flex flex-wrap items-center justify-between bg-white">
            <button
              type="button"
              onClick={() => navigate("/")}
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
              {station === "dr" ? (
                <div className="ml-5 cursor-pointer text-2xl font-bold">
                  {displayStationZh} {displayStationEn}
                </div>
              ) : (
                <div className="ml-5 cursor-pointer text-2xl font-bold">
                  {displayStationZh}
                  <br />
                  {displayStationEn}
                </div>
              )}
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              className="m-2 flex items-center text-sm"
              style={{
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
              }}
              aria-label={isFullscreen ? "退出全屏" : "進入全屏"}
              title={isFullscreen ? "退出全屏" : "進入全屏"}
            >
              <div className="text-center text-xs">
                <p className="text-base uppercase leading-none">
                  <br />
                  養和醫院
                  <br />
                  Hong Kong
                  <br />
                  Sanatorium &amp; Hospital <br />
                  <br />
                  <span className="font-semibold">{formatDateTimeDDMMYYYYHHmmss(now)}</span>
                </p>
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

        {station === "dr" ? (
          <div className="w-full px-10 pt-4 pb-2 text-black">
            <div className="flex items-end justify-between pb-4 text-[32px] font-normal">
              <div className="flex-1">
                {columnLabelZh} {columnLabelEn}
              </div>
              <div className="w-[40%] text-right">號碼 Number</div>
            </div>

            <div className="flex flex-col gap-5">
              {rows.map((row, index) => (
                <div key={`counter-row-${row.counter}`} className="flex items-stretch gap-10">
                  <button
                    type="button"
                    onClick={() => {
                      if (row.ticket) return;
                      setDoctorMockTickets((prev) => {
                        const next = [...prev];
                        next[index] = nextMockTicket(next[index] ?? "");
                        return next;
                      });
                    }}
                    className="flex h-24 min-w-0 flex-1 items-center justify-stretch overflow-hidden rounded-[14px] bg-gradient-to-b from-[#f2f0e3] to-[#e6e2cf] px-0 text-center font-sans font-semibold leading-none shadow-[inset_0_0_0_1px_rgba(83,82,77,0.06),0_10px_20px_rgba(61,39,20,0.08)]"
                    style={{
                      touchAction: "manipulation",
                      WebkitTapHighlightColor: "transparent",
                    }}
                  >
                    <div className="relative m-2 flex h-[80px] w-[96px] shrink-0 flex-col items-center justify-center gap-[1px] overflow-hidden rounded-[14px] bg-gradient-to-b from-[#0f8b6d] to-[#15735e] px-2 text-[#fffdf4] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.15),0_6px_14px_rgba(15,139,109,0.24)] before:absolute before:left-0 before:right-0 before:top-0 before:h-6 before:bg-gradient-to-b before:from-[rgba(255,255,255,0.18)] before:to-[rgba(255,255,255,0)] before:content-['']">
                      <div
                        className="relative z-[1] text-[clamp(30px,3.8vw,44px)] font-black leading-none tracking-[0.04em]"
                        style={{ textShadow: "0 2px 6px rgba(0, 0, 0, 0.18)" }}
                      >
                        {DOCTOR_ROOMS[index] ?? ""}
                      </div>
                      <div className="relative z-[1] text-[clamp(8px,1vw,10px)] font-bold uppercase tracking-[0.12em] opacity-80">
                        ROOM
                      </div>
                    </div>
                    <div className="flex min-w-0 flex-1 items-center justify-center px-5 text-center text-[clamp(28px,3.8vw,48px)] font-extrabold tracking-[0.01em] text-[#2f2b23]">
                      {doctorNames[index] ?? ""}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (row.ticket) {
                        clearCounterTicket("dr", Number(row.counter));
                        return;
                      }
                      setDoctorMockTickets((prev) => {
                        const next = [...prev];
                        next[index] = "";
                        return next;
                      });
                    }}
                    className="flex h-24 w-[40%] min-w-0 items-center justify-center rounded-[14px] bg-[#edeedd] font-sans text-[clamp(34px,4.6vw,56px)] font-semibold tabular-nums"
                    style={{
                      touchAction: "manipulation",
                      WebkitTapHighlightColor: "transparent",
                    }}
                  >
                    {row.ticket || doctorMockTickets[index]}
                  </button>
                </div>
              ))}
            </div>
            ) : (
              <div className="h-[380px] w-full">
                <div className="box-border flex justify-between px-10 py-2 text-4xl">
                  <div>號碼 Number</div>
                  <div>
                    {columnLabelZh} {columnLabelEn}
                  </div>
                </div>

                {rows.map((row) => (
                  <div key={`counter-row-${row.counter}`} className="flex justify-between px-10 py-2">
                    <div>
                      <button
                        type="button"
                        disabled={!row.ticket}
                        onClick={() => moveCounterTicketToPassed(station, Number(row.counter))}
                        className="flex h-16 w-80 items-center justify-center bg-[#edeedd] font-sans text-4xl font-semibold tabular-nums"
                        style={{
                          touchAction: "manipulation",
                          WebkitTapHighlightColor: "transparent",
                        }}
                      >
                        {row.ticket}
                      </button>
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => cycleCounterTicket(station, Number(row.counter))}
                        className="flex h-16 w-56 items-center justify-center bg-[#edeedd] font-sans text-4xl font-semibold tabular-nums"
                        style={{
                          touchAction: "manipulation",
                          WebkitTapHighlightColor: "transparent",
                        }}
                      >
                        {row.ticket ? row.counter : ""}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {station !== "dr" && (
            <div className="my-2 flex h-[100px] items-center justify-between bg-white font-sans">
              <div className="flex w-2/3 items-center justify-start">
                <div>
                  <svg
                    fill="#000000"
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    xmlnsXlink="http://www.w3.org/1999/xlink"
                    width="800px"
                    height="800px"
                    viewBox="0 0 473.068 473.068"
                    xmlSpace="preserve"
                    className="mx-5 h-14 w-14"
                  >
                    <g>
                      <g id="Layer_2_31_">
                        <g>
                          <path
                            d="M355.507,181.955c8.793-6.139,29.39-20.519,29.39-55.351v-71.77h9.814c4.49,0,8.17-3.679,8.17-8.169v-38.5
                                    c0-4.49-3.681-8.165-8.17-8.165H78.351c-4.495,0-8.165,3.675-8.165,8.165v38.5c0,4.491,3.67,8.169,8.165,8.169h9.82v73.071
                                    c0,34.499,10.502,42.576,29.074,53.89l80.745,49.203v20.984c-20.346,12.23-73.465,44.242-80.434,49.107
                                    c-8.793,6.135-29.384,20.51-29.384,55.352v61.793h-9.82c-4.495,0-8.165,3.676-8.165,8.166v38.498c0,4.49,3.67,8.17,8.165,8.17
                                    h316.361c4.49,0,8.17-3.68,8.17-8.17V426.4c0-4.49-3.681-8.166-8.17-8.166h-9.814v-63.104c0-34.493-10.508-42.572-29.069-53.885
                                    l-80.745-49.202v-20.987C295.417,218.831,348.537,186.822,355.507,181.955z M252.726,272.859l87.802,53.5
                                    c6.734,4.109,10.333,6.373,12.001,9.002c1.991,3.164,2.963,9.627,2.963,19.768v63.104H117.574v-61.793
                                    c0-19.507,9.718-26.289,16.81-31.242c5.551-3.865,54.402-33.389,85.878-52.289c4.428-2.658,7.135-7.441,7.135-12.611v-37.563
                                    c0-5.123-2.671-9.883-7.053-12.55l-87.54-53.339l-0.265-0.165c-6.741-4.105-10.336-6.369-11.998-9.009
                                    c-1.992-3.156-2.968-9.626-2.968-19.767V54.835h237.918v71.77c0,19.5-9.718,26.288-16.814,31.235
                                    c-5.546,3.872-54.391,33.395-85.869,52.295c-4.427,2.658-7.134,7.442-7.134,12.601v37.563
                                    C245.675,265.431,248.346,270.188,252.726,272.859z"
                          ></path>
                          <path
                            d="M331.065,154.234c0,0,5.291-4.619-2.801-3.299c-19.178,3.115-53.079,15.133-92.079,15.133s-57-11-82.507-11.303
                                    c-5.569-0.066-5.456,3.629,0.937,7.391c6.386,3.758,63.772,35.681,71.671,40.08c7.896,4.389,12.417,4.05,20.786,0
                                    C259.246,196.334,331.065,154.234,331.065,154.234z"
                          ></path>
                          <path
                            d="M154.311,397.564c-6.748,6.209-9.978,10.713,5.536,10.713c12.656,0,139.332,0,155.442,0
                                    c16.099,0,9.856-5.453,2.311-12.643c-14.576-13.883-45.416-23.566-82.414-23.566
                                    C196.432,372.068,169.342,383.723,154.311,397.564z"
                          ></path>
                        </g>
                      </g>
                    </g>
                  </svg>
                </div>
                <div className="text-2xl font-semibold font-sans">
                  <div>預計輪候時間</div>
                  <div>Estimated waiting time</div>
                </div>
              </div>
              <div className="w-1/3">
                <div className="flex items-center justify-center">
                  <div className="mx-4 text-6xl font-semibold">{waitingMins}</div>
                  <div className="text-3xl">
                    <div>分鐘</div>
                    <div>Mins</div>
                  </div>
                </div>
              </div>
            </div>
            )}

            {station !== "dr" && (
              <>
                <button
                  type="button"
                  onClick={handleToggleMockNoticeTickets}
                  className="mb-5 mt-1 flex h-[100px] w-full items-center bg-white box-border text-left text-2xl font-semibold font-sans"
                >
                  <svg
                    fill="#3d2714"
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    xmlnsXlink="http://www.w3.org/1999/xlink"
                    width="800px"
                    height="800px"
                    viewBox="0 0 437.699 437.699"
                    xmlSpace="preserve"
                    className="mx-5 h-14 w-14 cursor-pointer"
                  >
                    <g>
                      <path
                        d="M372.578,63.101c-41.18-32.332-95.775-50.138-153.727-50.138c-57.952,0-112.547,17.806-153.728,50.138
                        C23.127,96.073,0,140.162,0,187.244c0,47.688,24.536,93.246,67.589,126.027l-20.81,97.656c-0.893,4.186,0.629,8.518,3.94,11.227
                        c2.079,1.701,4.645,2.582,7.237,2.582c1.538,0,3.087-0.311,4.548-0.943l144.063-62.539c4.104,0.18,8.223,0.271,12.282,0.271
                        c57.952,0,112.545-17.807,153.727-50.139c41.996-32.973,65.123-77.061,65.123-124.144
                        C437.701,140.162,414.574,96.073,372.578,63.101z M218.852,304.393c-15.709,0-28.49-12.78-28.49-28.489
                        c0-15.71,12.781-28.491,28.49-28.491c15.708,0,28.49,12.781,28.49,28.491C247.342,291.612,234.561,304.393,218.852,304.393z
                         M240.721,215.57c-0.771,11.446-10.367,20.417-21.844,20.417c-0.499,0-1.002-0.016-1.505-0.051
                        c-10.867-0.737-19.624-9.498-20.355-20.376l-6.931-102.056c-0.522-7.686,1.98-15.118,7.049-20.926
                        c5.068-5.806,12.092-9.29,19.779-9.813c0.653-0.044,1.313-0.066,1.962-0.066c15.11,0,27.757,11.813,28.778,26.894
                        C248.202,116.2,240.721,215.57,240.721,215.57z"
                      ></path>
                    </g>
                  </svg>
                  <div>
                    <div>以下號碼請聯絡門診職員</div>
                    <div>For the following numbers, please approach our staff</div>
                  </div>
                </button>

                <div className="flex w-full flex-1 flex-wrap content-start overflow-auto bg-[#f6f9f1] p-4 box-border font-sans text-[#53524d]">
                  {mergedNoticeTickets.map(({ ticket, isFixed }) => (
                      <button
                        key={`${isFixed ? "mock" : "passed"}-${ticket}`}
                        type="button"
                        onClick={() => {
                          if (isFixed) {
                            dismissPassedTicket(station, ticket);
                            setHiddenFixedNoticeTickets((prev) => {
                              const next = new Set(prev);
                              next.add(ticket);
                              return next;
                            });
                            return;
                          }
                          dismissPassedTicket(station, ticket);
                        }}
                        className="mr-3 mb-3 rounded bg-white px-4 py-2 text-3xl font-semibold tabular-nums shadow-sm md:text-4xl"
                        style={{
                          touchAction: "manipulation",
                          WebkitTapHighlightColor: "transparent",
                        }}
                      >
                        {ticket}
                      </button>
                  ))}
                </div>

                <div style={{ background: "rgb(246, 249, 241)", display: "none" }}>
                  <img src={asset("qdisplay/assets/Notice_V2-dwi0n6kw.png")} className="m-auto w-[800px]" />
                </div>
              </>
            )}
      </div>
    </div>
  );
}
