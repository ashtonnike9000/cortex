import { useMemo } from "react";
import createPlotlyComponent from "react-plotly.js/factory";
import Plotly from "plotly.js-dist-min";

const Plot = createPlotlyComponent(Plotly);

const TREND_METRICS = [
  { key: "avg_speed_mps", path: "metrics.avg_speed_mps", label: "Speed (m/s)", color: "#CDFF00" },
  { key: "avg_gct_ms", path: "metrics.avg_gct_ms", label: "GCT (ms)", color: "#34d399" },
  { key: "avg_stride_len_m", path: "metrics.avg_stride_len_m", label: "Stride (m)", color: "#22d3ee" },
  { key: "avg_cadence_spm", path: "metrics.avg_cadence_spm", label: "Cadence (spm)", color: "#fbbf24" },
  { key: "avg_vgrf_peak_bw", path: "metrics.avg_vgrf_peak_bw", label: "vGRF Peak (BW)", color: "#f87171" },
  { key: "load_total", path: "load.total", label: "Session Load", color: "#fb923c" },
  { key: "load_cumulative", path: "load.cumulative", label: "Cumulative Load", color: "#e879f9" },
  { key: "distance_mi", path: "distance_mi", label: "Distance (mi)", color: "#a78bfa" },
];

function resolvePath(obj, path) {
  let v = obj;
  for (const p of path.split(".")) {
    v = v?.[p];
  }
  return v;
}

export default function TrendPlot({
  sessions,
  activeMetrics = ["avg_speed_mps", "avg_gct_ms"],
  onToggleMetric,
  onClickSession,
  height = 320,
}) {
  const traces = useMemo(() => {
    if (!sessions || sessions.length < 2) return [];
    return TREND_METRICS.filter((m) => activeMetrics.includes(m.key)).map((m, i) => ({
      x: sessions.map((s) => s.date),
      y: sessions.map((s) => {
        const v = resolvePath(s, m.path);
        return v != null ? Math.round(v * 100) / 100 : null;
      }),
      type: "scatter",
      mode: "lines+markers",
      name: m.label,
      yaxis: i === 0 ? "y" : `y${i + 1}`,
      line: { color: m.color, width: 2 },
      marker: { size: 6, color: m.color },
      hovertemplate: `%{y:.2f}<extra>${m.label}</extra>`,
      connectgaps: true,
    }));
  }, [sessions, activeMetrics]);

  const layout = useMemo(() => {
    const active = TREND_METRICS.filter((m) => activeMetrics.includes(m.key));
    const yAxes = {};
    active.forEach((m, i) => {
      const axisKey = i === 0 ? "yaxis" : `yaxis${i + 1}`;
      yAxes[axisKey] = {
        title: i < 2 ? { text: m.label, font: { size: 10, color: m.color } } : undefined,
        tickfont: { size: 9, color: m.color },
        gridcolor: i === 0 ? "#1e1e1e" : "transparent",
        side: i % 2 === 0 ? "left" : "right",
        overlaying: i === 0 ? undefined : "y",
        showgrid: i === 0,
        zeroline: false,
      };
    });

    return {
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      font: { family: "Inter, sans-serif", color: "#777" },
      margin: { t: 10, b: 50, l: 55, r: 55 },
      xaxis: {
        tickfont: { size: 9, color: "#777" },
        gridcolor: "#1e1e1e",
        zeroline: false,
      },
      ...yAxes,
      showlegend: true,
      legend: { orientation: "h", y: -0.22, font: { size: 10, color: "#aaa" }, bgcolor: "rgba(0,0,0,0)" },
      hovermode: "x unified",
      hoverlabel: {
        bgcolor: "#161616", bordercolor: "#333",
        font: { size: 11, color: "#fff", family: "Inter, sans-serif" },
      },
    };
  }, [activeMetrics]);

  const handleClick = (e) => {
    if (onClickSession && e.points?.length) {
      const idx = e.points[0].pointIndex;
      if (sessions[idx]) onClickSession(sessions[idx]);
    }
  };

  if (!sessions || sessions.length < 2) return null;

  return (
    <div className="trend-plot-wrap">
      <div className="metric-toggles">
        {TREND_METRICS.map((m) => (
          <button
            key={m.key}
            className={`metric-toggle ${activeMetrics.includes(m.key) ? "active" : ""}`}
            style={activeMetrics.includes(m.key) ? { borderColor: m.color, color: m.color } : {}}
            onClick={() => onToggleMetric?.(m.key)}
          >
            <span className="mt-dot" style={{ background: activeMetrics.includes(m.key) ? m.color : "#333" }} />
            {m.label}
          </button>
        ))}
      </div>
      <Plot
        data={traces}
        layout={layout}
        config={{ displayModeBar: false, responsive: true }}
        style={{ width: "100%", height }}
        onClick={handleClick}
        useResizeHandler
      />
    </div>
  );
}
