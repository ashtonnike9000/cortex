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
      const diffPct = avg !== 0 ? Math.round(((lv - rv) / avg) * 1000) / 10 : 0;
      return {
        name: m.label,
        diff: diffPct,
        left: lv, right: rv,
        absDiff: Math.abs(diffPct),
      };
    });

  if (data.length === 0) return null;

  // Soft, non-alarming color palette
  const getColor = (absDiff) => {
    if (absDiff < 3) return "#4ade80";   // green — balanced
    if (absDiff < 8) return "#94a3b8";   // slate — typical
    return "#fbbf24";                     // warm amber — worth noting
  };

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 30, bottom: 8, left: 65 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 10, fill: "#555" }}
            axisLine={{ stroke: "#222" }}
            tickFormatter={(v) => `${v > 0 ? "L+" : v < 0 ? "R+" : ""}${Math.abs(v)}`}
            domain={["auto", "auto"]}
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
              const dir = d.diff > 0 ? "Left larger" : d.diff < 0 ? "Right larger" : "Equal";
              return [`L: ${d.left?.toFixed(1)} / R: ${d.right?.toFixed(1)} — ${dir}`, d.name];
            }}
          />
          <ReferenceLine x={0} stroke="#444" strokeWidth={1} />
          <Bar dataKey="diff" radius={[0, 4, 4, 0]} maxBarSize={18}>
            {data.map((d, i) => (
              <Cell key={i} fill={getColor(d.absDiff)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div style={{
        display: "flex", gap: "1rem", justifyContent: "center",
        fontSize: "0.6rem", color: "#666", marginTop: "0.25rem"
      }}>
        <span><span style={{color:"#4ade80"}}>●</span> Balanced (&lt;3%)</span>
        <span><span style={{color:"#94a3b8"}}>●</span> Typical (3–8%)</span>
        <span><span style={{color:"#fbbf24"}}>●</span> Worth noting (&gt;8%)</span>
      </div>
    </div>
  );
}
