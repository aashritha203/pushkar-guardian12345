import { lazy, Suspense, useMemo } from "react";
import { useLiveAlerts, useLiveGhats, useLiveHistory } from "@/hooks/use-live";
import { useMode } from "@/lib/mode-context";
import { KpiCard } from "./KpiCard";
import { AlertsPanel } from "./AlertsPanel";
import { StreamCountsPanel } from "./StreamCountsPanel";
import { GhatTable } from "./GhatTable";
import { CrowdBarChart, StatusPieChart, VisitorAreaChart } from "./Charts";
import {
  AlertTriangle, Camera, CameraOff, CheckCircle2,
  Gauge, MapPin, Siren, Users, Video, WifiOff,
} from "lucide-react";

const GhatMap = lazy(() =>
  import("./GhatMap").then((m) => ({ default: m.GhatMap }))
);

export function DashboardView({ role }: { role?: "user" | "operator" } = {}) {
  const ghats = useLiveGhats();
  const alerts = useLiveAlerts();
  const history = useLiveHistory();
  const { mode } = useMode();
  const effectiveMode = role || mode;

  const hasLiveData = ghats.some((g) => g.currentPeople > 0);

  const kpi = useMemo(() => {
    const totalPeople = ghats.reduce((s, g) => s + g.currentPeople, 0);
    const capacity = ghats.reduce((s, g) => s + g.maximumCapacity, 0);
    const overall = capacity ? Math.round((totalPeople / capacity) * 100) : 0;
    return {
      totalGhats: ghats.length,
      totalCams: ghats.length,
      online: ghats.filter((g) => g.cameraHealth === "online").length,
      offline: ghats.filter((g) => g.cameraHealth === "offline").length,
      totalPeople, capacity, overall,
      safe: ghats.filter((g) => g.status === "safe").length,
      moderate: ghats.filter((g) => g.status === "moderate").length,
      critical: ghats.filter((g) => g.status === "critical").length,
      avg: ghats.length
        ? Math.round(ghats.reduce((s, g) => s + g.occupancyPercentage, 0) / ghats.length)
        : 0,
      alerts: alerts.length,
    };
  }, [ghats, alerts]);

  // ── USER MODE: Only map + search ─────────────────────────────────────────
  if (effectiveMode === "user") {
    return (
      <div className="mx-auto max-w-[1600px] p-4">
        {/* No-data banner */}
        {!hasLiveData && <NoDataBanner />}

        <div className="mb-3">
          <h2 className="text-lg font-semibold">Live Ghat Map</h2>
          <p className="text-xs text-muted-foreground">
            Search or click a ghat to view its current crowd status.
          </p>
        </div>

        <div className="h-[calc(100vh-200px)] min-h-[500px] overflow-hidden rounded-xl border border-border">
          <Suspense
            fallback={
              <div className="grid h-full place-items-center text-sm text-muted-foreground">
                Loading map…
              </div>
            }
          >
            <GhatMap ghats={ghats} showSearch />
          </Suspense>
        </div>

        {/* Mini legend */}
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          {[
            ["#22C55E", "Safe (< 40%)"],
            ["#F59E0B", "Moderate (40–70%)"],
            ["#EF4444", "High Density (≥ 70%)"],
          ].map(([c, l]) => (
            <div key={l} className="flex items-center gap-1.5">
              <span className="inline-block size-2.5 rounded-full" style={{ background: c }} />
              {l}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── OPERATOR MODE: Full dashboard ────────────────────────────────────────
  return (
    <div className="mx-auto max-w-[1600px] space-y-4 p-4">
      {/* No-data banner */}
      {!hasLiveData && <NoDataBanner />}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard icon={MapPin}        tone="blue"   label="Total Ghats"       value={kpi.totalGhats} />
        <KpiCard icon={Video}         tone="blue"   label="Total Cameras"     value={kpi.totalCams} />
        <KpiCard icon={Camera}        tone="green"  label="Online Cameras"    value={kpi.online} />
        <KpiCard icon={CameraOff}     tone="red"    label="Offline Cameras"   value={kpi.offline} />
        <KpiCard
          icon={Users}
          tone="blue"
          label="Total People"
          value={kpi.totalPeople}
          hint={hasLiveData ? undefined : "No live data"}
        />
        <KpiCard
          icon={Gauge}
          tone="orange"
          label="Overall Occupancy"
          value={kpi.overall}
          suffix="%"
          hint={hasLiveData ? `${kpi.totalPeople.toLocaleString()} / ${kpi.capacity.toLocaleString()}` : "No live data"}
        />
        <KpiCard icon={CheckCircle2}  tone="green"  label="Safe Ghats"        value={kpi.safe} />
        <KpiCard icon={AlertTriangle} tone="orange" label="Moderate Ghats"    value={kpi.moderate} />
        <KpiCard icon={Siren}         tone="red"    label="Critical Ghats"    value={kpi.critical} />
        <KpiCard icon={Gauge}         tone="slate"  label="Avg Occupancy"     value={kpi.avg} suffix="%" />
        <KpiCard icon={Siren}         tone="red"    label="Live Alerts"       value={kpi.alerts} />
        <KpiCard icon={Users}         tone="green"  label="Total Capacity"    value={kpi.capacity} />
      </div>

      {/* Map + Alerts + Stream Processing */}
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="h-[520px] grid-bg rounded-xl">
          <Suspense
            fallback={
              <div className="grid h-full place-items-center text-sm text-muted-foreground">
                Loading map…
              </div>
            }
          >
            <GhatMap ghats={ghats} showSearch />
          </Suspense>
        </div>
        <div className="space-y-4">
          <AlertsPanel alerts={alerts} />
          <StreamCountsPanel />
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <CrowdBarChart ghats={ghats} />
        <StatusPieChart ghats={ghats} />
        <VisitorAreaChart history={history} />
      </div>

      {/* Table */}
      <GhatTable ghats={ghats} />
    </div>
  );
}

function NoDataBanner() {
  return (
    <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
      <WifiOff className="size-4 shrink-0 text-amber-400" />
      <div>
        <span className="font-semibold text-amber-300">No Live Data</span>
        <span className="ml-2 text-amber-400/80">
          — Waiting for backend connection. Start AI detection or connect your data source.
        </span>
      </div>
    </div>
  );
}
