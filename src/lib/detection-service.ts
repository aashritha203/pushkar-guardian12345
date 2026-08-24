/**
 * Detection Service — connects to Python backend (yt-dlp + YOLOv8)
 * Hard-coded to http://localhost:5000 as required.
 * All endpoints: POST /start-detection, POST /stop-detection, GET /get-count
 */

// ── Backend URL ──────────────────────────────────────────────────────────────
export const BACKEND_URL = typeof window !== "undefined"
  ? `http://${window.location.hostname}:5000`
  : "http://localhost:5000";

// ── Timeout helper ───────────────────────────────────────────────────────────
function withTimeout(ms: number): AbortSignal {
  return AbortSignal.timeout(ms);
}

// ── Types ────────────────────────────────────────────────────────────────────
export interface DetectionCount {
  count: number;
  status: string;
  timestamp: string;
  snapshot: string | null;
}

export interface StartDetectionResponse {
  success: boolean;
  message: string;
}

export interface BackendStatus {
  online: boolean;
  message: string;
}

// ── Service ──────────────────────────────────────────────────────────────────
export const detectionService = {
  /**
   * Check if the backend server is reachable.
   * Used to display "Backend not connected" warning.
   */
  async checkHealth(): Promise<BackendStatus> {
    try {
      const res = await fetch(`${BACKEND_URL}/health`, {
        method: "GET",
        signal: withTimeout(3000),
      });
      return { online: res.ok, message: res.ok ? "Backend connected" : `HTTP ${res.status}` };
    } catch (e) {
      const msg = e instanceof Error && e.name === "TimeoutError"
        ? "Backend timed out"
        : "Backend not connected";
      return { online: false, message: msg };
    }
  },

  /**
   * Start YOLOv8 person detection on a stream URL.
   * Backend: reads with yt-dlp, runs YOLO every 2 seconds.
   */
  async startDetection(
    streamUrl: string,
    ghatId?: string
  ): Promise<StartDetectionResponse> {
    let res: Response;
    try {
      res = await fetch(`${BACKEND_URL}/start-detection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ streamUrl, ghatId: ghatId ?? "" }),
        signal: withTimeout(10000),
      });
    } catch (e) {
      const isTimeout = e instanceof Error && e.name === "TimeoutError";
      throw new Error(
        isTimeout
          ? "Backend timed out — is the server running at localhost:5000?"
          : "Backend not connected — start the Python server at localhost:5000"
      );
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      try {
        const json = JSON.parse(text);
        throw new Error(json.message || `Server error: HTTP ${res.status}`);
      } catch {
        throw new Error(text || `Server error: HTTP ${res.status}`);
      }
    }

    return res.json() as Promise<StartDetectionResponse>;
  },

  /**
   * Stop the detection loop on the backend.
   */
  async stopDetection(ghatId?: string): Promise<void> {
    try {
      await fetch(`${BACKEND_URL}/stop-detection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ghatId: ghatId ?? "" }),
        signal: withTimeout(5000),
      });
    } catch {
      // Silently ignore stop errors — backend may already be stopped
    }
  },

  /**
   * Get the latest person count from the backend.
   * Called every 2 seconds by the useDetection hook.
   */
  async getCount(ghatId?: string): Promise<DetectionCount> {
    const url = ghatId
      ? `${BACKEND_URL}/get-count?ghatId=${encodeURIComponent(ghatId)}`
      : `${BACKEND_URL}/get-count`;

    let res: Response;
    try {
      res = await fetch(url, {
        cache: "no-store",
        signal: withTimeout(5000),
      });
    } catch (e) {
      const isTimeout = e instanceof Error && e.name === "TimeoutError";
      throw new Error(isTimeout ? "Count request timed out" : "Backend not reachable");
    }

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      count: data.count,
      status: data.status,
      timestamp: data.timestamp,
      snapshot: data.snapshot ?? null,
    };
  },
};
