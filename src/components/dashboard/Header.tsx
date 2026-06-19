import { useEffect, useState } from "react";
import { useLiveMeta } from "@/hooks/use-live";
import { Activity, Radio, ShieldCheck, Waves } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";

export function Header({ role }: { role: "user" | "operator" }) {
  const meta = useLiveMeta();
  const [now, setNow] = useState<Date | null>(null);
  const navigate = useNavigate();
  useEffect(() => { setNow(new Date()); const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-lg">
            <Waves className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-base font-bold leading-tight">Godavari Pushkaralu 2027</div>
            <div className="truncate text-xs text-muted-foreground">AI Crowd Monitoring · {role === "operator" ? "Operator Control Room" : "Public View"}</div>
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2 text-xs">
          <Pill icon={Radio} tone="green" label="WebSocket" value={meta.status} />
          <Pill icon={Activity} tone="blue" label="Latency" value={`${meta.latency}ms`} />
          <Pill icon={ShieldCheck} tone="green" label="AI Service" value="online" />
          <div className="hidden rounded-md border border-border bg-card/60 px-3 py-1.5 tabular-nums sm:block">
            {now ? `${now.toLocaleDateString()} · ${now.toLocaleTimeString()}` : "—"}
          </div>
          <nav className="flex items-center gap-1">
            <Link to="/dashboard" className="rounded-md px-2.5 py-1.5 text-xs hover:bg-accent" activeProps={{ className: "bg-accent text-foreground" }}>User</Link>
            <Link to="/operator" className="rounded-md px-2.5 py-1.5 text-xs hover:bg-accent" activeProps={{ className: "bg-accent text-foreground" }}>Operator</Link>
            <button onClick={() => { localStorage.removeItem("gp-auth"); navigate({ to: "/" }); }}
              className="rounded-md border border-border px-2.5 py-1.5 text-xs hover:border-destructive hover:text-destructive">
              Logout
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}

function Pill({ icon: Icon, tone, label, value }: { icon: React.ComponentType<{ className?: string }>; tone: "green" | "blue"; label: string; value: string }) {
  const c = tone === "green" ? "text-emerald-400 ring-emerald-500/30 bg-emerald-500/10"
                              : "text-blue-400 ring-blue-500/30 bg-blue-500/10";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 ring-1 ${c}`}>
      <Icon className="size-3" /><span className="text-muted-foreground">{label}</span>
      <span className="font-semibold capitalize text-foreground">{value}</span>
    </span>
  );
}
