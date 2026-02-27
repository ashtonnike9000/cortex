import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
} from "recharts";

export default function AsymmetryBar({ leftSummary, rightSummary, height = 200 }) {
  if (!leftSummary || !rightSummary) return null;

  const metrics = [
    { key: "avg_gct_ms", label: "GCT", unit: "ms" },
    { key: "avg_stride_len_m", label: "Stride", unit: "m", scale: 1000 },
    { key: "avg_fsa_deg", label: "FSA", unit: "°" },
    { key: "avg_vgrf_bw", label: "vGRF", unit: "BW", scale: 100 },
    { key: "avg_vgrf_peak_bw", label: "Peak vGRF", unit: "BW", scale: 100 },
  ];

  const data = metrics
    .filter((m) => leftSummary[m.key] != null && rightSummary[m.key] != null)
    .map((m) => {
      const lv = leftSummary[m.key];
      const rv = rightSummary[m.key];
      const avg = (lv + rv) / 2;
      const pctDiff = avg !== 0 ? ((lv - rv) / avg) * 100 : 0;
      return {
        name: m.label,
        diff: Math.round(pctDiff * 10) / 10,
        unit: m.unit,
        left: lv,
        right: rv,
      };
    });

  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 20, bottom: 8, left: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: "var(--text-muted)" }}
          axisLine={{ stroke: "var(--border)" }}
          tickFormatter={(v) => `${v}%`}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 12, fill: "var(--text-secondary)" }}
          axisLine={false}
          tickLine={false}
          width={55}
        />
        <Tooltip
          contentStyle={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            fontSize: "0.75rem",
            color: "var(--text-primary)",
          }}
          formatter={(value, name, props) => {
            const d = props.payload;
            return [`L: ${d.left?.toFixed(1)} / R: ${d.right?.toFixed(1)} (${value}% diff)`, d.name];
          }}
        />
        <ReferenceLine x={0} stroke="var(--text-muted)" strokeWidth={1} />
        <Bar dataKey="diff" radius={[0, 4, 4, 0]} maxBarSize={20}>
          {data.map((d, i) => (
            <Cell
              key={i}
              fill={Math.abs(d.diff) > 10 ? "var(--red)" : Math.abs(d.diff) > 5 ? "var(--amber)" : "var(--green)"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
