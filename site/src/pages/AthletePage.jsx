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

const ALL_RUNS_KEY = "__ALL_RUNS__";

export default function AthletePage() {
  const { id } = useParams();
  const [athlete, setAthlete] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sessionKey, setSessionKey] = useState(ALL_RUNS_KEY);

  useEffect(() => {
    setLoading(true);
    fetchAthlete(id)
      .then((data) => {
        setAthlete(data);
        setSessionKey(ALL_RUNS_KEY);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!athlete) return <div className="error">Athlete not found</div>;

  const isAllRuns = sessionKey === ALL_RUNS_KEY;
  const currentSession = isAllRuns
    ? athlete.aggregate
    : athlete.sessions.find((s) => s.date + s.label === sessionKey);

  const m = currentSession?.metrics;
  const insights = athlete.insights || [];
  const headlineInsights = insights.slice(0, 2);

  const tabInsights = (category) =>
    insights.filter((i) => i.category === category || (category === "overview" && i.severity === "action"));

  const tabs = [
    {
      id: "overview",
      label: "Overview",
      content: (
        <OverviewTab
          session={currentSession}
          metrics={m}
          insights={tabInsights("overview")}
          isAllRuns={isAllRuns}
          totalStrides={athlete.total_strides}
          sessionCount={athlete.session_count}
        />
      ),
    },
    {
      id: "biomechanics",
      label: "Biomechanics",
      content: <BiomechanicsTab session={currentSession} insights={[...tabInsights("biomechanics"), ...tabInsights("asymmetry")]} />,
    },
    {
      id: "speed",
      label: "Speed Zones",
      content: <SpeedZonesTab session={currentSession} insights={tabInsights("speed")} />,
    },
    {
      id: "fatigue",
      label: "Fatigue",
      content: <FatigueTab session={currentSession} insights={tabInsights("fatigue")} />,
    },
    {
      id: "trends",
      label: "Trends",
      content: <TrendsTab sessions={athlete.sessions} insights={tabInsights("trends")} />,
    },
  ];

  return (
    <div className="athlete-page">
      <div className="athlete-hero">
        <div className="hero-content">
          <div className="hero-top">
            <div>
              <h1 className="athlete-name">{athlete.name}</h1>
              <p className="athlete-meta">
                {athlete.session_count} sessions &middot;{" "}
                {athlete.total_strides.toLocaleString()} strides &middot;{" "}
                {athlete.date_range.first} &rarr; {athlete.date_range.last}
              </p>
            </div>
          </div>

          <div className="hero-stats">
            <HeroStat value={athlete.total_strides.toLocaleString()} label="Total Strides" />
            <HeroStat value={athlete.session_count} label="Sessions" />
            <HeroStat
              value={athlete.aggregate?.metrics?.avg_speed_mps?.toFixed(2)}
              label="Lifetime Speed"
              unit="m/s"
            />
            <HeroStat
              value={athlete.aggregate?.metrics?.avg_gct_ms?.toFixed(0)}
              label="Lifetime GCT"
              unit="ms"
            />
          </div>

          {headlineInsights.length > 0 && (
            <div className="hero-insights">
              {headlineInsights.map((ins, i) => (
                <InsightCard key={i} insight={ins} compact />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="session-selector">
        <div className="session-pills">
          <button
            className={`pill pill-all ${isAllRuns ? "active" : ""}`}
            onClick={() => setSessionKey(ALL_RUNS_KEY)}
          >
            ALL RUNS
            <span className="pill-sub">{athlete.total_strides.toLocaleString()} strides</span>
          </button>
          {athlete.sessions.map((s) => (
            <button
              key={s.date + s.label}
              className={`pill ${sessionKey === s.date + s.label ? "active" : ""}`}
              onClick={() => setSessionKey(s.date + s.label)}
            >
              {s.date}
              <span className="pill-sub">{s.n_strides} strides</span>
            </button>
          ))}
        </div>
      </div>

      {currentSession && <Tabs tabs={tabs} />}
    </div>
  );
}

function HeroStat({ value, label, unit }) {
  return (
    <div className="hero-stat">
      <div className="hero-stat-value">
        {value ?? "—"}
        {unit && <span className="hero-stat-unit">{unit}</span>}
      </div>
      <div className="hero-stat-label">{label}</div>
    </div>
  );
}

export function InsightCard({ insight, compact }) {
  return (
    <div className={`insight-card severity-${insight.severity} ${compact ? "compact" : ""}`}>
      <div className="insight-badge">{insight.category}</div>
      <div className="insight-title">{insight.title}</div>
      {!compact && <div className="insight-text">{insight.text}</div>}
    </div>
  );
}

function InsightStack({ insights }) {
  if (!insights || insights.length === 0) return null;
  return (
    <div className="insight-stack">
      {insights.map((ins, i) => (
        <InsightCard key={i} insight={ins} />
      ))}
    </div>
  );
}

function OverviewTab({ session, metrics, insights, isAllRuns, totalStrides, sessionCount }) {
  if (!session || !metrics) return null;
  const m = metrics;
  return (
    <>
      {isAllRuns && (
        <div className="all-runs-banner">
          Aggregate view across {sessionCount} sessions and {totalStrides?.toLocaleString()} strides
        </div>
      )}
      <InsightStack insights={insights} />
      <div className="metric-grid" style={{ marginTop: "1rem" }}>
        <MetricCard label="Avg Speed" value={m.avg_speed_mps?.toFixed(2)} unit="m/s" color="var(--accent)" />
        <MetricCard label="Max Speed" value={m.max_speed_mps?.toFixed(2)} unit="m/s" />
        <MetricCard label="Avg GCT" value={m.avg_gct_ms?.toFixed(0)} unit="ms" color="var(--green)" />
        <MetricCard label="GCT Std Dev" value={m.std_gct_ms?.toFixed(0)} unit="ms" />
        <MetricCard label="Avg Stride" value={m.avg_stride_len_m?.toFixed(2)} unit="m" />
        <MetricCard label="Cadence" value={m.avg_cadence_spm?.toFixed(0)} unit="spm" />
        <MetricCard label="Avg vGRF" value={m.avg_vgrf_bw?.toFixed(2)} unit="BW" color="var(--amber)" />
        <MetricCard label="Peak vGRF" value={m.avg_vgrf_peak_bw?.toFixed(2)} unit="BW" />
        <MetricCard label="FSA" value={m.avg_fsa_deg?.toFixed(1)} unit="°" />
      </div>
      {session.time_series && (
        <>
          <div style={{ marginTop: "1.5rem" }}>
            <div className="section-label">Speed & Ground Contact</div>
            <div className="card">
              <SessionChart timeSeries={session.time_series} metrics={["speed", "gct"]} height={220} />
            </div>
          </div>
          <div style={{ marginTop: "1rem" }}>
            <div className="section-label">Cadence & Loading</div>
            <div className="card">
              <SessionChart timeSeries={session.time_series} metrics={["cadence", "vgrf"]} height={220} />
            </div>
          </div>
        </>
      )}
    </>
  );
}

function BiomechanicsTab({ session, insights }) {
  if (!session) return null;
  return (
    <>
      <InsightStack insights={insights} />
      <div className="section-label" style={{ marginTop: "1rem" }}>Bilateral Comparison</div>
      <div className="card">
        <BilateralTable bilateral={session.bilateral} />
      </div>
      <div style={{ marginTop: "1.5rem" }}>
        <div className="section-label">Asymmetry Visualization</div>
        <div className="card">
          <AsymmetryBar leftSummary={session.left_summary} rightSummary={session.right_summary} height={220} />
        </div>
      </div>
      <div style={{ marginTop: "1.5rem" }}>
        <div className="section-label">Per-Side Summary</div>
        <div className="side-compare">
          <SideCard title="Left Foot" summary={session.left_summary} count={session.n_left} color="var(--accent)" />
          <SideCard title="Right Foot" summary={session.right_summary} count={session.n_right} color="var(--amber)" />
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
        <span className="side-unit"> {unit}</span>
        {std && <span className="side-std"> ± {std}</span>}
      </div>
    </div>
  );
}

function SpeedZonesTab({ session, insights }) {
  if (!session) return null;
  return (
    <>
      <InsightStack insights={insights} />
      <div className="card" style={{ marginTop: "1rem" }}>
        <SpeedZonesTable zones={session.speed_zones} />
      </div>
    </>
  );
}

function FatigueTab({ session, insights }) {
  if (!session) return null;
  return (
    <>
      <InsightStack insights={insights} />
      <div className="section-label" style={{ marginTop: "1rem" }}>Fatigue Detection</div>
      <div className="card">
        <FatiguePanel fatigue={session.fatigue} />
      </div>
      {session.time_series && (
        <div style={{ marginTop: "1.5rem" }}>
          <div className="section-label">Session Timeline</div>
          <div className="card">
            <SessionChart timeSeries={session.time_series} metrics={["speed", "gct"]} height={240} />
          </div>
        </div>
      )}
    </>
  );
}

function TrendsTab({ sessions, insights }) {
  if (!sessions || sessions.length < 2)
    return <p style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>Need 2+ sessions for trend analysis.</p>;

  return (
    <>
      <InsightStack insights={insights} />
      <div className="trends-grid" style={{ marginTop: "1rem" }}>
        <div className="card">
          <TrendChart sessions={sessions} metricPath="metrics.avg_speed_mps" label="Avg Speed (m/s)" color="var(--accent)" unit=" m/s" />
        </div>
        <div className="card">
          <TrendChart sessions={sessions} metricPath="metrics.avg_gct_ms" label="Avg GCT (ms)" color="var(--green)" unit=" ms" />
        </div>
        <div className="card">
          <TrendChart sessions={sessions} metricPath="metrics.avg_stride_len_m" label="Stride Length (m)" color="#22d3ee" unit=" m" />
        </div>
        <div className="card">
          <TrendChart sessions={sessions} metricPath="metrics.avg_vgrf_peak_bw" label="Peak vGRF (BW)" color="var(--amber)" unit=" BW" />
        </div>
        <div className="card">
          <TrendChart sessions={sessions} metricPath="asymmetry.gct_ms" label="GCT Asymmetry L-R (ms)" color="var(--red)" unit=" ms" />
        </div>
        <div className="card">
          <TrendChart sessions={sessions} metricPath="metrics.avg_cadence_spm" label="Cadence (spm)" color="#a78bfa" unit=" spm" />
        </div>
      </div>
    </>
  );
}
