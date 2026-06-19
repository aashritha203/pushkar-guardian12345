import { useSyncExternalStore } from "react";
import { liveService } from "@/lib/live-service";

const subscribe = (cb: () => void) => liveService.subscribe(cb);

export function useLiveGhats() {
  return useSyncExternalStore(subscribe, () => liveService.ghatsSnap, () => liveService.ghatsSnap);
}
export function useLiveAlerts() {
  return useSyncExternalStore(subscribe, () => liveService.alertsSnap, () => liveService.alertsSnap);
}
export function useLiveMeta() {
  return useSyncExternalStore(subscribe, () => liveService.metaSnap, () => liveService.metaSnap);
}
export function useLiveHistory() {
  return useSyncExternalStore(subscribe, () => liveService.historySnap, () => liveService.historySnap);
}
