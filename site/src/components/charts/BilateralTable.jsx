import "./BilateralTable.css";

const ASSESSMENT_COLORS = {
  Excellent: "var(--green)",
  Normal: "var(--amber)",
  Monitor: "var(--red)",
};

export default function BilateralTable({ bilateral }) {
  if (!bilateral || bilateral.length === 0) return null;

  return (
    <div className="bilateral-table-wrap">
      <table className="bilateral-table">
        <thead>
          <tr>
            <th>Metric</th>
            <th>Left</th>
            <th>Right</th>
            <th>Diff</th>
            <th>Assessment</th>
          </tr>
        </thead>
        <tbody>
          {bilateral.map((row) => (
            <tr key={row.label}>
              <td className="bt-label">{row.label}</td>
              <td>
                {row.left_mean?.toFixed(row.unit === "BW" || row.unit === "m" ? 2 : 1)}
                {row.left_std != null && (
                  <span className="bt-std"> ± {row.left_std.toFixed(1)}</span>
                )}
                <span className="bt-unit"> {row.unit}</span>
              </td>
              <td>
                {row.right_mean?.toFixed(row.unit === "BW" || row.unit === "m" ? 2 : 1)}
                {row.right_std != null && (
                  <span className="bt-std"> ± {row.right_std.toFixed(1)}</span>
                )}
                <span className="bt-unit"> {row.unit}</span>
              </td>
              <td className="bt-diff">
                {row.diff != null ? (
                  <span style={{ fontWeight: 600 }}>
                    {row.diff > 0 ? "+" : ""}
                    {row.diff.toFixed(row.unit === "BW" || row.unit === "m" ? 3 : 1)}
                  </span>
                ) : (
                  "—"
                )}
              </td>
              <td>
                <span
                  className="bt-badge"
                  style={{
                    color: ASSESSMENT_COLORS[row.assessment] || "var(--text-muted)",
                    background: `color-mix(in srgb, ${ASSESSMENT_COLORS[row.assessment] || "var(--text-muted)"} 15%, transparent)`,
                  }}
                >
                  {row.assessment}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
