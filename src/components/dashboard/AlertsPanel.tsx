import type { AlertItem } from "@/lib/types";
import { AlertTriangle, CheckCircle2, Siren } from "lucide-react";

export function AlertsPanel({ alerts }: { alerts: AlertItem[] }) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card/60 backdrop-blur">
      <div className="flex items-center justify-between border-b border-border p-3">
        <h3 className="text-sm font-semibold">Live Alerts</h3>
        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">{alerts.length}</span>
      </div>
      <div className="flex-1 space-y-2 overflow-auto scrollbar-thin p-3">
        {!alerts.length && <div className="py-8 text-center text-sm text-muted-foreground">All clear. No alerts yet.</div>}
        {alerts.map((a) => {
          const Icon = a.level === "critical" ? Siren : a.level === "warning" ? AlertTriangle : CheckCircle2;
          const tone = a.level === "critical" ? "text-red-400 bg-red-500/10 ring-red-500/30"
                      : a.level === "warning"  ? "text-amber-400 bg-amber-500/10 ring-amber-500/30"
                                               : "text-emerald-400 bg-emerald-500/10 ring-emerald-500/30";
          return (
            <div key={a.id} className={`flex gap-3 rounded-lg p-2.5 ring-1 ${tone} animate-in fade-in slide-in-from-top-1`}>
              <Icon className="mt-0.5 size-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-foreground">{a.message}</div>
                <div className="text-xs text-muted-foreground">{new Date(a.timestamp).toLocaleTimeString()}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
