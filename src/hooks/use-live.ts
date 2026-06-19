import { useSyncExternalStore } from "react";
import { liveService } from "@/lib/live-service";

export function useLiveGhats() {
  return useSyncExternalStore(
    (cb) => liveService.subscribe(cb),
    () => liveService.list(),
    () => liveService.list(),
  );
}

export function useLiveAlerts() {
  return useSyncExternalStore(
    (cb) => liveService.subscribe(cb),
    () => liveService.alerts,
    () => liveService.alerts,
  );
}

export function useLiveMeta() {
  return useSyncExternalStore(
    (cb) => liveService.subscribe(cb),
    () => ({ status: liveService.wsStatus, latency: liveService.getLatency() }),
    () => ({ status: liveService.wsStatus, latency: liveService.getLatency() }),
  );
}

export function useLiveHistory() {
  return useSyncExternalStore(
    (cb) => liveService.subscribe(cb),
    () => liveService.history,
    () => liveService.history,
  );
}
