import { useMemo, useCallback } from "react";
import createPlotlyComponent from "react-plotly.js/factory";
import Plotly from "plotly.js-dist-min";

const Plot = createPlotlyComponent(Plotly);

const METRIC_DEFS = [
  { key: "speed", label: "Speed", unit: "m/s", color: "#CDFF00", axis: "y" },
  { key: "gct", label: "GCT", unit: "ms", color: "#34d399", axis: "y2" },
  { key: "cadence", label: "Cadence", unit: "spm", color: "#fbbf24", axis: "y3" },
  { key: "vgrf_peak", label: "vGRF Peak", unit: "BW", color: "#f87171", axis: "y4" },
  { key: "fsa", label: "FSA", unit: "°", color: "#22d3ee", axis: "y5" },
  { key: "stride", label: "Stride Len", unit: "m", color: "#a78bfa", axis: "y6" },
  { key: "lr", label: "Loading Rate", unit: "BW/s", color: "#fb923c", axis: "y7" },
];

const PLOTLY_BG = "rgba(0,0,0,0)";
const GRID_COLOR = "#1e1e1e";
const TEXT_COLOR = "#777";

export default function InteractiveSessionChart({
  timeSeries,
  activeMetrics = ["speed", "gct"],
  onToggleMetric,
  onRangeChange,
  height = 380,
}) {
  const xVals = useMemo(() => timeSeries.map((p) => p.dist_mi), [timeSeries]);

  const traces = useMemo(() => {
    return METRIC_DEFS
      .filter((m) => activeMetrics.includes(m.key))
      .map((m, i) => ({
        x: xVals,
        y: timeSeries.map((p) => p[m.key] ?? null),
        type: "scattergl",
        mode: "lines",
        name: `${m.label} (${m.unit})`,
        yaxis: i === 0 ? "y" : `y${i + 1}`,
        line: { color: m.color, width: 1.5 },
        hovertemplate: `%{y:.2f} ${m.unit}<extra>${m.label}</extra>`,
        connectgaps: false,
      }));
  }, [timeSeries, activeMetrics, xVals]);

  const layout = useMemo(() => {
    const active = METRIC_DEFS.filter((m) => activeMetrics.includes(m.key));
    const yAxes = {};
    active.forEach((m, i) => {
      const axisKey = i === 0 ? "yaxis" : `yaxis${i + 1}`;
      yAxes[axisKey] = {
        title: { text: i < 2 ? `${m.label} (${m.unit})` : "", font: { size: 10, color: m.color } },
        tickfont: { size: 9, color: m.color },
        gridcolor: i === 0 ? GRID_COLOR : "transparent",
        side: i % 2 === 0 ? "left" : "right",
        overlaying: i === 0 ? undefined : "y",
        showgrid: i === 0,
        zeroline: false,
        ...(i >= 2 ? { anchor: "free", position: i % 2 === 0 ? 0 : 1 } : {}),
      };
    });

    return {
      paper_bgcolor: PLOTLY_BG,
      plot_bgcolor: PLOTLY_BG,
      font: { family: "Inter, sans-serif", color: TEXT_COLOR },
      margin: { t: 10, b: 60, l: 55, r: 55 },
      xaxis: {
        title: { text: "Distance (mi)", font: { size: 11, color: TEXT_COLOR } },
        tickfont: { size: 9, color: TEXT_COLOR },
        gridcolor: GRID_COLOR,
        zeroline: false,
        rangeslider: { bgcolor: "#111", bordercolor: "#333", thickness: 0.08 },
      },
      ...yAxes,
      showlegend: true,
      legend: {
        orientation: "h", y: -0.22,
        font: { size: 10, color: "#aaa" },
        bgcolor: PLOTLY_BG,
      },
      hovermode: "x unified",
      hoverlabel: {
        bgcolor: "#161616", bordercolor: "#333",
        font: { size: 11, color: "#fff", family: "Inter, sans-serif" },
      },
    };
  }, [activeMetrics]);

  const handleRelayout = useCallback(
    (e) => {
      if (onRangeChange) {
        const r0 = e["xaxis.range[0]"] ?? e["xaxis.range"]?.[0];
        const r1 = e["xaxis.range[1]"] ?? e["xaxis.range"]?.[1];
        if (r0 != null && r1 != null) {
          onRangeChange([r0, r1]);
        }
        if (e["xaxis.autorange"]) {
          onRangeChange(null);
        }
      }
    },
    [onRangeChange]
  );

  return (
    <div className="interactive-chart-wrap">
      <div className="metric-toggles">
        {METRIC_DEFS.map((m) => (
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
        onRelayout={handleRelayout}
        useResizeHandler
      />
    </div>
  );
}

export { METRIC_DEFS };
