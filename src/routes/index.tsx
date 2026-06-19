import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Lock, Shield, User, Waves } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("operator@pushkaralu.gov.in");
  const [password, setPassword] = useState("demo1234");
  const [loading, setLoading] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      localStorage.setItem("gp-auth", JSON.stringify({ email, at: Date.now() }));
      navigate({ to: "/access" });
    }, 500);
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-50" />
      <div className="absolute -top-40 left-1/2 size-[700px] -translate-x-1/2 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-8 p-6 lg:grid-cols-2">
        {/* Hero */}
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" /> System online · AI service connected
          </div>
          <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Godavari Pushkaralu <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">2027</span>
          </h1>
          <p className="max-w-md text-base text-muted-foreground">
            Smart Pilgrim Crowd Management. Real-time AI-powered density monitoring across every bathing ghat on the Godavari river.
          </p>
          <div className="grid max-w-md grid-cols-3 gap-3 text-center">
            {[{n:"12+",l:"Ghats"},{n:"500+",l:"Cameras"},{n:"24/7",l:"Live AI"}].map((s) => (
              <div key={s.l} className="rounded-lg border border-border bg-card/50 p-3 backdrop-blur">
                <div className="text-2xl font-bold text-foreground">{s.n}</div>
                <div className="text-xs text-muted-foreground">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Login card */}
        <div className="mx-auto w-full max-w-md rounded-2xl border border-border bg-card/80 p-6 shadow-2xl backdrop-blur-xl">
          <div className="mb-6 flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 text-white">
              <Waves className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Welcome back</h2>
              <p className="text-xs text-muted-foreground">Sign in to continue to the dashboard</p>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-3">
            <Field icon={User} label="Email / Username">
              <input value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
            </Field>
            <Field icon={Lock} label="Password">
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
            </Field>
            <button disabled={loading} className="mt-2 w-full rounded-lg bg-gradient-to-r from-blue-500 to-cyan-400 px-4 py-2.5 font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:opacity-95 disabled:opacity-60">
              {loading ? "Signing in…" : "Login"}
            </button>
            <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
              <label className="flex items-center gap-1.5"><input type="checkbox" className="accent-primary" />Remember me</label>
              <a className="hover:text-foreground" href="#">Forgot password?</a>
            </div>
          </form>

          <div className="mt-5 flex items-center justify-center gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
            <Shield className="size-3.5" /> Secure Government Portal
          </div>
          <div className="mt-3 text-center text-xs text-muted-foreground">
            Or jump straight to <Link to="/dashboard" className="text-primary hover:underline">Public Dashboard</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, children }: { icon: React.ComponentType<{ className?: string }>; label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs text-muted-foreground">{label}</div>
      <div className="flex items-center gap-2 rounded-lg border border-border bg-background/60 px-3 py-2 focus-within:border-primary">
        <Icon className="size-4 text-muted-foreground" />
        {children}
      </div>
    </label>
  );
}
