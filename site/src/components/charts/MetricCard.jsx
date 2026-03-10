export default function MetricCard({ label, value, unit, trend, color, subtitle }) {
  const trendColor = trend > 0 ? "var(--green)" : trend < 0 ? "var(--red)" : "var(--text-muted)";

  return (
    <div className="metric-card">
      <div className="label">{label}</div>
      <div className="value" style={color ? { color } : undefined}>
        {value != null ? value : "—"}
        {unit && <span className="unit">{unit}</span>}
      </div>
      {subtitle && (
        <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: "0.1rem" }}>
          {subtitle}
        </div>
      )}
      {trend != null && (
        <div style={{ fontSize: "0.65rem", fontWeight: 700, color: trendColor, marginTop: "0.15rem" }}>
          {trend > 0 ? "+" : ""}
          {trend}%
        </div>
      )}
    </div>
  );
}
