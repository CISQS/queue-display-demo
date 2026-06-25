import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import StationSelect from "@/components/StationSelect";
import { isStationKey, type StationKey } from "@/queue/stations";
import { useQueueStore } from "@/queue/store";

export default function Call() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const stationFromQuery = params.get("station") ?? "dr";
  const station: StationKey = isStationKey(stationFromQuery) ? stationFromQuery : "dr";

  const [ticketInput, setTicketInput] = useState("");
  const [counter, setCounter] = useState(1);
  const callTicket = useQueueStore((s) => s.callTicket);
  const completeTicket = useQueueStore((s) => s.completeTicket);
  const passTicket = useQueueStore((s) => s.passTicket);

  return (
    <div className="min-h-screen bg-[#e6e6e6] text-[#222]">
      <div className="h-10 w-full bg-[#2aa9b8]" />
      <div className="flex items-center justify-between border-b border-black/10 bg-white px-4 py-2">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="text-sm font-semibold text-black/70 hover:text-black"
        >
          Home
        </button>
        <div className="text-sm font-semibold">叫號</div>
        <div className="flex items-center gap-2">
          <div className="text-xs font-semibold text-black/60">Counter</div>
          <div className="relative">
            <select
              value={counter}
              onChange={(e) => setCounter(Number(e.target.value))}
              className="h-9 w-[84px] appearance-none rounded-lg border border-black/15 bg-white pl-3 pr-8 text-sm font-semibold text-black outline-none focus:ring-2 focus:ring-[#2aa9b8]/30"
            >
              {[1, 2, 3, 4].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-black/60">▾</div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-6 py-8">
        <div className="rounded-xl border border-black/10 bg-white">
          <div className="bg-[#2aa9b8] px-4 py-2 text-sm font-semibold text-white">叫號控制</div>
          <div className="p-6">
            <div className="grid gap-4">
              <div>
                <div className="text-xs font-semibold text-black/60">Station</div>
                <StationSelect
                  value={station}
                  onChange={(next) => setParams({ station: next })}
                  className="mt-2"
                  variant="light"
                />
              </div>

              <div>
                <div className="text-xs font-semibold text-black/60">號碼</div>
                <input
                  value={ticketInput}
                  onChange={(e) => setTicketInput(e.target.value)}
                  placeholder="例如：P023 / 23"
                  className="mt-2 h-11 w-full rounded-lg border border-black/15 bg-white px-4 text-sm font-semibold tracking-wide text-black outline-none focus:ring-2 focus:ring-[#2aa9b8]/30"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => callTicket(station, ticketInput, counter)}
                  className="inline-flex h-11 items-center justify-center rounded-lg bg-[#2aa9b8] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2396a3] focus:outline-none focus:ring-2 focus:ring-[#2aa9b8]/35"
                >
                  叫號
                </button>
                <button
                  type="button"
                  onClick={() => completeTicket(station, ticketInput, counter)}
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-black/15 bg-white px-4 text-sm font-semibold text-black/80 shadow-sm transition hover:bg-black/[0.03] focus:outline-none focus:ring-2 focus:ring-[#2aa9b8]/25"
                >
                  完成
                </button>
                <button
                  type="button"
                  onClick={() => passTicket(station, ticketInput, counter)}
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-black/15 bg-white px-4 text-sm font-semibold text-black/80 shadow-sm transition hover:bg-black/[0.03] focus:outline-none focus:ring-2 focus:ring-[#2aa9b8]/25"
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
