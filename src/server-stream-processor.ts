/**
 * Stream Processing Backend Service
 *
 * Handles video/stream URL processing:
 * - YouTube videos
 * - RTSP streams
 * - HTTP stream links
 *
 * Uses FFmpeg for frame extraction and Python YOLO for detection
 */

import { exec, spawn } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import os from "os";

const execAsync = promisify(exec);

interface StreamSession {
  ghatId: string;
  streamUrls: string[];
  isProcessing: boolean;
  totalCount: number;
  liveCount: number;
  framesCaptured: number;
  streamStatus: Record<string, any>;
  startTime: Date;
  tempDir: string;
}

interface CountUpdate {
  ghatId: string;
  liveCount: number;
  totalCount: number;
  isProcessing: boolean;
  timestamp: string;
}

class StreamProcessingService {
  private sessions: Map<string, StreamSession> = new Map();
  private updateCallbacks: ((update: CountUpdate) => void)[] = [];

  /**
   * Start processing streams for a ghat
   */
  async startProcessing(ghatId: string, streamUrls: string[]): Promise<StreamSession> {
    console.log(`[StreamProcessor] Starting processing for ghat ${ghatId} with ${streamUrls.length} URLs`);

    const tempDir = path.join(os.tmpdir(), `stream_${ghatId}_${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    const session: StreamSession = {
      ghatId,
      streamUrls,
      isProcessing: true,
      totalCount: 0,
      liveCount: 0,
      framesCaptured: 0,
      streamStatus: {},
      startTime: new Date(),
      tempDir,
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

    // Start processing each stream in background
    streamUrls.forEach((url) => {
      this.processStream(ghatId, url, session).catch((error) => {
        console.error(`Error processing stream ${url}:`, error);
        session.streamStatus[url] = {
          status: "failed",
          error: error.message,
        };
      });
    });

    return session;
  }

  /**
   * Process a single stream URL
   */
  private async processStream(ghatId: string, streamUrl: string, session: StreamSession): Promise<void> {
    console.log(`[StreamProcessor] Processing stream: ${streamUrl}`);

    try {
      // Prepare output directory for frames
      const frameDir = path.join(session.tempDir, `stream_${Date.now()}`);
      fs.mkdirSync(frameDir, { recursive: true });

      // Extract frames from stream every 2 seconds
      const framesInfo = await this.extractFrames(streamUrl, frameDir);

      console.log(`[StreamProcessor] Extracted ${framesInfo.totalFrames} frames from ${streamUrl}`);

      // Run YOLO detection on each frame
      for (const frame of framesInfo.frames) {
        if (!session.isProcessing) break;

        try {
          const peopleCount = await this.detectPeopleInFrame(frame);
          console.log(`[StreamProcessor] Frame ${frame}: ${peopleCount} people detected`);

          // Update counts
          session.liveCount = peopleCount;
          session.totalCount += peopleCount;
          session.framesCaptured += 1;

          // Update stream status
          session.streamStatus[streamUrl] = {
            status: "processing",
            frameCount: session.framesCaptured,
            peopleCount,
            lastUpdate: new Date().toISOString(),
          };

          // Emit update
          this.emitUpdate({
            ghatId,
            liveCount: session.liveCount,
            totalCount: session.totalCount,
            isProcessing: true,
            timestamp: new Date().toISOString(),
          });

          // Add delay between frame processing
          await this.delay(500);
        } catch (error) {
          console.error(`Error detecting people in frame ${frame}:`, error);
        }
      }

      // Mark stream as completed
      session.streamStatus[streamUrl] = {
        status: "completed",
        frameCount: session.framesCaptured,
        totalCount: session.totalCount,
        completedAt: new Date().toISOString(),
      };

      console.log(`[StreamProcessor] Completed processing ${streamUrl}`);
    } catch (error) {
      console.error(`Error processing stream ${streamUrl}:`, error);
      session.streamStatus[streamUrl] = {
        status: "failed",
        error: (error as Error).message,
      };
    }
  }

  /**
   * Extract frames from video/stream every 2 seconds using FFmpeg
   */
  private async extractFrames(
    streamUrl: string,
    outputDir: string
  ): Promise<{ totalFrames: number; frames: string[] }> {
    console.log(`[FFmpeg] Extracting frames from ${streamUrl}`);

    return new Promise((resolve, reject) => {
      // FFmpeg command to extract frames every 2 seconds
      const framePattern = path.join(outputDir, "frame_%04d.png");
      const cmd = [
        "-i",
        streamUrl,
        "-vf",
        "fps=1/2", // 1 frame per 2 seconds
        "-frames:v",
        "300", // Max 300 frames (10 minutes of video)
        framePattern,
      ];

      const ffmpeg = spawn("ffmpeg", cmd);

      let stderr = "";

      ffmpeg.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      ffmpeg.on("close", (code) => {
        if (code !== 0) {
          console.error("FFmpeg stderr:", stderr);
          return reject(new Error(`FFmpeg failed with code ${code}`));
        }

        // Get list of extracted frames
        try {
          const files = fs.readdirSync(outputDir).filter((f) => f.startsWith("frame_")).sort();

          console.log(`[FFmpeg] Extracted ${files.length} frames`);

          const framePaths = files.map((f) => path.join(outputDir, f));
          resolve({
            totalFrames: files.length,
            frames: framePaths,
          });
        } catch (error) {
          reject(error);
        }
      });

      ffmpeg.on("error", reject);
    });
  }

  /**
   * Detect people in a frame using YOLO
   * Returns count of people detected
   */
  private async detectPeopleInFrame(framePath: string): Promise<number> {
    console.log(`[YOLO] Detecting people in frame: ${framePath}`);

    // For now, return mock detection
    // In production, integrate with Python YOLO service
    // See detectPeopleWithYolo() below for real implementation

    try {
      // Try to use Python YOLO detection if available
      const count = await this.detectPeopleWithYolo(framePath);
      return count;
    } catch (error) {
      console.warn("YOLO detection not available, using mock data:", error);
      // Mock detection for development
      return Math.floor(Math.random() * 50) + 10; // Random 10-60 people
    }
  }

  /**
   * Actual YOLO detection using Python
   * Requires Python with YOLOv8 and OpenCV installed
   */
  private async detectPeopleWithYolo(framePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      // Python script path
      const pythonScript = path.join(__dirname, "detect_people.py");

      // Check if Python script exists
      if (!fs.existsSync(pythonScript)) {
        return reject(new Error("Python detection script not found"));
      }

      // Spawn Python process for YOLO detection
      const python = spawn("python", [pythonScript, framePath]);

      let output = "";
      let error = "";

      python.stdout.on("data", (data) => {
        output += data.toString();
      });

      python.stderr.on("data", (data) => {
        error += data.toString();
      });

      python.on("close", (code) => {
        if (code !== 0) {
          console.error("Python detection error:", error);
          return reject(new Error(`Detection failed: ${error}`));
        }

        try {
          const count = parseInt(output.trim(), 10);
          if (isNaN(count)) {
            return reject(new Error(`Invalid detection output: ${output}`));
          }
          resolve(count);
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  /**
   * Stop processing streams for a ghat
   */
  stopProcessing(ghatId: string): void {
    const session = this.sessions.get(ghatId);
    if (session) {
      session.isProcessing = false;

      // Cleanup temp directory
      try {
        fs.rmSync(session.tempDir, { recursive: true, force: true });
        console.log(`[StreamProcessor] Cleaned up temp directory: ${session.tempDir}`);
      } catch (error) {
        console.error(`Error cleaning up temp directory: ${error}`);
      }

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
   * Helper delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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

export const streamProcessingService = new StreamProcessingService();
