import { useEffect, useState } from "react";
import { useLiveMeta } from "@/hooks/use-live";
import { Activity, Radio, ShieldCheck, Waves, Settings2, Eye, User, ChevronDown, ShieldAlert, LogOut, MapPin, LayoutDashboard } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";

export function Header({ role: pageRole }: { role: "user" | "operator" }) {
  const { role: authRole } = useAuth();
  const meta = useLiveMeta();
  const navigate = useNavigate();
  const [now, setNow] = useState<Date | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3 px-4 py-3">
        {/* Logo */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-lg">
            <Waves className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-base font-bold leading-tight">Godavari Pushkaralu 2027</div>
            <div className="truncate text-xs text-muted-foreground">
              AI Crowd Monitoring ·{" "}
              {pageRole === "operator" ? "Operator Control Room" : "Public View"}
            </div>
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2 text-xs">
          {/* Status pills */}
          <Pill icon={Radio} tone="green" label="WebSocket" value={meta.status} />
          <Pill icon={Activity} tone="blue" label="Latency" value={`${meta.latency}ms`} />
          <Pill icon={ShieldCheck} tone="green" label="AI Service" value="online" />
          <div className="hidden rounded-md border border-border bg-card/60 px-3 py-1.5 tabular-nums sm:block">
            {now ? `${now.toLocaleDateString()} · ${now.toLocaleTimeString()}` : "—"}
          </div>

          {/* Profile Dropdown */}
          <div className="relative ml-2">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-1.5 rounded-full border border-border bg-card/60 p-1 hover:bg-accent transition"
            >
              <div className="bg-primary/20 p-1.5 rounded-full text-primary">
                <User className="size-3.5" />
              </div>
              <ChevronDown className="size-3 text-muted-foreground mr-1" />
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 rounded-md border border-border bg-background shadow-xl overflow-hidden py-1 z-50">
                <Link
                  to="/select-ghat"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-accent text-foreground font-medium"
                >
                  <MapPin className="size-4 text-blue-400" />
                  Select Ghat
                </Link>
                <Link
                  to="/dashboard"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-accent text-foreground font-medium"
                >
                  <LayoutDashboard className="size-4 text-purple-400" />
                  Dashboard
                </Link>
                {authRole === "admin" && (
                  <>
                    <div className="h-px bg-border my-1" />
                    <Link
                      to="/operator"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-accent text-foreground font-medium"
                    >
                      <ShieldAlert className="size-4 text-emerald-400" />
                      Operator Access
                    </Link>
                  </>
                )}
                <div className="h-px bg-border my-1" />
                <button
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-accent/50 text-red-400 font-medium transition-colors"
                  onClick={async () => {
                    setProfileOpen(false);
                    const { signOut } = await import("firebase/auth");
                    const { auth } = await import("@/lib/firebase");
                    await signOut(auth);
                    navigate({ to: "/" });
                  }}
                >
                  <LogOut className="size-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function ModeBtn({
  active, icon: Icon, label, onClick, tone,
}: {
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  tone: "emerald" | "blue";
}) {
  const activeClass =
    tone === "emerald"
      ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40"
      : "bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/40";
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
        active ? activeClass : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="size-3" />
      {label} Access
    </button>
  );
}

function Pill({
  icon: Icon, tone, label, value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: "green" | "blue";
  label: string;
  value: string;
}) {
  const c =
    tone === "green"
      ? "text-emerald-400 ring-emerald-500/30 bg-emerald-500/10"
      : "text-blue-400 ring-blue-500/30 bg-blue-500/10";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 ring-1 ${c}`}>
      <Icon className="size-3" />
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold capitalize text-foreground">{value}</span>
    </span>
  );
}
