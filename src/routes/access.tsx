import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Eye, Settings2 } from "lucide-react";

export const Route = createFileRoute("/access")({
  component: AccessPage,
});

function AccessPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-50" />
      <div className="relative mx-auto max-w-5xl px-6 py-16">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold sm:text-4xl">Choose Access</h1>
          <p className="mt-2 text-sm text-muted-foreground">Select how you'd like to access the Crowd Management System.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <AccessCard
            to="/dashboard" icon={Eye} tone="blue"
            title="User Access"
            tagline="View live crowd status, maps, alerts and reports."
            cta="Continue as User"
          />
          <AccessCard
            to="/operator" icon={Settings2} tone="green"
            title="Operator Access"
            tagline="Manage points, cameras, capacity, density and monitoring system."
            cta="Continue as Operator"
          />
        </div>
      </div>
    </div>
  );
}

function AccessCard({ to, icon: Icon, tone, title, tagline, cta }: {
  to: "/dashboard" | "/operator"; icon: React.ComponentType<{ className?: string }>;
  tone: "blue" | "green"; title: string; tagline: string; cta: string;
}) {
  const ring = tone === "blue" ? "ring-blue-500/30 hover:ring-blue-500/60" : "ring-emerald-500/30 hover:ring-emerald-500/60";
  const grad = tone === "blue" ? "from-blue-500 to-cyan-400" : "from-emerald-500 to-teal-400";
  return (
    <Link to={to} className={`group relative block overflow-hidden rounded-2xl border border-border bg-card/70 p-6 ring-1 transition hover:-translate-y-0.5 ${ring}`}>
      <div className={`mb-4 grid size-12 place-items-center rounded-xl bg-gradient-to-br ${grad} text-white shadow-lg`}>
        <Icon className="size-5" />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{tagline}</p>
      <div className={`mt-5 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r ${grad} px-4 py-2 text-sm font-medium text-white shadow-md`}>
        {cta} <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}
