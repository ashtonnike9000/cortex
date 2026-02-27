import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchSummary } from "../api";
import SparkLine from "../components/charts/SparkLine";
import "./Dashboard.css";

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary()
      .then(setSummary)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="dash-loading">Loading...</div>;
  if (!summary) return <div className="dash-loading">No data available</div>;

  const totalSessions = summary.athletes.reduce((a, b) => a + b.session_count, 0);
  const totalStrides = summary.athletes.reduce((a, b) => a + b.total_strides, 0);

  return (
    <div className="dashboard">
      <div className="dash-header">
        <h1 className="dash-title">Dashboard</h1>
        <p className="dash-subtitle">
          {summary.athletes.length} athletes &middot; {totalSessions} sessions &middot;{" "}
          {totalStrides.toLocaleString()} strides
        </p>
      </div>

      {/* Overview stats */}
      <div className="overview-row">
        <OverviewCard label="Athletes" value={summary.athletes.length} />
        <OverviewCard label="Sessions" value={totalSessions} />
        <OverviewCard label="Strides" value={totalStrides.toLocaleString()} />
      </div>

      {/* Athlete cards */}
      <div className="section-title" style={{ marginTop: "1.5rem" }}>
        Athletes
      </div>
      <div className="athlete-cards">
        {summary.athletes.map((a) => (
          <AthleteCard key={a.id} athlete={a} />
        ))}
      </div>
    </div>
  );
}

function OverviewCard({ label, value }) {
  return (
    <div className="overview-card">
      <div className="overview-value">{value}</div>
      <div className="overview-label">{label}</div>
    </div>
  );
}

function AthleteCard({ athlete }) {
  const m = athlete.latest_metrics;
  const asym = athlete.latest_asymmetry;

  const gctSeverity =
    asym?.gct_ms != null
      ? Math.abs(asym.gct_ms) > 15
        ? "red"
        : Math.abs(asym.gct_ms) > 8
        ? "amber"
        : "green"
      : null;

  return (
    <Link to={`/athlete/${athlete.id}`} className="athlete-card card">
      <div className="ac-header">
        <div className="ac-avatar">{athlete.name[0]}</div>
        <div className="ac-info">
          <div className="ac-name">{athlete.name}</div>
          <div className="ac-meta">
            {athlete.session_count} sessions &middot;{" "}
            {athlete.total_strides.toLocaleString()} strides
          </div>
        </div>
        {gctSeverity && (
          <span className={`badge ${gctSeverity}`}>
            GCT asym {Math.abs(asym.gct_ms).toFixed(0)}ms
          </span>
        )}
      </div>

      {m && (
        <div className="ac-metrics">
          <MiniMetric label="Speed" value={m.avg_speed_mps?.toFixed(1)} unit="m/s" />
          <MiniMetric label="GCT" value={m.avg_gct_ms?.toFixed(0)} unit="ms" />
          <MiniMetric label="Stride" value={m.avg_stride_len_m?.toFixed(2)} unit="m" />
          <MiniMetric label="Peak vGRF" value={m.avg_vgrf_peak_bw?.toFixed(1)} unit="BW" />
        </div>
      )}

      <div className="ac-footer">
        <span className="ac-dates">
          {athlete.date_range.first} &rarr; {athlete.date_range.last}
        </span>
        <span className="ac-arrow">&rarr;</span>
      </div>
    </Link>
  );
}

function MiniMetric({ label, value, unit }) {
  return (
    <div className="mini-metric">
      <div className="mm-label">{label}</div>
      <div className="mm-value">
        {value ?? "—"}
        <span className="mm-unit">{unit}</span>
      </div>
    </div>
  );
}
