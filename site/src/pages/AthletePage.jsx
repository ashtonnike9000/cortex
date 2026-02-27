import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchAthlete } from "../api";
import MetricCard from "../components/charts/MetricCard";
import SessionChart from "../components/charts/SessionChart";
import AsymmetryBar from "../components/charts/AsymmetryBar";
import TrendChart from "../components/charts/TrendChart";
import BilateralTable from "../components/charts/BilateralTable";
import SpeedZonesTable from "../components/charts/SpeedZonesTable";
import FatiguePanel from "../components/charts/FatiguePanel";
import Tabs from "../components/layout/Tabs";
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

  const tabs = [
    {
      id: "overview",
      label: "Overview",
      content: <OverviewTab session={selectedSession} metrics={m} />,
    },
    {
      id: "biomechanics",
      label: "Biomechanics",
      content: <BiomechanicsTab session={selectedSession} />,
    },
    {
      id: "speed",
      label: "Speed Zones",
      content: <SpeedZonesTab session={selectedSession} />,
    },
    {
      id: "fatigue",
      label: "Fatigue",
      content: <FatigueTab session={selectedSession} />,
    },
    {
      id: "trends",
      label: "Trends",
      content: <TrendsTab sessions={athlete.sessions} />,
    },
  ];

  return (
    <div className="athlete-page">
      {/* Hero header */}
      <div className="athlete-hero">
        <div className="hero-content">
          <h1 className="athlete-name">{athlete.name}</h1>
          <p className="athlete-meta">
            {athlete.session_count} sessions &middot;{" "}
            {athlete.total_strides.toLocaleString()} strides &middot;{" "}
            {athlete.date_range.first} to {athlete.date_range.last}
          </p>
          <div className="hero-stats">
            <HeroStat value={athlete.total_strides.toLocaleString()} label="Total Strides" />
            <HeroStat value={athlete.session_count} label="Sessions" />
            <HeroStat value={athlete.data_source} label="Source" />
          </div>
        </div>
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

      {/* Tabbed content */}
      {selectedSession && <Tabs tabs={tabs} />}
    </div>
  );
}

function HeroStat({ value, label }) {
  return (
    <div className="hero-stat">
      <div className="hero-stat-value">{value}</div>
      <div className="hero-stat-label">{label}</div>
    </div>
  );
}

function OverviewTab({ session, metrics }) {
  if (!session || !metrics) return null;
  const m = metrics;

  return (
    <>
      <div className="metric-grid">
        <MetricCard label="Avg Speed" value={m.avg_speed_mps?.toFixed(1)} unit="m/s" color="var(--accent)" />
        <MetricCard label="Max Speed" value={m.max_speed_mps?.toFixed(1)} unit="m/s" />
        <MetricCard label="Avg GCT" value={m.avg_gct_ms?.toFixed(0)} unit="ms" color="var(--green)" />
        <MetricCard label="GCT Std Dev" value={m.std_gct_ms?.toFixed(0)} unit="ms" />
        <MetricCard label="Avg Stride" value={m.avg_stride_len_m?.toFixed(2)} unit="m" color="var(--cyan)" />
        <MetricCard label="Cadence" value={m.avg_cadence_spm?.toFixed(0)} unit="spm" />
        <MetricCard label="Avg vGRF" value={m.avg_vgrf_bw?.toFixed(2)} unit="BW" color="var(--amber)" />
        <MetricCard label="Peak vGRF" value={m.avg_vgrf_peak_bw?.toFixed(2)} unit="BW" />
        <MetricCard label="FSA" value={m.avg_fsa_deg?.toFixed(1)} unit="°" />
      </div>

      <div style={{ marginTop: "1.5rem" }}>
        <div className="section-title">Speed &amp; Ground Contact</div>
        <div className="card">
          <SessionChart timeSeries={session.time_series} metrics={["speed", "gct"]} height={220} />
        </div>
      </div>

      <div style={{ marginTop: "1rem" }}>
        <div className="section-title">Cadence &amp; Loading</div>
        <div className="card">
          <SessionChart timeSeries={session.time_series} metrics={["cadence", "vgrf"]} height={220} />
        </div>
      </div>
    </>
  );
}

function BiomechanicsTab({ session }) {
  if (!session) return null;

  return (
    <>
      <div className="section-title">Left vs Right — Full Metric Breakdown</div>
      <div className="card">
        <BilateralTable bilateral={session.bilateral} />
      </div>

      <div style={{ marginTop: "1.5rem" }}>
        <div className="section-title">Asymmetry Visualization</div>
        <div className="card">
          <AsymmetryBar
            leftSummary={session.left_summary}
            rightSummary={session.right_summary}
            height={220}
          />
        </div>
      </div>

      {session.asymmetry?.gct_ms != null && (
        <div className="insight-box" style={{ marginTop: "1rem" }}>
          <strong>Bilateral Assessment:</strong> GCT asymmetry of{" "}
          <strong>{Math.abs(session.asymmetry.gct_ms).toFixed(1)} ms</strong>
          {Math.abs(session.asymmetry.gct_ms) < 8
            ? " is within normal range — good bilateral symmetry."
            : Math.abs(session.asymmetry.gct_ms) < 15
            ? " is slightly elevated — worth monitoring across sessions."
            : " is significant — may indicate a compensation pattern worth investigating."}
          {session.asymmetry.gct_ms > 0 ? " Left foot has longer ground contact." : " Right foot has longer ground contact."}
        </div>
      )}

      <div style={{ marginTop: "1.5rem" }}>
        <div className="section-title">Per-Side Summary</div>
        <div className="side-compare">
          <SideCard
            title="Left Foot"
            summary={session.left_summary}
            count={session.n_left}
            color="var(--accent)"
          />
          <SideCard
            title="Right Foot"
            summary={session.right_summary}
            count={session.n_right}
            color="var(--amber)"
          />
        </div>
      </div>
    </>
  );
}

