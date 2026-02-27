export default function MetricCard({ label, value, unit, trend, color }) {
  const trendColor = trend > 0 ? "var(--green)" : trend < 0 ? "var(--red)" : "var(--text-muted)";

  return (
    <div className="metric-card">
      <div className="label">{label}</div>
      <div className="value" style={color ? { color } : undefined}>
        {value != null ? value : "—"}
        {unit && <span className="unit">{unit}</span>}
      </div>
      {trend != null && (
        <div style={{ fontSize: "0.7rem", color: trendColor, marginTop: "0.15rem" }}>
          {trend > 0 ? "+" : ""}
          {trend}%
        </div>
      )}
    </div>
  );
}
