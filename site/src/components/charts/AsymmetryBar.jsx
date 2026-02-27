import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, Cell,
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
      const lv = leftSummary[m.key], rv = rightSummary[m.key];
      const avg = (lv + rv) / 2;
      return {
        name: m.label,
        diff: avg !== 0 ? Math.round(((lv - rv) / avg) * 1000) / 10 : 0,
        left: lv, right: rv,
      };
    });

  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 20, bottom: 8, left: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#222" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 10, fill: "#555" }}
          axisLine={{ stroke: "#222" }}
          tickFormatter={(v) => `${v}%`}
        />
        <YAxis
          type="category" dataKey="name"
          tick={{ fontSize: 11, fill: "#777" }}
          axisLine={false} tickLine={false} width={55}
        />
        <Tooltip
          contentStyle={{
            background: "#161616", border: "1px solid #222",
            borderRadius: "4px", fontSize: "0.7rem", color: "#fff",
          }}
          formatter={(value, name, props) => {
            const d = props.payload;
            return [`L: ${d.left?.toFixed(1)} / R: ${d.right?.toFixed(1)} (${value}% diff)`, d.name];
          }}
        />
        <ReferenceLine x={0} stroke="#555" strokeWidth={1} />
        <Bar dataKey="diff" radius={[0, 4, 4, 0]} maxBarSize={18}>
          {data.map((d, i) => (
            <Cell
              key={i}
              fill={Math.abs(d.diff) > 10 ? "#f87171" : Math.abs(d.diff) > 5 ? "#fbbf24" : "#34d399"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
