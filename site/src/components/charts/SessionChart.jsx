import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from "recharts";

const COLORS = {
  speed: "#CDFF00",
  gct: "#34d399",
  cadence: "#fbbf24",
  vgrf: "#22d3ee",
};

export default function SessionChart({ timeSeries, metrics = ["speed", "gct"], height = 240 }) {
  if (!timeSeries) return null;
  const maxLen = Math.max(...metrics.map((m) => (timeSeries[m] || []).length));
  if (maxLen === 0) return null;

  const data = Array.from({ length: maxLen }, (_, i) => {
    const point = { idx: i };
    for (const m of metrics) point[m] = timeSeries[m]?.[i] ?? null;
    return point;
  });

  const LABELS = {
    speed: "Speed (m/s)", gct: "GCT (ms)",
    cadence: "Cadence (spm)", vgrf: "vGRF (BW)",
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#222" />
        <XAxis dataKey="idx" tick={false} axisLine={{ stroke: "#222" }} />
        {metrics.map((m, i) => (
          <YAxis
            key={m} yAxisId={m}
            orientation={i === 0 ? "left" : "right"}
            tick={{ fontSize: 10, fill: "#555" }}
            axisLine={false} tickLine={false} width={42}
            hide={i > 1}
          />
        ))}
        <Tooltip
          contentStyle={{
            background: "#161616", border: "1px solid #222",
            borderRadius: "4px", fontSize: "0.7rem", color: "#fff",
          }}
          labelFormatter={() => ""}
        />
        <Legend wrapperStyle={{ fontSize: "0.65rem", color: "#777" }} />
        {metrics.map((m) => (
          <Line
            key={m} yAxisId={m} type="monotone" dataKey={m}
            name={LABELS[m] || m} stroke={COLORS[m] || "#555"}
            strokeWidth={1.5} dot={false} connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
