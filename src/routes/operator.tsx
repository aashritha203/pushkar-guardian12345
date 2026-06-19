import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Header } from "@/components/dashboard/Header";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { useLiveGhats } from "@/hooks/use-live";
import { liveService } from "@/lib/live-service";
import { Camera, Plus, Trash2, Video } from "lucide-react";

export const Route = createFileRoute("/operator")({
  component: OperatorPage,
});

function OperatorPage() {
  const ghats = useLiveGhats();
  const [form, setForm] = useState({
    name: "", district: "", riverSide: "South", cameraId: "",
    streamUrl: "", latitude: "16.99", longitude: "81.78", maximumCapacity: "2000",
  });

  function addPoint(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.cameraId) return;
    liveService.addGhat({
      id: `g${Date.now()}`,
      name: form.name,
      district: form.district || "—",
      riverSide: form.riverSide,
      cameraId: form.cameraId,
      streamUrl: form.streamUrl,
      latitude: parseFloat(form.latitude),
      longitude: parseFloat(form.longitude),
      maximumCapacity: parseInt(form.maximumCapacity, 10) || 1000,
      currentPeople: 0,
      cameraHealth: "online",
    });
    setForm({ ...form, name: "", cameraId: "", streamUrl: "" });
  }

  return (
    <div className="min-h-screen">
      <Header role="operator" />
      <div className="mx-auto max-w-[1600px] space-y-4 p-4">
        {/* Operator banner */}
        <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Operator Control Room</h2>
              <p className="text-xs text-muted-foreground">Add monitoring points, register cameras and configure capacity. Updates broadcast instantly via WebSocket.</p>
            </div>
            <div className="flex gap-2 text-xs">
              <Stat label="Monitoring Points" value={ghats.length} />
              <Stat label="Online Cameras" value={ghats.filter((g) => g.cameraHealth === "online").length} />
              <Stat label="High Density" value={ghats.filter((g) => g.status === "critical").length} tone="red" />
            </div>
          </div>
        </div>

        {/* Add point + camera list */}
        <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <form onSubmit={addPoint} className="space-y-3 rounded-xl border border-border bg-card/60 p-4 backdrop-blur">
            <div className="flex items-center gap-2">
              <div className="grid size-9 place-items-center rounded-lg bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"><Plus className="size-4" /></div>
              <h3 className="text-sm font-semibold">Add Monitoring Point</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input label="Ghat Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Pushkar Ghat" />
              <Input label="District" value={form.district} onChange={(v) => setForm({ ...form, district: v })} placeholder="East Godavari" />
              <Input label="Camera ID" value={form.cameraId} onChange={(v) => setForm({ ...form, cameraId: v })} placeholder="CAM-013" />
              <div>
                <Label>River Side</Label>
                <select value={form.riverSide} onChange={(e) => setForm({ ...form, riverSide: e.target.value })}
                  className="w-full rounded-md border border-border bg-background/60 px-3 py-2 text-sm">
                  <option>South</option><option>North</option><option>East</option><option>West</option>
                </select>
              </div>
              <Input label="Latitude" value={form.latitude} onChange={(v) => setForm({ ...form, latitude: v })} />
              <Input label="Longitude" value={form.longitude} onChange={(v) => setForm({ ...form, longitude: v })} />
              <Input label="Maximum Capacity" value={form.maximumCapacity} onChange={(v) => setForm({ ...form, maximumCapacity: v })} />
              <Input label="Stream URL (RTSP/HTTP)" value={form.streamUrl} onChange={(v) => setForm({ ...form, streamUrl: v })} placeholder="rtsp://camera.ghat/stream" />
            </div>
            <button className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-400 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:opacity-95">
              <Plus className="size-4" /> Add New Point
            </button>
            <p className="text-[11px] text-muted-foreground">
              The AI YOLO service consumes <code className="rounded bg-muted px-1">streamUrl</code> and posts counts to <code className="rounded bg-muted px-1">POST /camera/update</code>.
            </p>
          </form>

          <div className="rounded-xl border border-border bg-card/60 backdrop-blur">
            <div className="flex items-center justify-between border-b border-border p-3">
              <h3 className="inline-flex items-center gap-2 text-sm font-semibold"><Video className="size-4" /> Manage Points &amp; Cameras</h3>
              <span className="text-xs text-muted-foreground">{ghats.length} registered</span>
            </div>
            <div className="max-h-[460px] overflow-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card/95 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Point</th>
                    <th className="px-3 py-2">Camera</th>
                    <th className="px-3 py-2">Capacity</th>
                    <th className="px-3 py-2">Density</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {ghats.map((g) => {
                    const color = g.status === "critical" ? "#EF4444" : g.status === "moderate" ? "#F59E0B" : "#22C55E";
                    return (
                      <tr key={g.id} className="border-t border-border/60 hover:bg-accent/40">
                        <td className="px-3 py-2">
                          <div className="font-medium">{g.name}</div>
                          <div className="text-xs text-muted-foreground">{g.district}</div>
                        </td>
                        <td className="px-3 py-2"><span className="inline-flex items-center gap-1 text-xs"><Camera className="size-3" />{g.cameraId}</span></td>
                        <td className="px-3 py-2 tabular-nums">{g.maximumCapacity.toLocaleString()}</td>
                        <td className="px-3 py-2 font-semibold tabular-nums" style={{ color }}>{g.occupancyPercentage}%</td>
                        <td className="px-3 py-2">
                          <span className="rounded-full px-2 py-0.5 text-xs font-semibold capitalize" style={{ background: `${color}22`, color }}>
                            Live · {g.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button onClick={() => liveService.removeGhat(g.id)}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Remove">
                            <Trash2 className="size-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Full live dashboard */}
        <DashboardView />
      </div>
    </div>
  );
}

function Stat({ label, value, tone = "blue" }: { label: string; value: number; tone?: "blue" | "red" }) {
  const c = tone === "red" ? "text-red-400 ring-red-500/30 bg-red-500/10" : "text-blue-300 ring-blue-500/30 bg-blue-500/10";
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
function Input({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-md border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary" />
    </div>
  );
}
