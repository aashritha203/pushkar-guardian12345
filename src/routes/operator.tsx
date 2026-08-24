import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Header } from "@/components/dashboard/Header";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { useLiveGhats } from "@/hooks/use-live";
import { liveService } from "@/lib/live-service";
import { useDetection } from "@/hooks/use-detection";
import type { Ghat } from "@/lib/types";
import { INITIAL_GHATS } from "@/lib/ghats-data";
import { ref, update } from "firebase/database";
import { db } from "@/lib/firebase";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Play,
  Plus,
  Search,
  Square,
  Trash2,
  Video,
  WifiOff,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/operator")({
  ssr: false,
  component: OperatorPage,
});

// ── Main Page ────────────────────────────────────────────────────────────────
function OperatorPage() {
  const { role } = useAuth();
  const ghats = useLiveGhats();
  const navigate = useNavigate();

  // Route protection inside component as fallback
  useEffect(() => {
    if (role !== "admin") {
      navigate({ to: "/dashboard" });
    }
  }, [role, navigate]);

  const [searchQuery, setSearchQuery] = useState("");
  const [form, setForm] = useState({
    name: "", district: "", riverSide: "South", cameraId: "",
    streamUrl: "", streamUrls: "", latitude: "16.99", longitude: "81.78",
    maximumCapacity: "2000",
  });

  // Panel collapse state
  const leftPanelRef = useRef<any>(null);
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);

  const toggleLeftPanel = () => {
    const panel = leftPanelRef.current;
    if (panel) {
      if (isLeftPanelCollapsed) panel.expand();
      else panel.collapse();
    }
  };

  // Sync ghats to Firebase on startup
  useEffect(() => {
    const timestamp = Math.floor(Date.now() / 1000);
    INITIAL_GHATS.forEach(g => {
      update(ref(db, `monitoring_points/${g.id}`), {
        ghatName: g.name,
        district: g.district,
        cameraId: g.cameraId,
        latitude: g.latitude,
        longitude: g.longitude,
        maximumCapacity: g.maximumCapacity,
        createdAt: timestamp,
        updatedAt: timestamp
      }).catch(console.error);
    });
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────────
  function addPoint(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.cameraId) return;
    const streamUrlsArray = form.streamUrls
      .split("\n").map((u) => u.trim()).filter(Boolean);
    liveService.addGhat({
      id: `g${Date.now()}`,
      name:       form.name,
      district:   form.district || "—",
      riverSide:  form.riverSide,
      cameraId:   form.cameraId,
      streamUrl:  form.streamUrl,
      streamUrls: streamUrlsArray.length > 0 ? streamUrlsArray : undefined,
      latitude:   parseFloat(form.latitude),
      longitude:  parseFloat(form.longitude),
      maximumCapacity: parseInt(form.maximumCapacity, 10) || 1000,
      currentPeople:   0,
      cameraHealth:    "online",
    });
    setForm({ ...form, name: "", cameraId: "", streamUrl: "", streamUrls: "" });
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen">
      <Header role="operator" />
      <div className="mx-auto max-w-[1600px] space-y-4 p-4">

        {/* ── Operator Stats Banner ───────────────────────────────────────── */}
        <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Operator Control Room</h2>
              <p className="text-xs text-muted-foreground">
                Add monitoring points, register cameras and configure capacity.
              </p>
            </div>
            <div className="flex gap-2 text-xs">
              <button
                onClick={() => navigate({ to: "/select-ghat" })}
                className="inline-flex items-center gap-1.5 mr-4 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-300 hover:bg-blue-500/20 transition"
              >
                Change Ghat <ChevronRight className="size-3" />
              </button>
              <Stat label="Monitoring Points" value={ghats.length} />
              <Stat
                label="Online Cameras"
                value={ghats.filter((g) => g.cameraHealth === "online").length}
              />
              <Stat
                label="High Density"
                value={ghats.filter((g) => g.status === "critical").length}
                tone="red"
              />
            </div>
          </div>
        </div>

        {/* ── Add Point Form + Camera Table ───────────────────────────────── */}
        <ResizablePanelGroup orientation="horizontal">

          <ResizablePanel 
            panelRef={leftPanelRef}
            defaultSize={35} 
            minSize={25} 
            collapsible 
            collapsedSize={0}
            onCollapse={() => setIsLeftPanelCollapsed(true)}
            onExpand={() => setIsLeftPanelCollapsed(false)}
            className="pr-2"
          >
          {/* Add Point Form */}
          <form onSubmit={addPoint} className="space-y-3 rounded-xl border border-border bg-card/60 p-4 backdrop-blur">
            <div className="flex items-center gap-2">
              <div className="grid size-9 place-items-center rounded-lg bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30">
                <Plus className="size-4" />
              </div>
              <h3 className="text-sm font-semibold">Add Monitoring Point</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input label="Ghat Name"        value={form.name}            onChange={(v) => setForm({ ...form, name: v })}            placeholder="Pushkar Ghat" />
              <Input label="District"         value={form.district}        onChange={(v) => setForm({ ...form, district: v })}        placeholder="East Godavari" />
              <Input label="Camera ID"        value={form.cameraId}        onChange={(v) => setForm({ ...form, cameraId: v })}        placeholder="CAM-013" />
              <div>
                <Label>River Side</Label>
                <select
                  value={form.riverSide}
                  onChange={(e) => setForm({ ...form, riverSide: e.target.value })}
                  className="w-full rounded-md border border-border bg-background/60 px-3 py-2 text-sm"
                >
                  <option>South</option><option>North</option><option>East</option><option>West</option>
                </select>
              </div>
              <Input label="Latitude"         value={form.latitude}        onChange={(v) => setForm({ ...form, latitude: v })} />
              <Input label="Longitude"        value={form.longitude}       onChange={(v) => setForm({ ...form, longitude: v })} />
              <Input label="Max Capacity"     value={form.maximumCapacity} onChange={(v) => setForm({ ...form, maximumCapacity: v })} />
              <Input label="Primary Stream URL" value={form.streamUrl}     onChange={(v) => setForm({ ...form, streamUrl: v })}       placeholder="rtsp://…" />
            </div>
            <div className="space-y-1.5">
              <Label>Additional Stream URLs (one per line)</Label>
              <textarea
                value={form.streamUrls}
                onChange={(e) => setForm({ ...form, streamUrls: e.target.value })}
                placeholder={"https://youtube.com/live/abc\nrtsp://camera1/live"}
                className="w-full resize-none rounded-md border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary"
                rows={3}
              />
            </div>
            <button className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-400 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:opacity-95">
              <Plus className="size-4" /> Add New Point
            </button>
          </form>
          </ResizablePanel>

          <ResizableHandle withHandle={false} className="relative flex w-1.5 items-center justify-center rounded-full bg-border/50 transition-colors hover:bg-emerald-500 cursor-col-resize group">
            <button
              type="button"
              onClick={toggleLeftPanel}
              className="absolute z-10 flex size-5 items-center justify-center rounded-full border border-border bg-background shadow-sm hover:border-emerald-500 hover:text-emerald-500 text-muted-foreground transition-colors"
              title={isLeftPanelCollapsed ? "Expand panel" : "Collapse panel"}
            >
              {isLeftPanelCollapsed ? <ChevronRight className="size-3" /> : <ChevronLeft className="size-3" />}
            </button>
          </ResizableHandle>

          <ResizablePanel defaultSize={65} minSize={40} className="pl-2">
          {/* Camera / Points Table */}
          <div className="h-full rounded-xl border border-border bg-card/60 backdrop-blur">
            <div className="flex items-center justify-between border-b border-border p-3">
              <h3 className="inline-flex items-center gap-2 text-sm font-semibold">
                <Video className="size-4" /> Manage Points & Cameras
              </h3>
              <span className="text-xs text-muted-foreground">{ghats.length} registered</span>
            </div>

            <div className="border-b border-border p-3 bg-background/30">
              <div className="relative mx-auto max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search ghats..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-md border border-border bg-background/60 py-2 pl-9 pr-4 text-sm outline-none focus:border-primary transition"
                />
              </div>
            </div>

            <div className="max-h-[500px] overflow-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card/95 text-left text-xs uppercase tracking-wider text-muted-foreground z-10">
                  <tr>
                    <th className="px-3 py-2 w-48">Point / Camera</th>
                    <th className="px-3 py-2">Stream / Detection</th>
                    <th className="px-3 py-2 w-24">Density</th>
                    <th className="px-3 py-2 w-10 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {ghats
                    .filter((g) => g.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((g) => (
                      <GhatRow key={g.id} g={g} />
                  ))}
                  {!ghats.length && (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center text-sm text-muted-foreground">
                        No monitoring points registered yet. Add one using the form.
                      </td>
                    </tr>
                  )}
                  {ghats.length > 0 && ghats.filter((g) => g.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center text-sm text-muted-foreground">
                        No monitoring points found matching "{searchQuery}".
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          </ResizablePanel>
        </ResizablePanelGroup>

        {/* Full live dashboard */}
        <DashboardView />
      </div>
    </div>
  );
}

// ── Ghat Row Component ───────────────────────────────────────────────────────
function GhatRow({ g }: { g: Ghat }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editUrls, setEditUrls] = useState("");
  
  const [activeStreamUrl, setActiveStreamUrl] = useState(() => {
    let runningUrl = "";
    try {
      const state = JSON.parse(localStorage.getItem(`detection_state_${g.id}`) || "{}");
      if (state.isRunning) runningUrl = state.streamUrl;
    } catch(e) {}
    return localStorage.getItem(`stream_url_${g.id}`) || runningUrl || g.streamUrl || (g.streamUrls && g.streamUrls[0]) || "";
  });
  
  const [showSaved, setShowSaved] = useState(false);

  const {
    state: detState,
    count: detCount,
    error: detError,
    pollError,
    start,
    stop,
    clearError,
  } = useDetection(g.id);

  // Auto-reset on error
  useEffect(() => {
    if (detState === "error") {
      const t = setTimeout(() => {
        clearError();
        stop();
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [detState, clearError, stop]);

  function handleSaveUrl() {
    localStorage.setItem(`stream_url_${g.id}`, activeStreamUrl);
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);

    const timestamp = Math.floor(Date.now() / 1000);
    update(ref(db, `monitoring_points/${g.id}`), {
      ghatName: g.name,
      district: g.district,
      cameraId: g.cameraId,
      streamURL: activeStreamUrl,
      updatedAt: timestamp,
      operator: "admin" // Hardcoded for this prototype since we don't have auth state easily available here, or can fetch from localStorage if needed
    }).catch(console.error);
  }

  function startEdit() {
    setIsEditing(true);
    const urls = [
      ...(g.streamUrl ? [g.streamUrl] : []),
      ...(g.streamUrls ?? []),
    ].join("\n");
    setEditUrls(urls);
  }

  function saveEdit() {
    const streams = editUrls.split("\n").map((u) => u.trim()).filter(Boolean);
    liveService.removeGhat(g.id);
    liveService.addGhat({
      ...g,
      streamUrl:  streams[0] ?? "",
      streamUrls: streams.length > 1 ? streams.slice(1) : undefined,
    });
    setActiveStreamUrl(streams[0] ?? "");
    setIsEditing(false);
    setEditUrls("");
  }

  const color = g.status === "critical" ? "#EF4444"
              : g.status === "moderate" ? "#F59E0B"
              : "#22C55E";

  return (
    <tr className="border-t border-border/60 hover:bg-accent/40 align-top">
      <td className="px-3 py-3">
        <div className="font-medium text-[13px]">{g.name}</div>
        <div className="text-[11px] text-muted-foreground mb-1">{g.district}</div>
        <span className="inline-flex items-center gap-1 text-[10px] bg-muted/50 px-1.5 py-0.5 rounded">
          <Camera className="size-3" />{g.cameraId}
        </span>
      </td>

      <td className="px-3 py-3">
        {isEditing ? (
          <div className="space-y-1 mb-2">
            <textarea
              value={editUrls}
              onChange={(e) => setEditUrls(e.target.value)}
              className="w-full resize-none rounded border border-border bg-background/60 px-2 py-1 text-xs outline-none focus:border-primary"
              rows={2}
              placeholder="One URL per line"
            />
            <div className="flex gap-1">
              <button onClick={saveEdit} className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-400 hover:bg-emerald-500/30">Save</button>
              <button onClick={() => setIsEditing(false)} className="rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2 items-center">
              <input
                value={activeStreamUrl}
                onChange={(e) => { setActiveStreamUrl(e.target.value); clearError(); }}
                placeholder="Stream URL..."
                className="flex-1 rounded border border-border bg-background/60 px-2 py-1 text-xs outline-none focus:border-primary disabled:opacity-50 min-w-0"
                disabled={detState === "running" || detState === "stopping"}
              />
              {showSaved ? (
                <span className="text-[10px] text-emerald-400 font-semibold whitespace-nowrap">Saved ✓</span>
              ) : (
                <button
                  onClick={handleSaveUrl}
                  disabled={detState === "running" || detState === "stopping"}
                  className="rounded bg-blue-500/10 px-2 py-1 text-[10px] font-semibold text-blue-400 hover:bg-blue-500/20 transition disabled:opacity-50 whitespace-nowrap"
                >
                  Save
                </button>
              )}
              <button onClick={startEdit} className="text-[10px] text-muted-foreground hover:text-foreground hover:underline ml-1">Edit</button>
            </div>

            <div className="flex gap-2 items-center">
              {detState !== "running" && detState !== "stopping" ? (
                <button
                  onClick={() => start(activeStreamUrl)}
                  disabled={detState === "starting" || !activeStreamUrl.trim()}
                  className="inline-flex flex-1 justify-center items-center gap-1 rounded bg-blue-500/20 px-2 py-1 text-[11px] font-semibold text-blue-300 hover:bg-blue-500/30 disabled:opacity-50 transition"
                >
                  {detState === "starting" ? <Loader2 className="size-3 animate-spin" /> : <Play className="size-3" />}
                  {detState === "starting" ? "Starting..." : "Start Detection"}
                </button>
              ) : (
                <button
                  onClick={stop}
                  disabled={detState === "stopping"}
                  className="inline-flex flex-1 justify-center items-center gap-1 rounded border border-red-500/30 bg-red-500/10 px-2 py-1 text-[11px] font-semibold text-red-300 hover:bg-red-500/20 disabled:opacity-50 transition"
                >
                  {detState === "stopping" ? <Loader2 className="size-3 animate-spin" /> : <Square className="size-3" />}
                  Stop
                </button>
              )}
            </div>

            {detError && (
              <div className="flex items-center gap-1 rounded border border-red-500/25 bg-red-500/8 px-2 py-1 text-[10px] text-red-300">
                <WifiOff className="size-3 shrink-0" />
                <span className="truncate">{detError}</span>
              </div>
            )}
            {!detError && pollError && (
              <div className="flex items-center gap-1 rounded border border-amber-500/20 bg-amber-500/5 px-2 py-1 text-[10px] text-amber-400/70">
                <WifiOff className="size-3 shrink-0" /> Reconnecting...
              </div>
            )}
            
            {detState === "running" && detCount && (
               <div className="flex items-center gap-3 mt-2 bg-black/20 p-1.5 rounded">
                 {g.snapshot && (
                   <img src={g.snapshot} alt="Latest" className="w-16 h-9 object-cover rounded shadow" />
                 )}
                 <div>
                   <div className="text-[10px] text-emerald-400/70 uppercase">Headcount</div>
                   <div className="text-sm font-bold text-emerald-400">{detCount.count ?? g.currentPeople}</div>
                 </div>
               </div>
            )}
          </div>
        )}
      </td>

      <td className="px-3 py-3">
        <div className="font-semibold tabular-nums" style={{ color }}>
          {g.currentPeople > 0 ? `${g.occupancyPercentage}%` : "—"}
        </div>
        <span
          className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold capitalize mt-1 inline-block"
          style={{ background: `${color}22`, color }}
        >
          {g.status}
        </span>
      </td>

      <td className="px-3 py-3 text-right">
        <button
          onClick={() => liveService.removeGhat(g.id)}
          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          title="Remove Point"
        >
          <Trash2 className="size-3.5" />
        </button>
      </td>
    </tr>
  );
}

// ── Small Helpers ────────────────────────────────────────────────────────────
function Stat({
  label, value, tone = "blue",
}: {
  label: string; value: number; tone?: "blue" | "red";
}) {
  const c = tone === "red"
    ? "text-red-400 ring-red-500/30 bg-red-500/10"
    : "text-blue-300 ring-blue-500/30 bg-blue-500/10";
  return (
    <div className={`rounded-md px-3 py-1.5 ring-1 ${c}`}>
      <span className="mr-1.5 text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="mb-1 text-xs text-muted-foreground">{children}</div>;
}

function Input({
  label, value, onChange, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary"
      />
    </div>
  );
}