function SideCard({ title, summary, count, color }) {
  if (!summary) return null;
  return (
    <div className="card side-card">
      <div className="side-header">
        <span className="side-dot" style={{ background: color }} />
        <span className="side-title">{title}</span>
        <span className="side-count">{count} strides</span>
      </div>
      <div className="side-metrics">
        <SideStat label="GCT" value={summary.avg_gct_ms?.toFixed(1)} unit="ms" std={summary.std_gct_ms?.toFixed(1)} />
        <SideStat label="FSA" value={summary.avg_fsa_deg?.toFixed(1)} unit="°" std={summary.std_fsa_deg?.toFixed(1)} />
        <SideStat label="vGRF" value={summary.avg_vgrf_bw?.toFixed(2)} unit="BW" />
        <SideStat label="Peak vGRF" value={summary.avg_vgrf_peak_bw?.toFixed(2)} unit="BW" />
        <SideStat label="Stride" value={summary.avg_stride_len_m?.toFixed(2)} unit="m" />
        <SideStat label="Loading Rate" value={summary.avg_loading_rate?.toFixed(1)} unit="BW/s" />
      </div>
    </div>
  );
}

function SideStat({ label, value, unit, std }) {
  return (
    <div className="side-stat">
      <div className="side-stat-label">{label}</div>
      <div className="side-stat-value">
        {value ?? "—"}
        <span className="bt-unit"> {unit}</span>
        {std && <span className="bt-std"> ± {std}</span>}
      </div>
    </div>
  );
}

function SpeedZonesTab({ session }) {
  if (!session) return null;

  return (
    <>
      <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "1rem", lineHeight: 1.5 }}>
        How mechanics change across speed zones — revealing the relationship between pace and biomechanical output.
      </p>
      <div className="card">
        <SpeedZonesTable zones={session.speed_zones} />
      </div>

      {session.speed_zones?.length > 1 && (
        <div className="insight-box" style={{ marginTop: "1rem" }}>
          <strong>Speed-Mechanics Pattern:</strong> As speed increases, expect GCT to shorten,
          forces to increase, and foot strike angle to shift forward. The rate of these changes
          reveals individual mechanical signatures — how efficiently the body scales movement
          with speed demands.
        </div>
      )}
    </>
  );
}

function FatigueTab({ session }) {
  if (!session) return null;

  return (
    <>
      <div className="section-title">Within-Session Fatigue Detection</div>
      <div className="card">
        <FatiguePanel fatigue={session.fatigue} />
      </div>

      <div style={{ marginTop: "1.5rem" }}>
        <div className="section-title">Full Session Timeline</div>
        <div className="card">
          <SessionChart
            timeSeries={session.time_series}
            metrics={["speed", "gct"]}
            height={260}
          />
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.5rem", lineHeight: 1.5 }}>
            Watch for GCT creeping upward while speed holds steady — the signature of neuromuscular fatigue.
          </div>
        </div>
      </div>
    </>
  );
}

function TrendsTab({ sessions }) {
  if (!sessions || sessions.length < 2) {
    return <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Need 2+ sessions for trend analysis.</p>;
  }

  return (
    <div className="trends-grid">
      <div className="card">
        <TrendChart sessions={sessions} metricPath="metrics.avg_speed_mps" label="Avg Speed (m/s)" color="#6366f1" unit=" m/s" />
      </div>
      <div className="card">
        <TrendChart sessions={sessions} metricPath="metrics.avg_gct_ms" label="Avg GCT (ms)" color="#22c55e" unit=" ms" />
      </div>
      <div className="card">
        <TrendChart sessions={sessions} metricPath="metrics.avg_stride_len_m" label="Stride Length (m)" color="#06b6d4" unit=" m" />
      </div>
      <div className="card">
        <TrendChart sessions={sessions} metricPath="metrics.avg_vgrf_peak_bw" label="Peak vGRF (BW)" color="#f59e0b" unit=" BW" />
      </div>
      <div className="card">
        <TrendChart sessions={sessions} metricPath="asymmetry.gct_ms" label="GCT Asymmetry L-R (ms)" color="#ef4444" unit=" ms" />
      </div>
      <div className="card">
        <TrendChart sessions={sessions} metricPath="metrics.avg_cadence_spm" label="Cadence (spm)" color="#8b5cf6" unit=" spm" />
      </div>
    </div>
  );
}
