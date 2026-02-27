import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

const COLORS = {
  speed: "#6366f1",
  gct: "#22c55e",
  cadence: "#f59e0b",
  vgrf: "#06b6d4",
};

export default function SessionChart({ timeSeries, metrics = ["speed", "gct"], height = 240 }) {
  if (!timeSeries) return null;

  const maxLen = Math.max(
    ...metrics.map((m) => (timeSeries[m] || []).length)
  );

  if (maxLen === 0) return null;

  const data = Array.from({ length: maxLen }, (_, i) => {
    const point = { idx: i };
    for (const m of metrics) {
      point[m] = timeSeries[m]?.[i] ?? null;
    }
    return point;
  });

  const LABELS = {
    speed: "Speed (m/s)",
    gct: "GCT (ms)",
    cadence: "Cadence (spm)",
    vgrf: "vGRF (BW)",
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="idx" tick={false} axisLine={{ stroke: "var(--border)" }} />
        {metrics.map((m, i) => (
          <YAxis
            key={m}
            yAxisId={m}
            orientation={i === 0 ? "left" : "right"}
            tick={{ fontSize: 11, fill: "var(--text-muted)" }}
            axisLine={false}
            tickLine={false}
            width={45}
            hide={i > 1}
          />
        ))}
        <Tooltip
          contentStyle={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            fontSize: "0.75rem",
            color: "var(--text-primary)",
          }}
          labelFormatter={() => ""}
        />
        <Legend
          wrapperStyle={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}
        />
        {metrics.map((m) => (
          <Line
            key={m}
            yAxisId={m}
            type="monotone"
            dataKey={m}
            name={LABELS[m] || m}
            stroke={COLORS[m] || "#888"}
            strokeWidth={1.5}
            dot={false}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
