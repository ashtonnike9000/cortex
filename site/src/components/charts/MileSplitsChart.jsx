import { useMemo, useState } from "react";
import createPlotlyComponent from "react-plotly.js/factory";
import Plotly from "plotly.js-dist-min";

const Plot = createPlotlyComponent(Plotly);

const SPLIT_METRICS = [
  { key: "avg_speed_mps", label: "Speed (m/s)", color: "#CDFF00" },
  { key: "avg_gct_ms", label: "GCT (ms)", color: "#34d399" },
  { key: "avg_cadence_spm", label: "Cadence (spm)", color: "#fbbf24" },
  { key: "avg_vgrf_peak_bw", label: "vGRF Peak (BW)", color: "#f87171" },
  { key: "avg_fsa_deg", label: "FSA (°)", color: "#22d3ee" },
  { key: "avg_stride_len_m", label: "Stride (m)", color: "#a78bfa" },
  { key: "avg_loading_rate", label: "Loading Rate (BW/s)", color: "#fb923c" },
];

function mpsToMinPerMile(mps) {
  if (!mps || mps <= 0) return null;
  const totalMin = 26.8224 / mps;
  const mins = Math.floor(totalMin);
  const secs = Math.round((totalMin - mins) * 60);
  if (secs === 60) return `${mins + 1}:00`;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function MileSplitsChart({ splits, height = 300 }) {
  const [metric, setMetric] = useState("avg_speed_mps");

  const metricDef = SPLIT_METRICS.find((m) => m.key === metric) || SPLIT_METRICS[0];

  const data = useMemo(() => {
    if (!splits?.length) return [];
    const labels = splits.map((s) =>
      s.distance_m >= 1500 ? `Mile ${s.mile}` : `${(s.distance_m / 1609.344).toFixed(2)} mi`
    );
    const values = splits.map((s) => s.metrics?.[metric] ?? 0);
    const speeds = splits.map((s) => s.metrics?.avg_speed_mps);
    const maxSpeed = Math.max(...speeds.filter(Boolean));
    const minSpeed = Math.min(...speeds.filter(Boolean));
    const range = maxSpeed - minSpeed || 1;

    const colors = speeds.map((spd) => {
      if (!spd) return metricDef.color;
      const t = (spd - minSpeed) / range;
      const r = Math.round(205 + (52 - 205) * (1 - t));
      const g = Math.round(255 + (211 - 255) * (1 - t));
      const b = Math.round(0 + (153 - 0) * (1 - t));
      return `rgb(${r},${g},${b})`;
    });

    const hoverTexts = splits.map((s) => {
      const pace = mpsToMinPerMile(s.metrics?.avg_speed_mps);
      return `${s.n_strides} strides${pace ? ` · ${pace}/mi` : ""}`;
    });

    return [
      {
        x: labels,
        y: values,
        type: "bar",
        marker: { color: colors, line: { width: 0 } },
        text: hoverTexts,
        hovertemplate: "%{y:.2f}<br>%{text}<extra></extra>",
      },
    ];
  }, [splits, metric, metricDef]);

  if (!splits?.length) return null;

  const layout = {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { family: "Inter, sans-serif", color: "#777" },
    margin: { t: 10, b: 40, l: 50, r: 10 },
    xaxis: {
      tickfont: { size: 10, color: "#777" },
      gridcolor: "transparent",
    },
    yaxis: {
      title: { text: metricDef.label, font: { size: 10, color: "#aaa" } },
      tickfont: { size: 9, color: "#777" },
      gridcolor: "#1e1e1e",
      zeroline: false,
    },
    bargap: 0.2,
    showlegend: false,
    hoverlabel: {
      bgcolor: "#161616",
      bordercolor: "#333",
      font: { size: 11, color: "#fff", family: "Inter, sans-serif" },
    },
  };

  return (
    <div className="splits-chart-wrap">
      <div className="splits-metric-select">
        <select
          className="overlay-select"
          value={metric}
          onChange={(e) => setMetric(e.target.value)}
        >
          {SPLIT_METRICS.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
      {/* Mile splits table */}
      <div className="splits-table-wrap">
        <table className="splits-table">
          <thead>
            <tr>
              <th>Split</th>
              <th>Pace</th>
              <th>Speed</th>
              <th>GCT</th>
              <th>Cadence</th>
              <th>Strides</th>
            </tr>
          </thead>
          <tbody>
            {splits.map((s) => {
              const m = s.metrics || {};
              const pace = mpsToMinPerMile(m.avg_speed_mps);
              return (
                <tr key={s.mile}>
                  <td className="split-mile">
                    {s.distance_m >= 1500 ? `Mile ${s.mile}` : `${(s.distance_m / 1609.344).toFixed(2)} mi`}
                  </td>
                  <td className="split-pace">{pace || "—"}</td>
                  <td>{m.avg_speed_mps?.toFixed(2) || "—"}</td>
                  <td>{m.avg_gct_ms?.toFixed(0) || "—"}</td>
                  <td>{m.avg_cadence_spm?.toFixed(0) || "—"}</td>
                  <td>{s.n_strides}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Plot
        data={data}
        layout={layout}
        config={{ displayModeBar: false, responsive: true }}
        style={{ width: "100%", height }}
        useResizeHandler
      />
    </div>
  );
}
