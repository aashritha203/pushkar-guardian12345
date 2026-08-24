import { useState, useEffect } from "react";
import { useLiveGhats } from "@/hooks/use-live";
import { liveService } from "@/lib/live-service";
import { Play, Square, BarChart3, Loader } from "lucide-react";

/**
 * Displays stream processing status and people counts
 * Shows live counts from active streams and total counts from recorded videos
 */
export function StreamCountsPanel() {
  const ghats = useLiveGhats();
  const [expandedGhat, setExpandedGhat] = useState<string | null>(null);

  return (
    <div className="rounded-xl border border-border bg-card/60 backdrop-blur">
      <div className="border-b border-border p-3">
        <h3 className="inline-flex items-center gap-2 text-sm font-semibold">
          <BarChart3 className="size-4" /> Stream Processing
        </h3>
      </div>

      <div className="max-h-[300px] overflow-y-auto scrollbar-thin">
        <div className="space-y-2 p-3">
          {ghats.filter((g) => g.streamUrls && g.streamUrls.length > 0).length === 0 ? (
            <div className="text-xs text-muted-foreground">No ghats with stream URLs</div>
          ) : (
            ghats
              .filter((g) => g.streamUrls && g.streamUrls.length > 0)
              .map((ghat) => (
                <StreamGhatCard
                  key={ghat.id}
                  ghat={ghat}
                  isExpanded={expandedGhat === ghat.id}
                  onToggle={() => setExpandedGhat(expandedGhat === ghat.id ? null : ghat.id)}
                />
              ))
          )}
        </div>
      </div>
    </div>
  );
}

function StreamGhatCard({
  ghat,
  isExpanded,
  onToggle,
}: {
  ghat: any;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);

  const handleStartProcessing = async () => {
    setIsLoading(true);
    try {
      await liveService.startStreamProcessing(ghat.id);
    } catch (error) {
      console.error("Failed to start stream processing:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopProcessing = async () => {
    setIsLoading(true);
    try {
      await liveService.stopStreamProcessing(ghat.id);
    } catch (error) {
      console.error("Failed to stop stream processing:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const status = liveService.getStreamProcessingStatus(ghat.id);
  const isProcessing = ghat.isProcessingStreams ?? false;

  return (
    <div className="rounded-lg border border-border/60 bg-background/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{ghat.name}</div>
          <div className="text-xs text-muted-foreground">
            {ghat.streamUrls?.length || 0} stream{ghat.streamUrls?.length !== 1 ? "s" : ""}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isProcessing && (
            <div className="text-right">
              {ghat.liveStreamCount !== undefined && (
                <div className="text-xs font-medium text-primary">Live: {ghat.liveStreamCount}</div>
              )}
              {ghat.recordedStreamCount !== undefined && (
                <div className="text-xs font-medium text-blue-400">Total: {ghat.recordedStreamCount}</div>
              )}
            </div>
          )}

          {isProcessing ? (
            <button
              onClick={handleStopProcessing}
              disabled={isLoading}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
              aria-label="Stop processing"
            >
              {isLoading ? <Loader className="size-4 animate-spin" /> : <Square className="size-4" />}
            </button>
          ) : (
            <button
              onClick={handleStartProcessing}
              disabled={isLoading}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-400 disabled:opacity-50"
              aria-label="Start processing"
            >
              {isLoading ? <Loader className="size-4 animate-spin" /> : <Play className="size-4" />}
            </button>
          )}
        </div>
      </div>

      {isExpanded && ghat.streamUrls && (
        <div className="mt-2 space-y-1 border-t border-border/40 pt-2">
          <div className="text-xs font-medium text-muted-foreground">URLs:</div>
          {ghat.streamUrls.map((url: string, idx: number) => (
            <div key={idx} className="text-xs text-muted-foreground truncate">
              <span className="inline-block bg-muted px-1.5 py-0.5 rounded text-[10px]">{idx + 1}.</span> {url}
            </div>
          ))}
        </div>
      )}

      <button
        onClick={onToggle}
        className="mt-2 w-full text-left text-xs text-primary hover:underline"
      >
        {isExpanded ? "Hide" : "Show"} URLs
      </button>
    </div>
  );
}
