import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from "recharts";

export default function TrendChart({ sessions, metricPath, label, color = "#CDFF00", unit = "", height = 190, transform }) {
  if (!sessions || sessions.length < 2) return null;

  const data = sessions
    .filter((s) => {
      let val = s;
      for (const p of metricPath.split(".")) val = val?.[p];
      return val != null;
    })
    .map((s) => {
      let val = s;
      for (const p of metricPath.split(".")) val = val?.[p];
      if (transform) val = transform(val);
      return { date: s.date, value: Math.round(val * 100) / 100 };
    });

  if (data.length < 2) return null;

  return (
    <div>
      <div className="section-label">{label}</div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#222" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "#555" }}
            axisLine={{ stroke: "#222" }}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#555" }}
            axisLine={false} tickLine={false} width={42}
          />
          <Tooltip
            contentStyle={{
              background: "#161616", border: "1px solid #222",
              borderRadius: "4px", fontSize: "0.7rem", color: "#fff",
            }}
            formatter={(v) => [`${v}${unit}`, label]}
            labelFormatter={(l) => l}
          />
          <Line
            type="monotone" dataKey="value" stroke={color}
            strokeWidth={2} dot={{ fill: color, r: 3 }} activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
