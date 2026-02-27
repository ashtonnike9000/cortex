import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { fetchSummary } from "../api";
import {
  ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell,
} from "recharts";
import "./Dashboard.css";

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState(1);

  useEffect(() => {
    fetchSummary().then(setSummary).finally(() => setLoading(false));
  }, []);

  const sorted = useMemo(() => {
    if (!summary?.athletes) return [];
    return [...summary.athletes].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "string") return av.localeCompare(bv) * sortDir;
      return (av - bv) * sortDir;
    });
  }, [summary, sortKey, sortDir]);

  if (loading) return <div className="dash-loading">Loading...</div>;
  if (!summary) return <div className="dash-loading">No data available</div>;

  const f = summary.fleet;

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => d * -1);
    else { setSortKey(key); setSortDir(1); }
  };

  const SortHead = ({ k, children }) => (
    <th onClick={() => handleSort(k)} className="sortable">
      {children}
      {sortKey === k && <span className="sort-arrow">{sortDir === 1 ? " \u25B2" : " \u25BC"}</span>}
    </th>
  );

  return (
    <div className="dashboard">
      <div className="dash-hero">
        <h1 className="dash-title">RUNNING INTELLIGENCE</h1>
        <p className="dash-subtitle">Fleet performance overview</p>
      </div>

      <div className="fleet-stats">
        <FleetStat value={f.total_athletes} label="Athletes" />
        <FleetStat value={f.total_sessions} label="Sessions" />
        <FleetStat value={f.total_strides?.toLocaleString()} label="Strides" />
        <FleetStat value={f.avg_gct_ms?.toFixed(0)} label="Fleet Avg GCT" unit="ms" />
        <FleetStat value={f.avg_speed_mps?.toFixed(2)} label="Fleet Avg Speed" unit="m/s" />
        <FleetStat value={f.avg_asymmetry_ms?.toFixed(1)} label="Avg Asymmetry" unit="ms" />
      </div>

      <div className="section-label" style={{ marginTop: "2rem" }}>Athlete Comparison</div>
      <div className="table-wrap card">
        <table className="athlete-table">
          <thead>
            <tr>
              <SortHead k="name">Athlete</SortHead>
              <SortHead k="session_count">Sessions</SortHead>
              <SortHead k="total_strides">Strides</SortHead>
              <SortHead k="avg_speed_mps">Speed</SortHead>
              <SortHead k="avg_gct_ms">GCT</SortHead>
              <SortHead k="avg_stride_len_m">Stride</SortHead>
              <SortHead k="avg_cadence_spm">Cadence</SortHead>
              <SortHead k="avg_vgrf_peak_bw">Peak vGRF</SortHead>
              <SortHead k="gct_asymmetry_ms">Asymmetry</SortHead>
              <th>Insight</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((a) => (
              <tr key={a.id}>
                <td>
                  <Link to={`/athlete/${a.id}`} className="athlete-link">
                    <span className="at-avatar">{a.name[0]}</span>
                    {a.name}
                  </Link>
                </td>
                <td>{a.session_count}</td>
                <td>{a.total_strides?.toLocaleString()}</td>
                <td>{a.avg_speed_mps?.toFixed(2)}</td>
                <td>{a.avg_gct_ms?.toFixed(0)}</td>
                <td>{a.avg_stride_len_m?.toFixed(2)}</td>
                <td>{a.avg_cadence_spm?.toFixed(0)}</td>
                <td>{a.avg_vgrf_peak_bw?.toFixed(2)}</td>
                <td>
                  {a.gct_asymmetry_ms != null && (
                    <span className={`badge ${asym_badge(a.gct_asymmetry_ms)}`}>
                      {Math.abs(a.gct_asymmetry_ms).toFixed(1)} ms
                    </span>
                  )}
                </td>
                <td className="insight-cell">{a.headline_insight || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {summary.distributions && (
        <>
          <div className="section-label" style={{ marginTop: "2rem" }}>Metric Distributions</div>
          <div className="dist-grid">
            <DistChart
              title="GCT (ms)"
              data={summary.distributions.gct_ms}
              athletes={sorted}
              metricKey="avg_gct_ms"
            />
            <DistChart
              title="Peak vGRF (BW)"
              data={summary.distributions.vgrf_peak_bw}
              athletes={sorted}
              metricKey="avg_vgrf_peak_bw"
            />
            <DistChart
              title="GCT Asymmetry (ms)"
              data={summary.distributions.asymmetry_ms}
              athletes={sorted}
              metricKey="gct_asymmetry_ms"
              abs
            />
            <DistChart
              title="Speed (m/s)"
              data={summary.distributions.speed_mps}
              athletes={sorted}
              metricKey="avg_speed_mps"
            />
          </div>
        </>
      )}
    </div>
  );
}

function asym_badge(v) {
  const a = Math.abs(v);
  return a > 15 ? "red" : a > 8 ? "amber" : "green";
}

function FleetStat({ value, label, unit }) {
  return (
    <div className="fleet-stat">
      <div className="fleet-stat-value">
        {value ?? "—"}
        {unit && <span className="fleet-stat-unit">{unit}</span>}
      </div>
      <div className="fleet-stat-label">{label}</div>
    </div>
  );
}

function DistChart({ title, data, athletes, metricKey, abs: useAbs }) {
  if (!data || data.length === 0) return null;

  const points = athletes
    .filter((a) => a[metricKey] != null)
    .map((a, i) => ({
      name: a.name,
      value: useAbs ? Math.abs(a[metricKey]) : a[metricKey],
      idx: i,
    }));

  if (points.length === 0) return null;

  return (
    <div className="card dist-card">
      <div className="dist-title">{title}</div>
      <ResponsiveContainer width="100%" height={120}>
        <ScatterChart margin={{ top: 8, right: 12, bottom: 8, left: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="value"
            type="number"
            tick={{ fontSize: 10, fill: "var(--text-muted)" }}
            axisLine={{ stroke: "var(--border)" }}
          />
          <YAxis hide />
          <Tooltip
            contentStyle={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              fontSize: "0.7rem",
              color: "var(--text-primary)",
            }}
            formatter={(v) => [v?.toFixed(2), title]}
            labelFormatter={() => ""}
            cursor={false}
          />
          <Scatter data={points} fill="var(--accent)">
            {points.map((_, i) => (
              <Cell key={i} fill="var(--accent)" />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      <div className="dist-labels">
        {points.map((p) => (
          <span key={p.name} className="dist-dot-label">{p.name}: {p.value?.toFixed(1)}</span>
        ))}
      </div>
    </div>
  );
}
