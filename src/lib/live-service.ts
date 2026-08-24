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
import type { AlertItem, CameraUpdate, Ghat, HistoryPoint, StreamCountUpdate } from "./types";
import { detectionService } from "./detection-service";

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
      // Start at 0 — real counts come from backend (Firebase / REST API)
      this.ghatsMap.set(g.id, this.recompute({ ...g, currentPeople: 0 }));
    });
    this.ghatsSnap = Array.from(this.ghatsMap.values());
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }
  private emit() { this.listeners.forEach((l) => l()); }

  start() {
    if (typeof window === "undefined") return;
    // Mark as connected. Do NOT run random simulation.
    // All data arrives via applyUpdate() from real backend calls.
    this.metaSnap = { ...this.metaSnap, status: "connected" };
    this.emit();
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
    const updated = this.recompute({ 
      ...ghat, 
      currentPeople: u.people_count, 
      lastUpdated: u.timestamp,
      snapshot: u.snapshot !== undefined ? u.snapshot : ghat.snapshot,
    });
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

  /**
   * Start processing streams for a ghat
   * Initiates backend video frame capture and YOLO detection
   */
  async startStreamProcessing(ghatId: string): Promise<void> {
    const ghat = this.ghatsMap.get(ghatId);
    if (!ghat || !ghat.streamUrls || ghat.streamUrls.length === 0) {
      console.warn(`Ghat ${ghatId} has no stream URLs to process`);
      return;
    }

    // Update UI state
    this.updateGhatStreamState(ghatId, { isProcessingStreams: true });

    // Start processing on backend
    await detectionService.startDetection(ghat.streamUrls[0]);
  }

  /**
   * Stop processing streams for a ghat
   */
  async stopStreamProcessing(ghatId: string): Promise<void> {
    await detectionService.stopDetection(ghatId);
    this.updateGhatStreamState(ghatId, { isProcessingStreams: false });
  }

  /**
   * Update stream-related state for a ghat
   */
  private updateGhatStreamState(ghatId: string, updates: Partial<Ghat>): void {
    const ghat = this.ghatsMap.get(ghatId);
    if (!ghat) return;

    const updated = { ...ghat, ...updates, lastUpdated: new Date().toISOString() };
    this.ghatsMap.set(ghatId, updated);
    this.ghatsSnap = Array.from(this.ghatsMap.values());
    this.emit();
  }

  /**
   * Get stream processing status for a ghat
   */
  getStreamProcessingStatus(ghatId: string): { isProcessing: boolean; liveCount?: number; totalCount?: number } {
    const ghat = this.ghatsMap.get(ghatId);
    if (!ghat) return { isProcessing: false };

    return {
      isProcessing: ghat.isProcessingStreams ?? false,
      liveCount: ghat.liveStreamCount,
      totalCount: ghat.recordedStreamCount,
    };
  }
}

export const liveService = new LiveService();

