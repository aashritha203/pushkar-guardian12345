import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { liveService } from "@/lib/live-service";
import type { Ghat } from "@/lib/types";
import {
  ChevronRight,
  Link2,
  MapPin,
  Waves,
  Video,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/add-streams")({
  ssr: false,
  component: AddStreamsPage,
});

function AddStreamsPage() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [ghat, setGhat] = useState<Ghat | null>(null);
  const [urlsText, setUrlsText] = useState("");

  useEffect(() => {
    if (role !== "admin") {
      navigate({ to: "/dashboard" });
      return;
    }
    
    try {
      const raw = sessionStorage.getItem("gp-selected-ghat");
      if (raw) setGhat(JSON.parse(raw));
      else navigate({ to: "/select-ghat" });
    } catch {
      navigate({ to: "/select-ghat" });
    }
  }, [navigate]);

  function proceed() {
    if (!ghat) return;

    const streams = urlsText
      .split("\n")
      .map((u) => u.trim())
      .filter(Boolean);

    // Attach streams to the ghat in the live service
    const existing = liveService.ghatsSnap.find((g) => g.id === ghat.id);
    if (existing) {
      // Update existing ghat with streams
      liveService.addGhat({
        ...existing,
        streamUrls: streams.length > 0 ? streams : undefined,
        streamUrl: streams[0] ?? existing.streamUrl ?? "",
      });
      liveService.removeGhat(existing.id);
      // Re-add with updated data
      liveService.addGhat({
        ...existing,
        streamUrls: streams.length > 0 ? streams : undefined,
        streamUrl: streams[0] ?? existing.streamUrl ?? "",
      });
    }

    // Store streams in sessionStorage for the operator dashboard
    sessionStorage.setItem(
      "gp-streams",
      JSON.stringify({ ghatId: ghat.id, ghatName: ghat.name, streams })
    );

    navigate({ to: "/operator" });
  }

  const streamCount = urlsText.split("\n").filter((l) => l.trim()).length;

  if (!ghat) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  const statusColor =
    ghat.status === "critical"
      ? "#EF4444"
      : ghat.status === "moderate"
      ? "#F59E0B"
      : "#22C55E";

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-40" />
      <div className="absolute -top-40 left-1/2 size-[600px] -translate-x-1/2 rounded-full bg-blue-500/15 blur-3xl" />

      {/* Header */}
      <header className="relative z-10 border-b border-border bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-lg">
            <Waves className="size-5" />
          </div>
          <div>
            <div className="text-base font-bold leading-tight">Godavari Pushkaralu 2027</div>
            <div className="text-xs text-muted-foreground">Smart Pilgrim Crowd Management · Operator Access</div>
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs">
            <StepDot n={1} label="Select Ghat" done />
            <ChevronRight className="size-3 text-muted-foreground" />
            <StepDot n={2} label="Add Streams" active />
            <ChevronRight className="size-3 text-muted-foreground" />
            <StepDot n={3} label="Dashboard" />
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-2xl p-6">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold sm:text-3xl">
            Add Live{" "}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
              Stream URLs
            </span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Paste the live stream URLs for the selected ghat. One URL per line.
          </p>
        </div>

        {/* Selected ghat card */}
        <div
          className="mb-5 flex items-center gap-4 rounded-xl border p-4"
          style={{ borderColor: `${statusColor}44`, background: `${statusColor}0d` }}
        >
          <div
            className="grid size-11 shrink-0 place-items-center rounded-lg text-white"
            style={{ background: `linear-gradient(135deg, ${statusColor}cc, ${statusColor}88)` }}
          >
            <MapPin className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold">{ghat.name}</div>
            <div className="text-xs text-muted-foreground">
              {ghat.district} · {ghat.riverSide} bank · Camera {ghat.cameraId}
            </div>
          </div>
          <div className="text-right">
            <div
              className="rounded-full px-2.5 py-1 text-xs font-semibold capitalize"
              style={{ background: `${statusColor}22`, color: statusColor }}
            >
              {ghat.status}
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              {ghat.occupancyPercentage}% occupancy
            </div>
          </div>
        </div>

        {/* URL textarea */}
        <div className="rounded-xl border border-border bg-card/80 p-5 backdrop-blur">
          <div className="mb-3 flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-lg bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30">
              <Link2 className="size-4" />
            </div>
            <div>
              <div className="text-sm font-semibold">Live Stream URLs</div>
              <div className="text-[11px] text-muted-foreground">
                RTSP, HTTP, YouTube Live, or any stream link
              </div>
            </div>
            {streamCount > 0 && (
              <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary ring-1 ring-primary/20">
                <Video className="size-3" />
                {streamCount} URL{streamCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          <textarea
            value={urlsText}
            onChange={(e) => setUrlsText(e.target.value)}
            placeholder={`Paste live stream URLs (one per line)\n\nExamples:\nhttps://youtube.com/live/abc123\nrtsp://192.168.1.10:554/stream\nhttp://camera.ghat.gov.in/live`}
            className="w-full resize-none rounded-lg border border-border bg-background/60 px-4 py-3 font-mono text-sm leading-relaxed outline-none transition focus:border-primary"
            rows={9}
          />

          <div className="mt-2 text-[11px] text-muted-foreground">
            Each line is treated as a separate stream URL. Empty lines are ignored.
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => navigate({ to: "/select-ghat" })}
            className="rounded-lg border border-border bg-background/60 px-4 py-2.5 text-sm hover:border-primary hover:text-primary transition"
          >
            ← Back to Map
          </button>

          <button
            onClick={proceed}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-400 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:opacity-95"
          >
            {streamCount > 0 ? `Proceed with ${streamCount} stream${streamCount !== 1 ? "s" : ""}` : "Proceed to Dashboard"}
            <ChevronRight className="size-4" />
          </button>
        </div>

        {streamCount === 0 && (
          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            Stream URLs are optional. You can add or edit them later from the Operator Dashboard.
          </p>
        )}
      </div>
    </div>
  );
}

function StepDot({
  n,
  label,
  active,
  done,
}: {
  n: number;
  label: string;
  active?: boolean;
  done?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`grid size-5 place-items-center rounded-full text-[10px] font-bold ${
          done
            ? "bg-emerald-500 text-white"
            : active
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {done ? "✓" : n}
      </div>
      <span
        className={
          active
            ? "text-foreground font-medium"
            : done
            ? "text-emerald-400"
            : "text-muted-foreground"
        }
      >
        {label}
      </span>
    </div>
  );
}
