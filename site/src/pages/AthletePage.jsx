import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchAthlete } from "../api";
import MetricCard from "../components/charts/MetricCard";
import SessionChart from "../components/charts/SessionChart";
import AsymmetryBar from "../components/charts/AsymmetryBar";
import TrendChart from "../components/charts/TrendChart";
import "./AthletePage.css";

export default function AthletePage() {
  const { id } = useParams();
  const [athlete, setAthlete] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetchAthlete(id)
      .then((data) => {
        setAthlete(data);
        if (data.sessions?.length) {
          setSelectedSession(data.sessions[data.sessions.length - 1]);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!athlete) return <div className="error">Athlete not found</div>;

  const m = selectedSession?.metrics;

  return (
    <div className="athlete-page">
      <div className="athlete-header">
        <div>
          <h1 className="athlete-name">{athlete.name}</h1>
          <p className="athlete-meta">
            {athlete.session_count} sessions &middot; {athlete.total_strides.toLocaleString()} strides
            &middot; {athlete.date_range.first} to {athlete.date_range.last}
          </p>
        </div>
        <span className="badge accent">{athlete.data_source}</span>
      </div>

      {/* Session selector */}
      <div className="session-selector">
        <div className="section-title">Session</div>
        <div className="session-pills">
          {athlete.sessions.map((s) => (
            <button
              key={s.date + s.label}
              className={`pill ${selectedSession === s ? "active" : ""}`}
              onClick={() => setSelectedSession(s)}
            >
              {s.date}
              <span className="pill-sub">{s.n_strides} strides</span>
            </button>
          ))}
        </div>
      </div>

      {selectedSession && (
        <>
          {/* Key metrics */}
          <div className="section-title">Key Metrics</div>
          <div className="metric-grid">
            <MetricCard label="Avg Speed" value={m?.avg_speed_mps} unit="m/s" color="var(--accent)" />
            <MetricCard label="Max Speed" value={m?.max_speed_mps} unit="m/s" />
            <MetricCard label="Avg GCT" value={m?.avg_gct_ms?.toFixed(0)} unit="ms" color="var(--green)" />
            <MetricCard label="GCT Std Dev" value={m?.std_gct_ms?.toFixed(0)} unit="ms" />
            <MetricCard label="Avg Stride" value={m?.avg_stride_len_m?.toFixed(2)} unit="m" color="var(--cyan)" />
            <MetricCard label="Avg Cadence" value={m?.avg_cadence_spm?.toFixed(0)} unit="spm" />
            <MetricCard label="Avg vGRF" value={m?.avg_vgrf_bw?.toFixed(2)} unit="BW" color="var(--amber)" />
            <MetricCard label="Peak vGRF" value={m?.avg_vgrf_peak_bw?.toFixed(2)} unit="BW" />
            <MetricCard label="FSA" value={m?.avg_fsa_deg?.toFixed(1)} unit="°" />
          </div>

          {/* In-session time series */}
          <div style={{ marginTop: "1.5rem" }}>
            <div className="section-title">Speed &amp; Ground Contact</div>
            <div className="card">
              <SessionChart
                timeSeries={selectedSession.time_series}
                metrics={["speed", "gct"]}
                height={220}
              />
            </div>
          </div>

          <div style={{ marginTop: "1rem" }}>
            <div className="section-title">Cadence &amp; Loading</div>
            <div className="card">
              <SessionChart
                timeSeries={selectedSession.time_series}
                metrics={["cadence", "vgrf"]}
                height={220}
              />
            </div>
          </div>

          {/* Asymmetry */}
          <div style={{ marginTop: "1.5rem" }}>
            <div className="section-title">Left / Right Asymmetry</div>
            <div className="card">
              <AsymmetryBar
                leftSummary={selectedSession.left_summary}
                rightSummary={selectedSession.right_summary}
                height={200}
              />
              {selectedSession.asymmetry?.gct_ms != null && (
                <div className="asymmetry-detail">
                  <AsymmetryItem
                    label="GCT"
                    value={selectedSession.asymmetry.gct_ms}
                    unit="ms"
                  />
                  <AsymmetryItem
                    label="Stride Length"
                    value={selectedSession.asymmetry.stride_len_m}
                    unit="m"
                    scale={100}
                  />
                  <AsymmetryItem
                    label="FSA"
                    value={selectedSession.asymmetry.fsa_deg}
                    unit="°"
                  />
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Cross-session trends */}
      {athlete.sessions.length >= 2 && (
        <div style={{ marginTop: "2rem" }}>
          <h2 className="trends-title">Session Trends</h2>
          <div className="trends-grid">
            <div className="card">
              <TrendChart
                sessions={athlete.sessions}
                metricPath="metrics.avg_speed_mps"
                label="Avg Speed (m/s)"
                color="#6366f1"
                unit=" m/s"
              />
            </div>
            <div className="card">
              <TrendChart
                sessions={athlete.sessions}
                metricPath="metrics.avg_gct_ms"
                label="Avg GCT (ms)"
                color="#22c55e"
                unit=" ms"
              />
            </div>
            <div className="card">
              <TrendChart
                sessions={athlete.sessions}
                metricPath="metrics.avg_stride_len_m"
                label="Avg Stride Length (m)"
                color="#06b6d4"
                unit=" m"
              />
            </div>
            <div className="card">
              <TrendChart
                sessions={athlete.sessions}
                metricPath="metrics.avg_vgrf_peak_bw"
                label="Peak vGRF (BW)"
                color="#f59e0b"
                unit=" BW"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AsymmetryItem({ label, value, unit, scale = 1 }) {
  if (value == null) return null;
  const display = Math.abs(value * scale).toFixed(1);
  const direction = value > 0 ? "Left >" : value < 0 ? "Right >" : "Even";
  const severity =
    Math.abs(value * scale) > 10 ? "red" : Math.abs(value * scale) > 5 ? "amber" : "green";

  return (
    <div className="asymmetry-item">
      <span className="asymmetry-label">{label}</span>
      <span className={`badge ${severity}`}>
        {direction} {display}
        {unit}
      </span>
    </div>
  );
}
