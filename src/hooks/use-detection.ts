import { useCallback, useEffect, useState } from "react";
import { detectionService, type DetectionCount } from "@/lib/detection-service";
import { liveService } from "@/lib/live-service";

export type DetectionState = "idle" | "starting" | "running" | "stopping" | "error";

export interface UseDetectionReturn {
  state: DetectionState;
  count: DetectionCount | null;
  error: string | null;
  pollError: string | null;
  backendOnline: boolean | null;
  start: (streamUrl: string) => Promise<void>;
  stop: () => Promise<void>;
  clearError: () => void;
  isActive: boolean;
}

// Global registry of active polling intervals so they survive component unmounts
const activePolls = new Map<string, ReturnType<typeof setInterval>>();
// Global state of fails
const activeFails = new Map<string, number>();

export function useDetection(ghatId?: string): UseDetectionReturn {
  const [state, setState]               = useState<DetectionState>("idle");
  const [count, setCount]               = useState<DetectionCount | null>(null);
  const [error, setError]               = useState<string | null>(null);
  const [pollError, setPollError]       = useState<string | null>(null);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  // ── Health check and localStorage load on mount ───────────────────────────
  useEffect(() => {
    detectionService.checkHealth().then((s) => {
      if (s.online) setBackendOnline(true);
    });

    if (ghatId) {
      const stored = localStorage.getItem(`detection_state_${ghatId}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.isRunning) {
            setState("running");
            startPolling();
          }
        } catch (e) {
          // ignore parse error
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ghatId]);

  // ── Polling helpers ───────────────────────────────────────────────────────
  const stopPolling = useCallback(() => {
    if (!ghatId) return;
    const interval = activePolls.get(ghatId);
    if (interval) {
      clearInterval(interval);
      activePolls.delete(ghatId);
    }
    activeFails.set(ghatId, 0);
  }, [ghatId]);

  const startPolling = useCallback(() => {
    if (!ghatId) return;
    
    // Stop any existing interval so we can capture the NEW setCount reference on remount
    if (activePolls.has(ghatId)) {
      clearInterval(activePolls.get(ghatId)!);
      activePolls.delete(ghatId);
    }

    setPollError(null);
    activeFails.set(ghatId, 0);

    const interval = setInterval(async () => {
      try {
        const data = await detectionService.getCount(ghatId);
        setCount({ ...data });        // spread forces React to see new reference
        setPollError(null);
        activeFails.set(ghatId, 0);
        
        // Push update to the global live service so Map and Ghat lists update
        if (data.count !== undefined && data.status === "running") {
          const ghat = liveService.ghatsSnap.find(g => g.id === ghatId);
          if (ghat) {
            liveService.applyUpdate({
              camera_id: ghat.cameraId,
              people_count: data.count,
              timestamp: data.timestamp || new Date().toISOString(),
              snapshot: data.snapshot
            });
          }
        }

        if (data.status === "stopped" || data.status === "offline") {
          setState("idle");
          localStorage.removeItem(`detection_state_${ghatId}`);
          // We must clear the interval inside the interval if stopped/offline
          clearInterval(activePolls.get(ghatId)!);
          activePolls.delete(ghatId);
        }
      } catch (e) {
        let fails = (activeFails.get(ghatId) || 0) + 1;
        activeFails.set(ghatId, fails);
        if (fails >= 3) {
          setPollError(
            e instanceof Error ? e.message : "Lost connection to backend"
          );
          setBackendOnline(false);
        }
      }
    }, 3000);

    activePolls.set(ghatId, interval);
  }, [ghatId]);

  // ── start() ───────────────────────────────────────────────────────────────
  const start = useCallback(
    async (streamUrl: string) => {
      if (!streamUrl.trim()) {
        setError("Please enter a valid stream URL first.");
        return;
      }
      setError(null);
      setCount(null);
      setPollError(null);
      setState("starting");

      try {
        await detectionService.startDetection(streamUrl.trim(), ghatId);
        setState("running");
        setBackendOnline(true);
        if (ghatId) {
          localStorage.setItem(`detection_state_${ghatId}`, JSON.stringify({ ghatId, streamUrl, isRunning: true }));
          localStorage.setItem("last_active_ghat", ghatId);
        }
        startPolling();
      } catch (e) {
        setState("error");
        setBackendOnline(false);
        setError(
          e instanceof Error
            ? e.message
            : "Failed to start detection. Check that the backend is running."
        );
      }
    },
    [ghatId, startPolling]
  );

  // ── stop() ────────────────────────────────────────────────────────────────
  const stop = useCallback(async () => {
    setState("stopping");
    stopPolling();
    if (ghatId) {
      localStorage.removeItem(`detection_state_${ghatId}`);
      
      // Instantly clear the global map marker data so it reverts to green/safe
      const ghat = liveService.ghatsSnap.find(g => g.id === ghatId);
      if (ghat) {
        liveService.applyUpdate({
          camera_id: ghat.cameraId,
          people_count: 0,
          timestamp: new Date().toISOString(),
          snapshot: null,
          status: "stopped"
        } as any); // using 'any' to bypass strict type if status isn't expected, but forces the update
      }
    }
    
    try {
      await detectionService.stopDetection(ghatId);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("ghat-detection-stopped", { detail: { ghatId } }));
      }
    } finally {
      setState("idle");
      setCount(null);
      setError(null);
      setPollError(null);
    }
  }, [ghatId, stopPolling]);

  const clearError = useCallback(() => {
    setError(null);
    setBackendOnline(null);
  }, []);

  // DO NOT stop polling on unmount!
  // useEffect(() => () => stopPolling(), [stopPolling]);

  return {
    state,
    count,
    error,
    pollError,
    backendOnline,
    start,
    stop,
    clearError,
    isActive: state === "running" || state === "starting" || state === "stopping",
  };
}