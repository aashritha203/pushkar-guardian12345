import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart } from "recharts";
import type { Ghat, HistoryPoint } from "@/lib/types";
import { useMemo } from "react";

const tooltipStyle = { background: "#1E293B", border: "1px solid #334155", borderRadius: 8, fontSize: 12 };

export function CrowdBarChart({ ghats }: { ghats: Ghat[] }) {
  const data = [...ghats].sort((a, b) => b.currentPeople - a.currentPeople).slice(0, 10)
    .map((g) => ({ name: g.name.replace(" Ghat", ""), people: g.currentPeople, color: g.status === "critical" ? "#EF4444" : g.status === "moderate" ? "#F59E0B" : "#22C55E" }));
  return (
    <ChartCard title="Crowd by Ghat (Top 10)">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ left: -10, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
          <XAxis dataKey="name" stroke="#64748b" fontSize={10} angle={-20} textAnchor="end" height={50} />
          <YAxis stroke="#64748b" fontSize={10} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(59,130,246,0.08)" }} />
          <Bar dataKey="people" radius={[4, 4, 0, 0]}>
            {data.map((d, i) => <Cell key={i} fill={d.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function StatusPieChart({ ghats }: { ghats: Ghat[] }) {
  const data = useMemo(() => [
    { name: "Safe", value: ghats.filter(g => g.status === "safe").length, fill: "#22C55E" },
    { name: "Moderate", value: ghats.filter(g => g.status === "moderate").length, fill: "#F59E0B" },
    { name: "Critical", value: ghats.filter(g => g.status === "critical").length, fill: "#EF4444" },
  ], [ghats]);
  return (
    <ChartCard title="Status Distribution">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={3}>
            {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function VisitorAreaChart({ history }: { history: HistoryPoint[] }) {
  const data = useMemo(() => {
    const byMin = new Map<string, number>();
    history.forEach((h) => {
      const k = new Date(h.timestamp); k.setSeconds(0, 0);
      const key = k.toISOString();
      byMin.set(key, (byMin.get(key) ?? 0) + h.people);
    });
    return Array.from(byMin.entries()).slice(-30).map(([t, v]) => ({ t: new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), total: v }));
  }, [history]);
  return (
    <ChartCard title="Total Visitors Trend">
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ left: -10, right: 8, top: 8 }}>
          <defs>
            <linearGradient id="vg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.6} />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
          <XAxis dataKey="t" stroke="#64748b" fontSize={10} />
          <YAxis stroke="#64748b" fontSize={10} />
          <Tooltip contentStyle={tooltipStyle} />
          <Area type="monotone" dataKey="total" stroke="#3B82F6" strokeWidth={2} fill="url(#vg)" />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-3 backdrop-blur">
      <div className="mb-2 text-sm font-semibold">{title}</div>
      {children}
    </div>
  );
}
