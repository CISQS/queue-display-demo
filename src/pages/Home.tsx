import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MonitorPlay, PhoneCall } from "lucide-react";
import StationSelect from "@/components/StationSelect";
import type { StationKey } from "@/queue/stations";

export default function Home() {
  const navigate = useNavigate();
  const [station, setStation] = useState<StationKey>("dr");
  const asset = (p: string) => `${import.meta.env.BASE_URL}${p}`;

  return (
    <div className="min-h-screen bg-[#e6e6e6] text-[#222]">
      <div className="h-10 w-full bg-[#2aa9b8]" />
      <div className="flex items-center justify-between border-b border-black/10 bg-white px-4 py-2">
        <div className="flex items-center gap-3">
          <img src={asset("qdisplay/assets/hksh_logo-CIMGYLsQ.png")} className="h-6 w-6 rounded object-contain" />
          <div className="text-sm font-semibold">
            Queue Display System
            <span className="ml-2 font-normal text-black/60">叫號系統</span>
          </div>
        </div>
        <div className="text-xs font-semibold text-black/50">Home</div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="rounded-xl border border-black/10 bg-white">
          <div className="flex items-center justify-between bg-[#2aa9b8] px-4 py-2 text-sm font-semibold text-white">
            <div>Queue Display</div>
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
                onClick={() => navigate(`/display?station=${station}`)}
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
    </div>
  );
}
