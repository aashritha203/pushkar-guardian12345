/**
 * Mock Stream Processor - Demo/Development Version
 *
 * Simulates video processing without requiring FFmpeg or Python
 * Perfect for UI testing and development
 *
 * Usage: Use this instead of the real processor for quick testing
 *
 * To use this:
 * 1. Import from this file instead of server-stream-processor.ts
 * 2. Update stream-processing-routes.ts to use mockStreamProcessingService
 */

interface StreamSession {
  ghatId: string;
  streamUrls: string[];
  isProcessing: boolean;
  totalCount: number;
  liveCount: number;
  framesCaptured: number;
  streamStatus: Record<string, any>;
  startTime: Date;
}

interface CountUpdate {
  ghatId: string;
  liveCount: number;
  totalCount: number;
  isProcessing: boolean;
  timestamp: string;
}

class MockStreamProcessor {
  private sessions: Map<string, StreamSession> = new Map();
  private updateCallbacks: ((update: CountUpdate) => void)[] = [];
  private timers: Map<string, ReturnType<typeof setInterval>> = new Map();

  /**
   * Start processing streams for a ghat (mock version)
   */
  async startProcessing(ghatId: string, streamUrls: string[]): Promise<StreamSession> {
    console.log(`[MockStreamProcessor] Starting processing for ghat ${ghatId} with ${streamUrls.length} URLs`);

    const session: StreamSession = {
      ghatId,
      streamUrls,
      isProcessing: true,
      totalCount: 0,
      liveCount: 0,
      framesCaptured: 0,
      streamStatus: {},
      startTime: new Date(),
    };

    streamUrls.forEach((url) => {
      session.streamStatus[url] = {
        status: "processing",
        frameCount: 0,
        peopleCount: 0,
        lastUpdate: new Date().toISOString(),
      };
    });

    this.sessions.set(ghatId, session);

    // Simulate processing
    this.simulateProcessing(ghatId, session);

    return session;
  }

  /**
   * Simulate video processing with realistic updates
   */
  private simulateProcessing(ghatId: string, session: StreamSession): void {
    const updateInterval = 2000; // Update every 2 seconds (like frame capture)

    const timer = setInterval(() => {
      if (!session.isProcessing) {
        clearInterval(timer);
        this.timers.delete(ghatId);
        return;
      }

      // Simulate people detection
      let aggregatedCount = 0;

      session.streamUrls.forEach((url) => {
        // Generate realistic count with variance
        const baseCount = 25 + Math.floor(Math.random() * 40); // 25-65 people
        const variance = Math.floor((Math.random() - 0.5) * 15); // ±7
        const peopleCount = Math.max(5, baseCount + variance);

        // Update stream status
        session.streamStatus[url] = {
          status: "processing",
          frameCount: session.framesCaptured + 1,
          peopleCount,
          lastUpdate: new Date().toISOString(),
        };

        aggregatedCount += peopleCount;
      });

      // Update session counts
      session.liveCount = aggregatedCount;
      session.totalCount += aggregatedCount;
      session.framesCaptured += 1;

      console.log(
        `[MockStreamProcessor] Ghat ${ghatId}: Live=${session.liveCount}, Total=${session.totalCount}, Frames=${session.framesCaptured}`
      );

      // Emit update
      this.emitUpdate({
        ghatId,
        liveCount: session.liveCount,
        totalCount: session.totalCount,
        isProcessing: true,
        timestamp: new Date().toISOString(),
      });

      // Simulate processing completion after ~20 updates (40 seconds)
      if (session.framesCaptured >= 20) {
        session.isProcessing = false;
        clearInterval(timer);
        this.timers.delete(ghatId);

        console.log(
          `[MockStreamProcessor] Completed processing for ghat ${ghatId}. Total: ${session.totalCount}`
        );

        // Final update
        this.emitUpdate({
          ghatId,
          liveCount: session.liveCount,
          totalCount: session.totalCount,
          isProcessing: false,
          timestamp: new Date().toISOString(),
        });
      }
    }, updateInterval);

    this.timers.set(ghatId, timer);
  }

  /**
   * Stop processing streams for a ghat
   */
  stopProcessing(ghatId: string): void {
    const session = this.sessions.get(ghatId);
    if (session) {
      session.isProcessing = false;

      // Clear timer
      const timer = this.timers.get(ghatId);
      if (timer) {
        clearInterval(timer);
        this.timers.delete(ghatId);
      }

      console.log(
        `[MockStreamProcessor] Stopped processing for ghat ${ghatId}. Final total: ${session.totalCount}`
      );

      // Emit final update
      this.emitUpdate({
        ghatId,
        liveCount: session.liveCount,
        totalCount: session.totalCount,
        isProcessing: false,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get current counts for a ghat
   */
  getCounts(ghatId: string): CountUpdate | null {
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
   * Get detailed status for a ghat
   */
  getStatus(ghatId: string): any {
    const session = this.sessions.get(ghatId);
    if (!session) return null;

    return {
      ghatId,
      isProcessing: session.isProcessing,
      totalCount: session.totalCount,
      liveCount: session.liveCount,
      framesCaptured: session.framesCaptured,
      uptime: Date.now() - session.startTime.getTime(),
      streams: session.streamUrls.map((url) => ({
        url,
        status: session.streamStatus[url]?.status || "idle",
        frameCount: session.streamStatus[url]?.frameCount || 0,
        peopleCount: session.streamStatus[url]?.peopleCount || 0,
        lastUpdate: session.streamStatus[url]?.lastUpdate,
      })),
    };
  }

  /**
   * Emit update to listeners
   */
  private emitUpdate(update: CountUpdate): void {
    this.updateCallbacks.forEach((cb) => {
      try {
        cb(update);
      } catch (error) {
        console.error("Error in update callback:", error);
      }
    });
  }

  /**
   * Subscribe to updates
   */
  subscribe(callback: (update: CountUpdate) => void): () => void {
    this.updateCallbacks.push(callback);
    return () => {
      this.updateCallbacks = this.updateCallbacks.filter((cb) => cb !== callback);
    };
  }

  /**
   * Stop all processing
   */
  async stopAll(): Promise<void> {
    for (const ghatId of this.sessions.keys()) {
      this.stopProcessing(ghatId);
    }
  }
}

export const mockStreamProcessingService = new MockStreamProcessor();
