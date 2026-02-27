import "./SpeedZonesTable.css";

const ZONE_COLORS = {
  recovery: "#9898aa",
  easy: "#22c55e",
  moderate: "#f59e0b",
  tempo: "#f97316",
  fast: "#ef4444",
  sprint: "#dc2626",
};

function strikeType(fsa) {
  if (fsa == null) return "—";
  if (fsa < 0) return "Forefoot";
  if (fsa < 8) return "Midfoot";
  return "Rearfoot";
}

export default function SpeedZonesTable({ zones }) {
  if (!zones || zones.length === 0) return null;

  const totalStrides = zones.reduce((a, z) => a + z.count, 0);

  return (
    <div className="sz-wrap">
      <div className="sz-bars">
        {zones.map((z) => (
          <div
            key={z.zone}
            className="sz-bar-segment"
            style={{
              flex: z.count,
              background: ZONE_COLORS[z.zone] || "var(--text-muted)",
            }}
            title={`${z.zone}: ${z.count} strides (${Math.round((z.count / totalStrides) * 100)}%)`}
          />
        ))}
      </div>
      <div className="sz-bar-labels">
        {zones.map((z) => (
          <span key={z.zone} style={{ flex: z.count, fontSize: "0.6rem", textAlign: "center", color: ZONE_COLORS[z.zone] }}>
            {z.zone} {Math.round((z.count / totalStrides) * 100)}%
          </span>
        ))}
      </div>

      <table className="sz-table">
        <thead>
          <tr>
            <th>Zone</th>
            <th>Strides</th>
            <th>Avg Speed</th>
            <th>GCT</th>
            <th>FSA</th>
            <th>Strike</th>
            <th>vGRF</th>
            <th>Peak vGRF</th>
            <th>Stride Len</th>
            <th>Cadence</th>
          </tr>
        </thead>
        <tbody>
          {zones.map((z) => (
            <tr key={z.zone}>
              <td>
                <span className="sz-dot" style={{ background: ZONE_COLORS[z.zone] }} />
                <span className="sz-name">{z.zone}</span>
              </td>
              <td>{z.count}</td>
              <td>{z.avg_speed?.toFixed(1)} <span className="bt-unit">m/s</span></td>
              <td>{z.avg_gct_ms?.toFixed(0)} <span className="bt-unit">ms</span></td>
              <td>{z.avg_fsa_deg?.toFixed(1)}°</td>
              <td>{strikeType(z.avg_fsa_deg)}</td>
              <td>{z.avg_vgrf_bw?.toFixed(2)} <span className="bt-unit">BW</span></td>
              <td>{z.avg_vgrf_peak_bw?.toFixed(2)} <span className="bt-unit">BW</span></td>
              <td>{z.avg_stride_len_m?.toFixed(2)} <span className="bt-unit">m</span></td>
              <td>{z.avg_cadence?.toFixed(0)} <span className="bt-unit">spm</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
