import { useQueueStore } from "@/queue/store";

let started = false;

export function startDailyResetWatcher() {
  if (started || typeof window === "undefined") return;
  started = true;

  const run = () => {
    useQueueStore.getState().ensureDailyReset();
  };

  run();
  window.setInterval(run, 60_000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      run();
    }
  });
}
