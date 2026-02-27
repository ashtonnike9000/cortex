import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

export default function TrendChart({ sessions, metricPath, label, color = "#6366f1", unit = "", height = 200 }) {
  if (!sessions || sessions.length < 2) return null;

  const data = sessions
    .filter((s) => {
      const parts = metricPath.split(".");
      let val = s;
      for (const p of parts) val = val?.[p];
      return val != null;
    })
    .map((s) => {
      const parts = metricPath.split(".");
      let val = s;
      for (const p of parts) val = val?.[p];
      return {
        date: s.date,
        label: s.label,
        value: Math.round(val * 100) / 100,
      };
    });

  if (data.length < 2) return null;

  return (
    <div>
      <div className="section-title">{label}</div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "var(--text-muted)" }}
            axisLine={{ stroke: "var(--border)" }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--text-muted)" }}
            axisLine={false}
            tickLine={false}
            width={45}
          />
          <Tooltip
            contentStyle={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              fontSize: "0.75rem",
              color: "var(--text-primary)",
            }}
            formatter={(v) => [`${v}${unit}`, label]}
            labelFormatter={(l) => l}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={{ fill: color, r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
