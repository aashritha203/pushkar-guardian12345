import { useMemo, useState } from "react";
import type { Ghat } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";
import { ArrowUpDown, Download, Search, Wifi, WifiOff } from "lucide-react";

export function GhatTable({ ghats }: { ghats: Ghat[] }) {
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<keyof Ghat>("occupancyPercentage");
  const [asc, setAsc] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | Ghat["status"]>("all");

  const rows = useMemo(() => {
    let r = ghats.filter((g) =>
      (statusFilter === "all" || g.status === statusFilter) &&
      (g.name.toLowerCase().includes(q.toLowerCase()) || g.district.toLowerCase().includes(q.toLowerCase()) || g.cameraId.toLowerCase().includes(q.toLowerCase()))
    );
    r = [...r].sort((a, b) => {
      const av = a[sortKey] as number | string;
      const bv = b[sortKey] as number | string;
      if (av < bv) return asc ? -1 : 1;
      if (av > bv) return asc ? 1 : -1;
      return 0;
    });
    return r;
  }, [ghats, q, sortKey, asc, statusFilter]);

  function exportCsv() {
    const header = ["Ghat","District","Camera","People","Capacity","Occupancy %","Status","Camera Health","Last Updated"];
    const lines = [header.join(",")].concat(rows.map(g => [
      g.name, g.district, g.cameraId, g.currentPeople, g.maximumCapacity, g.occupancyPercentage, g.status, g.cameraHealth, g.lastUpdated
    ].join(",")));
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "ghats.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  function toggleSort(k: keyof Ghat) {
    if (sortKey === k) setAsc(!asc); else { setSortKey(k); setAsc(false); }
  }

  return (
    <div className="rounded-xl border border-border bg-card/60 backdrop-blur">
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search ghats, districts, cameras…"
            className="w-full rounded-md border border-border bg-background/60 py-1.5 pl-8 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as never)}
          className="rounded-md border border-border bg-background/60 px-2 py-1.5 text-sm">
          <option value="all">All statuses</option>
          <option value="safe">Safe</option>
          <option value="moderate">Moderate</option>
          <option value="critical">Critical</option>
        </select>
        <button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background/60 px-3 py-1.5 text-sm hover:border-primary">
          <Download className="size-4" /> Export CSV
        </button>
      </div>
      <div className="max-h-[480px] overflow-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur">
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              {([
                ["name","Ghat"],["district","District"],["cameraId","Camera"],
                ["currentPeople","People"],["maximumCapacity","Capacity"],["occupancyPercentage","Occ %"],
              ] as [keyof Ghat, string][]).map(([k, label]) => (
                <th key={k} className="px-3 py-2 font-medium">
                  <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort(k)}>
                    {label} <ArrowUpDown className="size-3" />
                  </button>
                </th>
              ))}
              <th className="px-3 py-2 font-medium">Progress</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Camera</th>
              <th className="px-3 py-2 font-medium">Streams</th>
              <th className="px-3 py-2 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((g) => {
              const color = g.status === "critical" ? "#EF4444" : g.status === "moderate" ? "#F59E0B" : "#22C55E";
              return (
                <tr key={g.id} className="border-t border-border/60 hover:bg-accent/40">
                  <td className="px-3 py-2 font-medium">{g.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{g.district}</td>
                  <td className="px-3 py-2 text-muted-foreground">{g.cameraId}</td>
                  <td className="px-3 py-2 tabular-nums">{g.currentPeople.toLocaleString()}</td>
                  <td className="px-3 py-2 tabular-nums text-muted-foreground">{g.maximumCapacity.toLocaleString()}</td>
                  <td className="px-3 py-2 tabular-nums font-semibold" style={{ color }}>{g.occupancyPercentage}%</td>
                  <td className="px-3 py-2">
                    <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted">
                      <div className="h-full transition-all duration-500" style={{ width: `${Math.min(100, g.occupancyPercentage)}%`, background: color }} />
                    </div>
                  </td>
                  <td className="px-3 py-2"><StatusBadge status={g.status} /></td>
                  <td className="px-3 py-2">
                    {g.cameraHealth === "online"
                      ? <span className="inline-flex items-center gap-1 text-xs text-emerald-400"><Wifi className="size-3"/>Online</span>
                      : <span className="inline-flex items-center gap-1 text-xs text-red-400"><WifiOff className="size-3"/>Offline</span>}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {g.liveStreamCount !== undefined || g.recordedStreamCount !== undefined ? (
                      <div className="space-y-0.5">
                        {g.liveStreamCount !== undefined && (
                          <div className="text-primary">Live: {g.liveStreamCount}</div>
                        )}
                        {g.recordedStreamCount !== undefined && (
                          <div className="text-blue-400">Total: {g.recordedStreamCount}</div>
                        )}
                      </div>
                    ) : g.streamUrls ? (
                      <span className="text-muted-foreground">{g.streamUrls.length} URL{g.streamUrls.length !== 1 ? "s" : ""}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(g.lastUpdated).toLocaleTimeString()}</td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr><td colSpan={11} className="px-3 py-10 text-center text-muted-foreground">No ghats match.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
