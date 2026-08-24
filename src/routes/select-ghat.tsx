import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useMemo, useState } from "react";
import { useLiveGhats } from "@/hooks/use-live";
import type { Ghat } from "@/lib/types";
import { MapPin, Search, Waves, ChevronRight, Navigation } from "lucide-react";

const SelectableGhatMap = lazy(() =>
  import("@/components/dashboard/SelectableGhatMap").then((m) => ({
    default: m.SelectableGhatMap,
  }))
);

export const Route = createFileRoute("/select-ghat")({
  ssr: false,
  component: SelectGhatPage,
});

function SelectGhatPage() {
  const ghats = useLiveGhats();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Ghat | null>(null);

  const filtered = useMemo(
    () =>
      ghats.filter(
        (g) =>
          g.name.toLowerCase().includes(q.toLowerCase()) ||
          g.district.toLowerCase().includes(q.toLowerCase())
      ),
    [ghats, q]
  );

  function pick(ghat: Ghat) {
    setSelected(ghat);
  }

  function proceed() {
    if (!selected) return;
    sessionStorage.setItem("gp-selected-ghat", JSON.stringify(selected));
    navigate({ to: "/add-streams" });
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-40" />
      <div className="absolute -top-40 left-1/2 size-[600px] -translate-x-1/2 rounded-full bg-blue-500/15 blur-3xl" />

      {/* Header */}
      <header className="relative z-10 border-b border-border bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-lg">
            <Waves className="size-5" />
          </div>
          <div>
            <div className="text-base font-bold leading-tight">Godavari Pushkaralu 2027</div>
            <div className="text-xs text-muted-foreground">Smart Pilgrim Crowd Management · Operator Access</div>
          </div>
          {/* Step indicator */}
          <div className="ml-auto flex items-center gap-2 text-xs">
            <StepDot n={1} label="Select Ghat" active />
            <ChevronRight className="size-3 text-muted-foreground" />
            <StepDot n={2} label="Add Streams" />
            <ChevronRight className="size-3 text-muted-foreground" />
            <StepDot n={3} label="Dashboard" />
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-[1600px] p-4">
        <div className="mb-4 text-center">
          <h1 className="text-2xl font-bold sm:text-3xl">
            Select Location on <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">Map</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Click a ghat marker on the map or search and select from the list below.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          {/* Left panel – search + list */}
          <div className="flex flex-col gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search ghat or district…"
                className="w-full rounded-xl border border-border bg-card/80 py-2.5 pl-9 pr-3 text-sm outline-none backdrop-blur focus:border-primary"
              />
            </div>

            {/* Ghat list */}
            <div className="max-h-[480px] overflow-auto scrollbar-thin space-y-1.5 pr-1">
              {filtered.map((g) => {
                const color =
                  g.status === "critical" ? "#EF4444" : g.status === "moderate" ? "#F59E0B" : "#22C55E";
                const isActive = selected?.id === g.id;
                return (
                  <button
                    key={g.id}
                    onClick={() => pick(g)}
                    className={`w-full rounded-xl border px-3 py-2.5 text-left text-sm transition hover:-translate-y-0.5 ${
                      isActive
                        ? "border-primary bg-primary/10 ring-1 ring-primary/40"
                        : "border-border bg-card/60 hover:border-border/80 hover:bg-card/80"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="size-4 shrink-0" style={{ color }} />
                        <span className="font-medium">{g.name}</span>
                      </div>
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize"
                        style={{ background: `${color}22`, color }}
                      >
                        {g.status}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-3 pl-6 text-[11px] text-muted-foreground">
                      <span>{g.district}</span>
                      <span>·</span>
                      <span>{g.currentPeople.toLocaleString()} / {g.maximumCapacity.toLocaleString()} people</span>
                    </div>
                    {/* Density bar */}
                    <div className="mt-1.5 pl-6">
                      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full transition-all duration-500"
                          style={{ width: `${Math.min(100, g.occupancyPercentage)}%`, background: color }}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
              {!filtered.length && (
                <div className="rounded-xl border border-border bg-card/60 px-4 py-8 text-center text-sm text-muted-foreground">
                  No ghats found.
                </div>
              )}
            </div>
          </div>

          {/* Right panel – map */}
          <div className="flex flex-col gap-3">
            <div className="h-[520px] overflow-hidden rounded-xl border border-border">
              <Suspense
                fallback={
                  <div className="grid h-full place-items-center text-sm text-muted-foreground">
                    Loading map…
                  </div>
                }
              >
                <SelectableGhatMap ghats={ghats} selected={selected} onSelect={pick} />
              </Suspense>
            </div>

            {/* Selected ghat banner + proceed */}
            <div
              className={`rounded-xl border p-4 transition-all duration-300 ${
                selected
                  ? "border-primary/40 bg-primary/10"
                  : "border-border bg-card/60"
              }`}
            >
              {selected ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="grid size-10 place-items-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 text-white">
                      <Navigation className="size-5" />
                    </div>
                    <div>
                      <div className="font-semibold">{selected.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {selected.district} · {selected.riverSide} bank ·{" "}
                        {selected.occupancyPercentage}% occupancy
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={proceed}
                    className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-400 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:opacity-95"
                  >
                    Next: Add Stream URLs
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <MapPin className="size-5 shrink-0 text-primary/60" />
                  Click a ghat on the map or from the list to select it, then proceed.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepDot({ n, label, active }: { n: number; label: string; active?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`grid size-5 place-items-center rounded-full text-[10px] font-bold ${
          active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        }`}
      >
        {n}
      </div>
      <span className={active ? "text-foreground font-medium" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}
