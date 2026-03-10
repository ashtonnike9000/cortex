import { useMemo } from "react";
import createPlotlyComponent from "react-plotly.js/factory";
import Plotly from "plotly.js-dist-min";

const Plot = createPlotlyComponent(Plotly);

export default function LoadChart({ sessions, height = 280 }) {
  const data = useMemo(() => {
    if (!sessions?.length) return [];
    const dates = sessions.map((s) => s.date);
    const loads = sessions.map((s) => s.load?.total ?? 0);
    const cumulative = sessions.map((s) => s.load?.cumulative ?? 0);
    const perMile = sessions.map((s) => s.load?.per_mile ?? 0);

    return [
      {
        x: dates,
        y: loads,
        type: "bar",
        name: "Session Load",
        marker: { color: "#CDFF00", opacity: 0.7 },
        hovertemplate: "%{y:.1f}<extra>Session Load</extra>",
      },
      {
        x: dates,
        y: cumulative,
        type: "scatter",
        mode: "lines+markers",
        name: "Cumulative",
        yaxis: "y2",
        line: { color: "#e879f9", width: 2 },
        marker: { size: 5, color: "#e879f9" },
        hovertemplate: "%{y:.1f}<extra>Cumulative</extra>",
      },
      {
        x: dates,
        y: perMile,
        type: "scatter",
        mode: "lines+markers",
        name: "Load / Mile",
        yaxis: "y3",
        line: { color: "#22d3ee", width: 1.5, dash: "dot" },
        marker: { size: 4, color: "#22d3ee" },
        hovertemplate: "%{y:.1f}<extra>Load/Mile</extra>",
        visible: "legendonly",
      },
    ];
  }, [sessions]);

  if (!sessions?.length) return null;

  const layout = {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { family: "Inter, sans-serif", color: "#777" },
    margin: { t: 10, b: 50, l: 55, r: 55 },
    xaxis: {
      tickfont: { size: 9, color: "#777" },
      gridcolor: "#1e1e1e",
      zeroline: false,
    },
    yaxis: {
      title: { text: "Session Load", font: { size: 10, color: "#CDFF00" } },
      tickfont: { size: 9, color: "#CDFF00" },
      gridcolor: "#1e1e1e",
      zeroline: false,
    },
    yaxis2: {
      title: { text: "Cumulative", font: { size: 10, color: "#e879f9" } },
      tickfont: { size: 9, color: "#e879f9" },
      overlaying: "y",
      side: "right",
      showgrid: false,
      zeroline: false,
    },
    yaxis3: {
      overlaying: "y",
      side: "right",
      showgrid: false,
      zeroline: false,
      visible: false,
    },
    showlegend: true,
    legend: { orientation: "h", y: -0.2, font: { size: 10, color: "#aaa" }, bgcolor: "rgba(0,0,0,0)" },
    barmode: "group",
    bargap: 0.3,
    hovermode: "x unified",
    hoverlabel: {
      bgcolor: "#161616", bordercolor: "#333",
      font: { size: 11, color: "#fff", family: "Inter, sans-serif" },
    },
  };

  return (
    <Plot
      data={data}
      layout={layout}
      config={{ displayModeBar: false, responsive: true }}
      style={{ width: "100%", height }}
      useResizeHandler
    />
  );
}
