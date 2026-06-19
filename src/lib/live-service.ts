/**
 * Live data service.
 *
 * Today: drives ghat updates with a smooth random walk on an interval, mimicking
 * incoming AI YOLO `CameraUpdate` messages.
 *
 * To swap in real backend with ZERO frontend changes:
 *   - Replace the `start()` interval with a WebSocket connection to /ws/live.
 *   - On each message, call `applyUpdate({ camera_id, people_count, timestamp })`.
 *   - All consumers subscribe via `subscribe()` and remain unchanged.
 */
import { INITIAL_GHATS, computeStatus } from "./ghats-data";
import type { AlertItem, CameraUpdate, Ghat, HistoryPoint } from "./types";

type Listener = () => void;

export interface Meta { status: "connected" | "connecting" | "disconnected"; latency: number }

class LiveService {
  private ghatsMap: Map<string, Ghat> = new Map();
  // Cached immutable snapshots — required by useSyncExternalStore.
  ghatsSnap: Ghat[] = [];
  alertsSnap: AlertItem[] = [];
  historySnap: HistoryPoint[] = [];
  metaSnap: Meta = { status: "connecting", latency: 42 };

  private listeners = new Set<Listener>();
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    INITIAL_GHATS.forEach((g) => {
      const seeded = Math.floor(g.maximumCapacity * (0.2 + Math.random() * 0.4));
      this.ghatsMap.set(g.id, this.recompute({ ...g, currentPeople: seeded }));
    });
    this.ghatsSnap = Array.from(this.ghatsMap.values());
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }
  private emit() { this.listeners.forEach((l) => l()); }

  start() {
    if (this.timer || typeof window === "undefined") return;
    this.metaSnap = { ...this.metaSnap, status: "connected" };
    this.timer = setInterval(() => {
      const latency = 30 + Math.floor(Math.random() * 50);
      for (const g of this.ghatsMap.values()) {
        if (g.cameraHealth === "offline") continue;
        const drift = (Math.random() - 0.45) * 0.08 * g.maximumCapacity;
        const next = Math.max(0, Math.min(g.maximumCapacity * 1.05, g.currentPeople + drift));
        this.applyUpdate({
          camera_id: g.cameraId,
          people_count: Math.round(next),
          timestamp: new Date().toISOString(),
        }, /*emit*/ false);
      }
      this.metaSnap = { status: "connected", latency };
      this.ghatsSnap = Array.from(this.ghatsMap.values());
      this.historySnap = this.historySnap.slice();
      this.emit();
    }, 2500);
  }

  stop() { if (this.timer) { clearInterval(this.timer); this.timer = null; } }

  private recompute(g: Ghat): Ghat {
    const occ = Math.min(100, Math.round((g.currentPeople / g.maximumCapacity) * 1000) / 10);
    return { ...g, occupancyPercentage: occ, status: computeStatus(occ), lastUpdated: new Date().toISOString() };
  }

  applyUpdate(u: CameraUpdate, doEmit = true) {
    const ghat = Array.from(this.ghatsMap.values()).find((g) => g.cameraId === u.camera_id);
    if (!ghat) return;
    const prevStatus = ghat.status;
    const updated = this.recompute({ ...ghat, currentPeople: u.people_count, lastUpdated: u.timestamp });
    this.ghatsMap.set(ghat.id, updated);
    this.historySnap.push({ ghatId: ghat.id, timestamp: u.timestamp, people: updated.currentPeople, occupancy: updated.occupancyPercentage });
    if (this.historySnap.length > 5000) this.historySnap.splice(0, this.historySnap.length - 5000);

    if (prevStatus !== updated.status) {
      const messages: Record<string, string> = {
        critical: `🚨 ${ghat.name} exceeded safe capacity (${updated.occupancyPercentage}%)`,
        moderate: `⚠ ${ghat.name} reached ${updated.occupancyPercentage}% occupancy`,
        safe:     `✅ ${ghat.name} returned to Safe status`,
      };
      const next = [{
        id: `${ghat.id}-${Date.now()}`,
        ghatId: ghat.id,
        ghatName: ghat.name,
        level: (updated.status === "critical" ? "critical" : updated.status === "moderate" ? "warning" : "info") as AlertItem["level"],
        message: messages[updated.status],
        timestamp: u.timestamp,
      }, ...this.alertsSnap].slice(0, 200);
      this.alertsSnap = next;
    }
    if (doEmit) {
      this.ghatsSnap = Array.from(this.ghatsMap.values());
      this.emit();
    }
  }

  addGhat(input: Omit<Ghat, "occupancyPercentage" | "status" | "lastUpdated" | "currentPeople"> & { currentPeople?: number }) {
    const ghat: Ghat = this.recompute({
      ...input,
      currentPeople: input.currentPeople ?? 0,
      occupancyPercentage: 0,
      status: "safe",
      lastUpdated: new Date().toISOString(),
    });
    this.ghatsMap.set(ghat.id, ghat);
    this.ghatsSnap = Array.from(this.ghatsMap.values());
    this.emit();
  }

  removeGhat(id: string) {
    this.ghatsMap.delete(id);
    this.ghatsSnap = Array.from(this.ghatsMap.values());
    this.emit();
  }
}

export const liveService = new LiveService();
if (typeof window !== "undefined") liveService.start();
