import { ResponsiveContainer, AreaChart, Area, Tooltip } from "recharts";

export default function SparkLine({ data, dataKey = "value", color = "var(--accent)", height = 60 }) {
  if (!data || data.length === 0) return null;

  const chartData = data.map((v, i) => ({ idx: i, value: v }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
        <defs>
          <linearGradient id={`grad-${color.replace(/[^a-z0-9]/gi, "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
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
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#grad-${color.replace(/[^a-z0-9]/gi, "")})`}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
