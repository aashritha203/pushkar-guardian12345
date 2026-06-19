import type { LucideIcon } from "lucide-react";
import { AnimatedNumber } from "./AnimatedNumber";
import { cn } from "@/lib/utils";

export function KpiCard({
  icon: Icon, label, value, suffix, tone = "blue", hint,
}: {
  icon: LucideIcon; label: string; value: number; suffix?: string;
  tone?: "blue" | "green" | "orange" | "red" | "slate"; hint?: string;
}) {
  const tones: Record<string, string> = {
    blue:   "from-blue-500/15 to-blue-500/0 text-blue-400 ring-blue-500/30",
    green:  "from-emerald-500/15 to-emerald-500/0 text-emerald-400 ring-emerald-500/30",
    orange: "from-amber-500/15 to-amber-500/0 text-amber-400 ring-amber-500/30",
    red:    "from-red-500/15 to-red-500/0 text-red-400 ring-red-500/30",
    slate:  "from-slate-500/15 to-slate-500/0 text-slate-300 ring-slate-500/30",
  };
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card/60 p-4 backdrop-blur transition hover:border-primary/40">
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-60", tones[tone])} />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-1.5 text-2xl font-bold tabular-nums text-foreground">
            <AnimatedNumber value={value} />{suffix}
          </div>
          {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
        </div>
        <div className={cn("rounded-lg p-2 ring-1", tones[tone])}>
          <Icon className="size-4" />
        </div>
      </div>
    </div>
  );
}
