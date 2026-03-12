import { useMemo, useCallback } from "react";
import createPlotlyComponent from "react-plotly.js/factory";
import Plotly from "plotly.js-dist-min";

const Plot = createPlotlyComponent(Plotly);

const METRIC_DEFS = [
  { key: "pace", label: "Pace", unit: "min/mi", color: "#CDFF00", axis: "y", invert: true },
  { key: "speed", label: "Speed", unit: "m/s", color: "#8aab00", axis: "y2" },
  { key: "gct", label: "GCT", unit: "ms", color: "#30d158", axis: "y3" },
  { key: "cadence", label: "Cadence", unit: "spm", color: "#ffd60a", axis: "y4" },
  { key: "vgrf_peak", label: "vGRF Peak", unit: "BW", color: "#ff453a", axis: "y5" },
  { key: "fsa", label: "FSA", unit: "°", color: "#64d2ff", axis: "y6" },
  { key: "stride", label: "Stride Len", unit: "m", color: "#bf5af2", axis: "y7" },
  { key: "lr", label: "Loading Rate", unit: "BW/s", color: "#ff9f0a", axis: "y8" },
];

const PLOTLY_BG = "rgba(0,0,0,0)";
const GRID_COLOR = "rgba(255,255,255,0.04)";
const TEXT_COLOR = "#48484a";

function fmtPace(minPerMile) {
  if (minPerMile == null || minPerMile <= 0) return "";
  const m = Math.floor(minPerMile);
  const s = Math.round((minPerMile - m) * 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function InteractiveSessionChart({
  timeSeries,
  activeMetrics = ["pace", "gct"],
  dataMode = "smoothed",
  overlayCompare = false,
  onToggleMetric,
  onRangeChange,
  height = 380,
}) {
  const xVals = useMemo(() => timeSeries.map((p) => p.dist_mi), [timeSeries]);
  const metricKey = useCallback((baseKey, mode) => (mode === "raw" ? `raw_${baseKey}` : baseKey), []);

  const traces = useMemo(() => {
    const active = METRIC_DEFS.filter((m) => activeMetrics.includes(m.key));
    const compareMode = dataMode === "raw" ? "smoothed" : "raw";
    const built = [];

    active.forEach((m, i) => {
        const yData = timeSeries.map((p) => p[metricKey(m.key, dataMode)] ?? null);
        const isPace = m.key === "pace";
        built.push({
          x: xVals,
          y: yData,
          type: "scattergl",
          mode: "lines",
          name: `${m.label} (${dataMode})`,
          yaxis: i === 0 ? "y" : `y${i + 1}`,
          line: { color: m.color, width: isPace ? 2.5 : 1.5 },
          hovertemplate: isPace
            ? yData.map((v) => `${fmtPace(v)} /mi<extra>Pace</extra>`).join("")
            : `%{y:.2f} ${m.unit}<extra>${m.label}</extra>`,
          ...(isPace ? {
            text: yData.map((v) => fmtPace(v)),
            hovertemplate: "%{text} /mi<extra>Pace</extra>",
          } : {}),
          connectgaps: false,
        });

        if (overlayCompare) {
          const yCompare = timeSeries.map((p) => p[metricKey(m.key, compareMode)] ?? null);
          built.push({
            x: xVals,
            y: yCompare,
            type: "scattergl",
            mode: "lines",
            name: `${m.label} (${compareMode})`,
            yaxis: i === 0 ? "y" : `y${i + 1}`,
            line: { color: m.color, width: isPace ? 1.8 : 1.2, dash: "dot" },
            opacity: 0.55,
            hovertemplate: isPace
              ? "%{text} /mi<extra>Pace</extra>"
              : `%{y:.2f} ${m.unit}<extra>${m.label} (${compareMode})</extra>`,
            ...(isPace ? { text: yCompare.map((v) => fmtPace(v)) } : {}),
            connectgaps: false,
          });
        }
      });

    return built;
  }, [timeSeries, activeMetrics, xVals, dataMode, overlayCompare, metricKey]);

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
        ...(m.invert ? { autorange: "reversed" } : {}),
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
        rangeslider: { bgcolor: "rgba(255,255,255,0.02)", bordercolor: "rgba(255,255,255,0.06)", thickness: 0.08 },
      },
      ...yAxes,
      showlegend: true,
      legend: {
        orientation: "h", y: -0.22,
        font: { size: 10, color: "#a1a1a6" },
        bgcolor: PLOTLY_BG,
      },
      hovermode: "x unified",
      hoverlabel: {
        bgcolor: "rgba(20,20,20,0.9)", bordercolor: "rgba(255,255,255,0.08)",
        font: { size: 11, color: "#f5f5f7", family: "Inter, sans-serif" },
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
