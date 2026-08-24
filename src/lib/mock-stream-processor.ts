/**
 * Mock Stream Processing API for Development
 *
 * This simulates the backend stream processing behavior.
 * Replace with real implementation in production.
 *
 * Usage:
 * 1. Import this in your server.ts or main API file
 * 2. Register routes in your Express/Hono/Fastify app
 * 3. The mock will simulate video processing with realistic delays
 */

import type { StreamCountUpdate } from "./types";

interface ProcessingSession {
  ghatId: string;
  streamUrls: string[];
  isProcessing: boolean;
  totalCount: number;
  liveCount: number;
  streamStatus: Record<string, any>;
  startTime: Date;
}

class MockStreamProcessor {
  private sessions: Map<string, ProcessingSession> = new Map();
  private updateCallbacks: ((update: StreamCountUpdate) => void)[] = [];

  /**
   * Mock implementation of POST /api/streams/process
   */
  startProcessing(ghatId: string, streamUrls: string[]): ProcessingSession {
    const session: ProcessingSession = {
      ghatId,
      streamUrls,
      isProcessing: true,
      totalCount: 0,
      liveCount: 0,
      streamStatus: {},
      startTime: new Date(),
    };

    // Initialize status for each URL
    streamUrls.forEach((url) => {
      session.streamStatus[url] = {
        status: "processing",
        peopleCount: 0,
        framesCaptured: 0,
      };
    });

    this.sessions.set(ghatId, session);

    // Simulate stream processing
    this.simulateStreamProcessing(ghatId, session);

    return session;
  }

  /**
   * Mock implementation of POST /api/streams/stop/{ghatId}
   */
  stopProcessing(ghatId: string): void {
    const session = this.sessions.get(ghatId);
    if (session) {
      session.isProcessing = false;
    }
  }

  /**
   * Mock implementation of GET /api/streams/counts/{ghatId}
   */
  getCounts(ghatId: string): StreamCountUpdate | null {
    const session = this.sessions.get(ghatId);
    if (!session) return null;

    return {
      ghatId,
      liveCount: session.liveCount,
      totalCount: session.totalCount,
      isProcessing: session.isProcessing,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Mock implementation of GET /api/streams/status/{ghatId}
   */
  getStatus(ghatId: string): any {
    const session = this.sessions.get(ghatId);
    if (!session) return null;

    return {
      ghatId,
      isProcessing: session.isProcessing,
      streams: session.streamUrls.map((url) => ({
        url,
        status: session.streamStatus[url]?.status || "idle",
        peopleCount: session.streamStatus[url]?.peopleCount || 0,
        framesCaptured: session.streamStatus[url]?.framesCaptured || 0,
      })),
      aggregatedCount: session.liveCount,
      totalCount: session.totalCount,
      uptime: Date.now() - session.startTime.getTime(),
    };
  }

  /**
   * Simulate stream processing with realistic behavior
   */
  private simulateStreamProcessing(ghatId: string, session: ProcessingSession): void {
    const updateInterval = 2000; // 2 seconds between updates

    const timer = setInterval(() => {
      if (!session.isProcessing) {
        clearInterval(timer);
        return;
      }

      // Simulate people counting from streams
      let aggregatedCount = 0;

      session.streamUrls.forEach((url, idx) => {
        // Simulate frame capture and detection
        const isRecordedVideo = url.includes(".mp4") || url.includes(".mov") || url.includes(".avi");
        const frameCount = (session.streamStatus[url]?.framesCaptured || 0) + 1;

        // Generate realistic count with some variance
        const baseCount = 20 + Math.floor(Math.random() * 30);
        const variance = Math.floor((Math.random() - 0.5) * 10); // ±5
        const peopleCount = Math.max(0, baseCount + variance);

        session.streamStatus[url] = {
          status: "processing",
          peopleCount,
          framesCaptured: frameCount,
          lastUpdate: new Date().toISOString(),
        };

        aggregatedCount += peopleCount;

        // For recorded videos, simulate completion after certain frames
        if (isRecordedVideo && frameCount > 150) {
          session.streamStatus[url].status = "completed";
        }
      });

      // Update session counts
      session.liveCount = aggregatedCount;
      session.totalCount += aggregatedCount;

      // Simulate processing completion (after ~10 updates)
      const updatesCount = Math.round((Date.now() - session.startTime.getTime()) / updateInterval);
      if (updatesCount > 10 && Math.random() < 0.1) {
        // 10% chance to stop processing after 20 seconds
        session.isProcessing = false;
      }

      // Notify update
      this.notifyUpdate({
        ghatId,
        liveCount: session.liveCount,
        totalCount: session.totalCount,
        isProcessing: session.isProcessing,
        timestamp: new Date().toISOString(),
      });
    }, updateInterval);
  }

  /**
   * Notify listeners of updates
   */
  private notifyUpdate(update: StreamCountUpdate): void {
    this.updateCallbacks.forEach((cb) => cb(update));
  }

  /**
   * Subscribe to updates (for WebSocket or server-sent events)
   */
  subscribe(callback: (update: StreamCountUpdate) => void): () => void {
    this.updateCallbacks.push(callback);
    return () => {
      this.updateCallbacks = this.updateCallbacks.filter((cb) => cb !== callback);
    };
  }
}

export const mockStreamProcessor = new MockStreamProcessor();

/**
 * Example Express/Hono route handlers
 *
 * Usage in your server file:
 * ```
 * app.post("/api/streams/process", handleStartProcessing);
 * app.post("/api/streams/stop/:ghatId", handleStopProcessing);
 * app.get("/api/streams/counts/:ghatId", handleGetCounts);
 * app.get("/api/streams/status/:ghatId", handleGetStatus);
 * ```
 */

export function handleStartProcessing(req: any, res: any) {
  const { ghatId, streamUrls } = req.body;

  if (!ghatId || !streamUrls || streamUrls.length === 0) {
    return res.status(400).json({
      success: false,
      error: "Missing ghatId or streamUrls",
    });
  }

  try {
    const session = mockStreamProcessor.startProcessing(ghatId, streamUrls);
    res.json({
      success: true,
      message: `Processing started for ghat ${ghatId}`,
      processingId: `proc_${ghatId}_${Date.now()}`,
      totalStreams: streamUrls.length,
      startTime: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

export function handleStopProcessing(req: any, res: any) {
  const { ghatId } = req.params;

  try {
    mockStreamProcessor.stopProcessing(ghatId);
    const status = mockStreamProcessor.getStatus(ghatId);

    res.json({
      success: true,
      message: `Processing stopped for ghat ${ghatId}`,
      finalCounts: {
        liveCount: status?.aggregatedCount || 0,
        totalCount: status?.totalCount || 0,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

export function handleGetCounts(req: any, res: any) {
  const { ghatId } = req.params;

  try {
    const counts = mockStreamProcessor.getCounts(ghatId);

    if (!counts) {
      return res.status(404).json({
        success: false,
        error: `No processing session for ghat ${ghatId}`,
      });
    }

    res.json(counts);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

export function handleGetStatus(req: any, res: any) {
  const { ghatId } = req.params;

  try {
    const status = mockStreamProcessor.getStatus(ghatId);

    if (!status) {
      return res.status(404).json({
        success: false,
        error: `No processing session for ghat ${ghatId}`,
      });
    }

    res.json(status);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
