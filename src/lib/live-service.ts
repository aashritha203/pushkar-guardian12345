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

class LiveService {
  ghats: Map<string, Ghat> = new Map();
  alerts: AlertItem[] = [];
  history: HistoryPoint[] = [];
  private listeners = new Set<Listener>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private latencyMs = 42;
  wsStatus: "connected" | "connecting" | "disconnected" = "connecting";

  constructor() {
    INITIAL_GHATS.forEach((g) => {
      const seeded = Math.floor(g.maximumCapacity * (0.2 + Math.random() * 0.4));
      this.ghats.set(g.id, this.recompute({ ...g, currentPeople: seeded }));
    });
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  private emit() { this.listeners.forEach((l) => l()); }

  start() {
    if (this.timer) return;
    this.wsStatus = "connected";
    this.timer = setInterval(() => {
      this.latencyMs = 30 + Math.floor(Math.random() * 50);
      for (const g of this.ghats.values()) {
        if (g.cameraHealth === "offline") continue;
        // Random walk weighted toward capacity targets
        const drift = (Math.random() - 0.45) * 0.08 * g.maximumCapacity;
        const next = Math.max(0, Math.min(g.maximumCapacity * 1.05, g.currentPeople + drift));
        this.applyUpdate({
          camera_id: g.cameraId,
          people_count: Math.round(next),
          timestamp: new Date().toISOString(),
        });
      }
      this.emit();
    }, 2500);
  }

  stop() { if (this.timer) { clearInterval(this.timer); this.timer = null; } }

  private recompute(g: Ghat): Ghat {
    const occ = Math.min(100, Math.round((g.currentPeople / g.maximumCapacity) * 1000) / 10);
    return { ...g, occupancyPercentage: occ, status: computeStatus(occ), lastUpdated: new Date().toISOString() };
  }

  applyUpdate(u: CameraUpdate) {
    const ghat = Array.from(this.ghats.values()).find((g) => g.cameraId === u.camera_id);
    if (!ghat) return;
    const prevStatus = ghat.status;
    const updated = this.recompute({ ...ghat, currentPeople: u.people_count, lastUpdated: u.timestamp });
    this.ghats.set(ghat.id, updated);
    this.history.push({ ghatId: ghat.id, timestamp: u.timestamp, people: updated.currentPeople, occupancy: updated.occupancyPercentage });
    if (this.history.length > 5000) this.history.splice(0, this.history.length - 5000);

    if (prevStatus !== updated.status) {
      const messages: Record<string, string> = {
        critical: `🚨 ${ghat.name} exceeded safe capacity (${updated.occupancyPercentage}%)`,
        moderate: `⚠ ${ghat.name} reached ${updated.occupancyPercentage}% occupancy`,
        safe:     `✅ ${ghat.name} returned to Safe status`,
      };
      this.alerts.unshift({
        id: `${ghat.id}-${Date.now()}`,
        ghatId: ghat.id,
        ghatName: ghat.name,
        level: updated.status === "critical" ? "critical" : updated.status === "moderate" ? "warning" : "info",
        message: messages[updated.status],
        timestamp: u.timestamp,
      });
      if (this.alerts.length > 200) this.alerts.length = 200;
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
    this.ghats.set(ghat.id, ghat);
    this.emit();
  }

  removeGhat(id: string) { this.ghats.delete(id); this.emit(); }

  getLatency() { return this.latencyMs; }
  list() { return Array.from(this.ghats.values()); }
}

export const liveService = new LiveService();

// Auto-start on client
if (typeof window !== "undefined") liveService.start();
