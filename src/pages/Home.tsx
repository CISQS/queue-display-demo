import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, MonitorPlay, PhoneCall, Settings } from "lucide-react";
import StationSelect from "@/components/StationSelect";
import { getLastStation, setLastStation, type StationKey } from "@/queue/stations";

function getDisplayPath(station: StationKey) {
  return station === "lab" ? "/display?station=lab&draft=v2" : `/display?station=${station}`;
}
import { DEFAULT_DOCTOR_NAMES, loadDoctorNames, saveDoctorNames } from "@/queue/doctorConfig";

export default function Home() {
  const navigate = useNavigate();
  const [station, setStation] = useState<StationKey>(() => getLastStation());
  const [showDoctorSettings, setShowDoctorSettings] = useState(false);
  const [doctorNamesDraft, setDoctorNamesDraft] = useState<string[]>(() => loadDoctorNames());
  const asset = (p: string) => `${import.meta.env.BASE_URL}${p}`;

  useEffect(() => {
    setLastStation(station);
  }, [station]);

  useEffect(() => {
    if (!showDoctorSettings) return;
    setDoctorNamesDraft(loadDoctorNames());
  }, [showDoctorSettings]);

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
          <div className="text-sm font-semibold">
            Queue Display System
            <span className="ml-2 font-normal text-black/60">叫號系統</span>
          </div>
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
            onClick={() => setShowDoctorSettings(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-black/15 bg-white text-black/60 shadow-sm transition hover:bg-black/[0.03] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#2aa9b8]/25"
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            aria-label="設定醫生名字"
            title="設定醫生名字"
          >
            <Settings className="h-4 w-4" />
          </button>
          <div className="text-xs font-semibold text-black/50">Home</div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="rounded-xl border border-black/10 bg-white">
          <div className="flex items-center justify-between bg-[#2aa9b8] px-4 py-2 text-sm font-semibold text-white">
            <div>Queue Display</div>
            <a
              href={asset("queue-display-offline.html")}
              download="queue-display-offline.html"
              className="inline-flex h-8 items-center justify-center gap-2 rounded-md bg-white/15 px-3 text-xs font-semibold text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/35"
            >
              <Download className="h-3.5 w-3.5" />
              下載 HTML
            </a>
          </div>

          <div className="p-6">
            <div className="rounded-lg border border-black/10 bg-white p-5">
              <div className="text-sm font-semibold">叫號屏 Queue Display</div>

              <div className="mt-4">
                <div className="text-xs font-semibold text-black/60">Station 選擇站點</div>
                <StationSelect value={station} onChange={setStation} className="mt-2" variant="light" />
              </div>

              <button
                type="button"
                onClick={() => navigate(getDisplayPath(station))}
                className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#2aa9b8] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2396a3] focus:outline-none focus:ring-2 focus:ring-[#2aa9b8]/35"
              >
                <MonitorPlay className="h-4 w-4" />
                Queue Display
              </button>

              <button
                type="button"
                onClick={() => navigate(`/call?station=${station}`)}
                className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#00B18B] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#009a78] focus:outline-none focus:ring-2 focus:ring-[#00B18B]/35"
              >
                <PhoneCall className="h-4 w-4" />
                叫號
              </button>

            </div>
          </div>
        </div>
      </div>

      {showDoctorSettings && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8"
          role="dialog"
          aria-modal="true"
          aria-label="設定醫生名字"
          onClick={() => setShowDoctorSettings(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-white shadow-xl"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
              <div className="text-sm font-semibold">醫生名字設定</div>
              <button
                type="button"
                onClick={() => setShowDoctorSettings(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-black/10 bg-white text-black/60 shadow-sm transition hover:bg-black/[0.03] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#2aa9b8]/25"
                aria-label="關閉"
                title="關閉"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 px-5 py-5">
              {doctorNamesDraft.map((value, idx) => (
                <div key={`doctor-name-${idx}`}>
                  <div className="text-xs font-semibold text-black/60">{`醫生 ${idx + 1}`}</div>
                  <input
                    value={value}
                    onChange={(e) => {
                      const next = [...doctorNamesDraft];
                      next[idx] = e.target.value;
                      setDoctorNamesDraft(next);
                    }}
                    className="mt-2 h-11 w-full rounded-lg border border-black/15 bg-white px-4 text-sm font-semibold text-black outline-none focus:ring-2 focus:ring-[#2aa9b8]/30"
                    placeholder={DEFAULT_DOCTOR_NAMES[idx]}
                    inputMode="text"
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-black/10 px-5 py-4">
              <button
                type="button"
                onClick={() => setShowDoctorSettings(false)}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-black/10 bg-white px-4 text-sm font-semibold text-black/70 shadow-sm transition hover:bg-black/[0.03] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#2aa9b8]/25"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  saveDoctorNames(doctorNamesDraft);
                  setShowDoctorSettings(false);
                }}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-[#2aa9b8] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2396a3] focus:outline-none focus:ring-2 focus:ring-[#2aa9b8]/35"
              >
                儲存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
