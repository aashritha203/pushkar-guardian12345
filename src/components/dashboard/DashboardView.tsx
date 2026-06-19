import { lazy, Suspense, useMemo } from "react";
import { useLiveAlerts, useLiveGhats, useLiveHistory } from "@/hooks/use-live";
import { KpiCard } from "./KpiCard";
import { AlertsPanel } from "./AlertsPanel";
import { GhatTable } from "./GhatTable";
import { CrowdBarChart, StatusPieChart, VisitorAreaChart } from "./Charts";
import { AlertTriangle, Camera, CameraOff, CheckCircle2, Gauge, MapPin, Siren, Users, Video } from "lucide-react";

const GhatMap = lazy(() => import("./GhatMap").then((m) => ({ default: m.GhatMap })));

export function DashboardView() {
  const ghats = useLiveGhats();
  const alerts = useLiveAlerts();
  const history = useLiveHistory();

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
      avg: ghats.length ? Math.round(ghats.reduce((s, g) => s + g.occupancyPercentage, 0) / ghats.length) : 0,
      alerts: alerts.length,
    };
  }, [ghats, alerts]);

  return (
    <div className="mx-auto max-w-[1600px] space-y-4 p-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard icon={MapPin}        tone="blue"   label="Total Ghats"        value={kpi.totalGhats} />
        <KpiCard icon={Video}         tone="blue"   label="Total Cameras"      value={kpi.totalCams} />
        <KpiCard icon={Camera}        tone="green"  label="Online Cameras"     value={kpi.online} />
        <KpiCard icon={CameraOff}     tone="red"    label="Offline Cameras"    value={kpi.offline} />
        <KpiCard icon={Users}         tone="blue"   label="Total People"       value={kpi.totalPeople} />
        <KpiCard icon={Gauge}         tone="orange" label="Overall Occupancy"  value={kpi.overall} suffix="%" hint={`${kpi.totalPeople.toLocaleString()} / ${kpi.capacity.toLocaleString()}`} />
        <KpiCard icon={CheckCircle2}  tone="green"  label="Safe Ghats"         value={kpi.safe} />
        <KpiCard icon={AlertTriangle} tone="orange" label="Moderate Ghats"     value={kpi.moderate} />
        <KpiCard icon={Siren}         tone="red"    label="Critical Ghats"     value={kpi.critical} />
        <KpiCard icon={Gauge}         tone="slate"  label="Average Occupancy"  value={kpi.avg} suffix="%" />
        <KpiCard icon={Siren}         tone="red"    label="Live Alerts"        value={kpi.alerts} />
        <KpiCard icon={Users}         tone="green"  label="Total Capacity"     value={kpi.capacity} />
      </div>

      {/* Map + Alerts */}
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="h-[520px] grid-bg rounded-xl">
          <Suspense fallback={<div className="grid h-full place-items-center text-sm text-muted-foreground">Loading map…</div>}>
            <GhatMap ghats={ghats} />
          </Suspense>
        </div>
        <AlertsPanel alerts={alerts} />
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
