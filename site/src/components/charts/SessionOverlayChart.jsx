import { useMemo, useState } from "react";
import createPlotlyComponent from "react-plotly.js/factory";
import Plotly from "plotly.js-dist-min";

const Plot = createPlotlyComponent(Plotly);

const SESSION_COLORS = [
  "#CDFF00", "#30d158", "#64d2ff", "#ffd60a", "#ff453a",
  "#bf5af2", "#ff9f0a", "#ff375f", "#5e5ce6", "#ac8e68",
];

const METRIC_OPTIONS = [
  { key: "speed", label: "Speed (m/s)" },
  { key: "gct", label: "GCT (ms)" },
  { key: "cadence", label: "Cadence (spm)" },
  { key: "vgrf_peak", label: "vGRF Peak (BW)" },
  { key: "fsa", label: "FSA (°)" },
  { key: "stride", label: "Stride Length (m)" },
  { key: "lr", label: "Loading Rate (BW/s)" },
];

export default function SessionOverlayChart({
  sessions,
  selectedSessionIds,
  onToggleSession,
  height = 360,
}) {
  const [metric, setMetric] = useState("speed");

  const metricDef = METRIC_OPTIONS.find((m) => m.key === metric) || METRIC_OPTIONS[0];

  const traces = useMemo(() => {
    return selectedSessionIds
      .map((dateLabel, i) => {
        const session = sessions.find((s) => s.date + s.label === dateLabel);
        if (!session || !session.time_series?.length) return null;
        const ts = session.time_series;
        const color = SESSION_COLORS[i % SESSION_COLORS.length];
        return {
          x: ts.map((p) => p.dist_mi),
          y: ts.map((p) => p[metric] ?? null),
          type: "scattergl",
          mode: "lines",
          name: session.date + (session.source ? ` (${session.source})` : ""),
          line: { color, width: 1.5 },
          hovertemplate: `%{y:.2f}<extra>${session.date}</extra>`,
          connectgaps: false,
        };
      })
      .filter(Boolean);
  }, [sessions, selectedSessionIds, metric]);

  const layout = useMemo(
    () => ({
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      font: { family: "Inter, sans-serif", color: "#48484a" },
      margin: { t: 10, b: 50, l: 55, r: 20 },
      xaxis: {
        title: { text: "Distance (mi)", font: { size: 11, color: "#48484a" } },
        tickfont: { size: 9, color: "#48484a" },
        gridcolor: "rgba(255,255,255,0.04)",
        zeroline: false,
      },
      yaxis: {
        title: { text: metricDef.label, font: { size: 11, color: "#a1a1a6" } },
        tickfont: { size: 9, color: "#48484a" },
        gridcolor: "rgba(255,255,255,0.04)",
        zeroline: false,
      },
      showlegend: true,
      legend: {
        orientation: "h",
        y: -0.2,
        font: { size: 10, color: "#a1a1a6" },
        bgcolor: "rgba(0,0,0,0)",
      },
      hovermode: "x unified",
      hoverlabel: {
        bgcolor: "rgba(20,20,20,0.9)",
        bordercolor: "rgba(255,255,255,0.08)",
        font: { size: 11, color: "#f5f5f7", family: "Inter, sans-serif" },
      },
    }),
    [metricDef]
  );

  return (
    <div className="overlay-chart-wrap">
      <div className="overlay-controls">
        <div className="overlay-metric-select">
          <label className="overlay-label">Metric</label>
          <select
            className="overlay-select"
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
          >
            {METRIC_OPTIONS.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div className="overlay-session-picks">
          <label className="overlay-label">Sessions</label>
          <div className="overlay-session-list">
            {sessions.map((s, i) => {
              const id = s.date + s.label;
              const isActive = selectedSessionIds.includes(id);
              const color = isActive
                ? SESSION_COLORS[selectedSessionIds.indexOf(id) % SESSION_COLORS.length]
                : "#333";
              return (
                <button
                  key={id}
                  className={`overlay-session-btn ${isActive ? "active" : ""}`}
                  style={isActive ? { borderColor: color, color } : {}}
                  onClick={() => onToggleSession(id)}
                >
                  <span className="osb-dot" style={{ background: color }} />
                  {s.date}
                  {s.source && <span className="osb-source">{s.source}</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      {traces.length > 0 ? (
        <Plot
          data={traces}
          layout={layout}
          config={{ displayModeBar: false, responsive: true }}
          style={{ width: "100%", height }}
          useResizeHandler
        />
      ) : (
        <div className="overlay-empty">Select sessions above to compare</div>
      )}
    </div>
  );
}
