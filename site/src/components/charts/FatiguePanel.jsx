import "./FatiguePanel.css";

function DriftCard({ label, data, unit, invertGood = false }) {
  if (!data) return null;
  const pct = data.pct_change;
  const isGood = invertGood ? pct > 0 : pct < 0;
  const severity = Math.abs(pct) < 3 ? "stable" : isGood ? "good" : "concern";

  const colorMap = { stable: "var(--green)", good: "var(--green)", concern: "var(--red)" };
  const labelMap = { stable: "Stable", good: "Improving", concern: "Drifting" };

  return (
    <div className="drift-card">
      <div className="drift-label">{label}</div>
      <div className="drift-value" style={{ color: colorMap[severity] }}>
        {pct > 0 ? "+" : ""}
        {pct.toFixed(1)}%
      </div>
      <div className="drift-detail">
        {data.first_q?.toFixed(1)} → {data.last_q?.toFixed(1)} {unit}
      </div>
      <div className="drift-badge" style={{ color: colorMap[severity], background: `color-mix(in srgb, ${colorMap[severity]} 15%, transparent)` }}>
        {labelMap[severity]}
      </div>
    </div>
  );
}

export default function FatiguePanel({ fatigue }) {
  if (!fatigue) return <p className="no-data">Not enough data for fatigue analysis (need 20+ strides)</p>;

  const hasAsymDrift = fatigue.asymmetry_drift != null;
  const asymFirst = fatigue.asymmetry_drift?.gct_first_q;
  const asymLast = fatigue.asymmetry_drift?.gct_last_q;
  const asymDelta = hasAsymDrift ? Math.abs(asymLast) - Math.abs(asymFirst) : null;
  const asymStable = asymDelta != null && Math.abs(asymDelta) < 3;

  return (
    <div className="fatigue-panel">
      <p className="fatigue-desc">
        Comparing the first quarter (fresh) vs the last quarter (fatigued) of the session to detect biomechanical drift.
      </p>

      <div className="drift-grid">
        <DriftCard label="GCT" data={fatigue.gct_ms} unit="ms" />
        <DriftCard label="vGRF" data={fatigue.vgrf_bw} unit="BW" invertGood />
        <DriftCard label="Speed" data={fatigue.speed_mps} unit="m/s" invertGood />
        <DriftCard label="Cadence" data={fatigue.cadence} unit="spm" invertGood />
        <DriftCard label="Stride Length" data={fatigue.stride_len_m} unit="m" invertGood />
      </div>

      {(fatigue.left_gct || fatigue.right_gct) && (
        <div style={{ marginTop: "1rem" }}>
          <div className="section-label">Per-Side GCT Drift</div>
          <div className="drift-grid">
            <DriftCard label="Left GCT" data={fatigue.left_gct} unit="ms" />
            <DriftCard label="Right GCT" data={fatigue.right_gct} unit="ms" />
            <DriftCard label="Left vGRF" data={fatigue.left_vgrf} unit="BW" invertGood />
            <DriftCard label="Right vGRF" data={fatigue.right_vgrf} unit="BW" invertGood />
          </div>
        </div>
      )}

      {hasAsymDrift && (
        <div className="insight-box" style={{ marginTop: "1rem" }}>
          <strong>Asymmetry under fatigue:</strong> GCT asymmetry (L-R) shifted from{" "}
          <strong>{asymFirst?.toFixed(1)} ms</strong> early to{" "}
          <strong>{asymLast?.toFixed(1)} ms</strong> late.
          {asymStable
            ? " Asymmetry remained stable through fatigue — good bilateral resilience."
            : asymDelta > 0
            ? " Asymmetry increased with fatigue — the weaker side may be degrading faster."
            : " Asymmetry decreased with fatigue — mechanics converged under load."}
        </div>
      )}
    </div>
  );
}
