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
      .then((data) => { setAthlete(data); setSessionKey(ALL_RUNS_KEY); })
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

  const byCategory = (cats) => insights.filter((i) =>
    cats.includes(i.category) && i.severity !== "narrative"
  );

  const tabs = [
    { id: "overview", label: "Overview",
      content: <OverviewTab session={currentSession} metrics={m}
        insights={byCategory(["biomechanics", "asymmetry"])}
        isAllRuns={isAllRuns} athlete={athlete} /> },
    { id: "biomechanics", label: "Biomechanics",
      content: <BiomechanicsTab session={currentSession}
        insights={byCategory(["biomechanics", "asymmetry"])} sessions={athlete.sessions} /> },
    { id: "speed", label: "Speed Zones",
      content: <SpeedZonesTab session={currentSession} insights={byCategory(["speed"])} /> },
    { id: "fatigue", label: "Fatigue",
      content: <FatigueTab session={currentSession} insights={byCategory(["fatigue"])}
        sessions={athlete.sessions} isAllRuns={isAllRuns} /> },
    { id: "trends", label: "Trends",
      content: <TrendsTab sessions={athlete.sessions} insights={byCategory(["trends"])} /> },
    { id: "coaching", label: "Coaching",
      content: <CoachingTab insights={byCategory(["coaching"])} athlete={athlete} /> },
  ];

  const headlineInsights = insights
    .filter((i) => i.severity === "action" || i.severity === "notable")
    .slice(0, 2);

  return (
    <div className="athlete-page">
      <div className="athlete-hero">
        <div className="hero-content">
          <h1 className="athlete-name">{athlete.name}</h1>
          <p className="athlete-subtitle">Biomechanical Profile & Multi-Session Analysis</p>
          <div className="hero-stats">
            <HeroStat value={athlete.total_strides.toLocaleString()} label="Total Strides" />
            <HeroStat value={athlete.session_count} label="Sessions" />
            <HeroStat value={athlete.aggregate?.metrics?.avg_speed_mps?.toFixed(2)} label="Avg Speed" unit="m/s" />
            <HeroStat value={athlete.aggregate?.metrics?.avg_gct_ms?.toFixed(0)} label="Avg GCT" unit="ms" />
          </div>
          <p className="hero-meta">
            {athlete.date_range.first} &rarr; {athlete.date_range.last}
          </p>
        </div>
      </div>

      {headlineInsights.length > 0 && (
        <div className="headline-insights">
          {headlineInsights.map((ins, i) => <InsightCard key={i} insight={ins} />)}
        </div>
      )}

      <div className="session-selector">
        <div className="session-pills">
          <button className={`pill pill-all ${isAllRuns ? "active" : ""}`}
            onClick={() => setSessionKey(ALL_RUNS_KEY)}>
            ALL RUNS
            <span className="pill-sub">{athlete.total_strides.toLocaleString()} strides</span>
          </button>
          {athlete.sessions.map((s) => (
            <button key={s.date + s.label}
              className={`pill ${sessionKey === s.date + s.label ? "active" : ""}`}
              onClick={() => setSessionKey(s.date + s.label)}>
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
        {value ?? "—"}{unit && <span className="hero-stat-unit">{unit}</span>}
      </div>
      <div className="hero-stat-label">{label}</div>
    </div>
  );
}

function SectionHeader({ number, title }) {
  return (
    <div className="section-header">
      <span className="section-num">{number}</span>
      <h3 className="section-title">{title}</h3>
    </div>
  );
}

function Narrative({ children }) {
  return <p className="narrative">{children}</p>;
}

export function InsightCard({ insight }) {
  const colorClass = insight.color ? `color-${insight.color}` : "";
  return (
    <div className={`insight-card severity-${insight.severity} ${colorClass}`}>
      <div className="insight-badge">{insight.category}</div>
      <div className="insight-title">{insight.title}</div>
      <div className="insight-text">{insight.text}</div>
    </div>
  );
}

function InsightStack({ insights, limit }) {
  if (!insights || insights.length === 0) return null;
  const shown = limit ? insights.slice(0, limit) : insights;
  return (
    <div className="insight-stack">
      {shown.map((ins, i) => <InsightCard key={i} insight={ins} />)}
    </div>
  );
}

// ---- OVERVIEW TAB ----
function OverviewTab({ session, metrics, insights, isAllRuns, athlete }) {
  if (!session || !metrics) return null;
  const mm = metrics;
  return (
    <>
      <SectionHeader number={1} title={isAllRuns ? "Biomechanical Baseline — All Sessions" : `Session Metrics — ${session.date}`} />
      <Narrative>
        {isAllRuns
          ? `Aggregated metrics across ${athlete.session_count} sessions and ${athlete.total_strides.toLocaleString()} strides provide the most statistically robust view of this athlete's biomechanical signature. These numbers represent the central tendency of the full dataset — individual sessions may vary based on pace, fatigue, and conditions.`
          : `Session-level metrics for ${session.date} with ${session.n_strides} strides (${session.n_left} left, ${session.n_right} right). Compare against the "All Runs" aggregate to see how this session deviates from the overall profile.`}
      </Narrative>

      <div className="metric-grid">
        <MetricCard label="Avg Speed" value={mm.avg_speed_mps?.toFixed(2)} unit="m/s" color="var(--accent)" />
        <MetricCard label="Max Speed" value={mm.max_speed_mps?.toFixed(2)} unit="m/s" />
        <MetricCard label="Avg GCT" value={mm.avg_gct_ms?.toFixed(0)} unit="ms" color="var(--green)" />
        <MetricCard label="GCT Std Dev" value={mm.std_gct_ms?.toFixed(0)} unit="ms" />
        <MetricCard label="Avg Stride" value={mm.avg_stride_len_m?.toFixed(2)} unit="m" />
        <MetricCard label="Cadence" value={mm.avg_cadence_spm?.toFixed(0)} unit="spm" />
        <MetricCard label="Avg vGRF" value={mm.avg_vgrf_bw?.toFixed(2)} unit="BW" color="var(--amber)" />
        <MetricCard label="Peak vGRF" value={mm.avg_vgrf_peak_bw?.toFixed(2)} unit="BW" />
        <MetricCard label="FSA" value={mm.avg_fsa_deg?.toFixed(1)} unit="°" />
      </div>

      <InsightStack insights={insights} limit={3} />

      {session.time_series && session.time_series.speed?.length > 0 && (
        <>
          <SectionHeader number={2} title="Session Timeline" />
          <Narrative>
            Real-time biomechanical data plotted through the session. Watch for GCT creeping upward while speed holds steady — the signature of neuromuscular fatigue. Cadence and loading patterns reveal how the body manages effort distribution.
          </Narrative>
          <div className="card">
            <SessionChart timeSeries={session.time_series} metrics={["speed", "gct"]} height={220} />
          </div>
          <div className="card" style={{ marginTop: "0.5rem" }}>
            <SessionChart timeSeries={session.time_series} metrics={["cadence", "vgrf"]} height={220} />
          </div>
        </>
      )}
    </>
  );
}

// ---- BIOMECHANICS TAB ----
function BiomechanicsTab({ session, insights, sessions }) {
  if (!session) return null;
  return (
    <>
      <SectionHeader number={1} title="Bilateral Comparison — Left vs Right" />
      <Narrative>
        The full metric breakdown compares left and right foot mechanics across every measured variable. Assessment thresholds are based on population-level research: "Excellent" indicates differences within the measurement noise floor, "Normal" within typical athletic variation, and "Monitor" exceeding thresholds where intervention may improve performance or reduce injury risk.
      </Narrative>
      <div className="card">
        <BilateralTable bilateral={session.bilateral} />
      </div>

      <SectionHeader number={2} title="Asymmetry Visualization" />
      <Narrative>
        Percentage differences between left and right feet across key metrics. Values near zero indicate symmetry. Color coding reflects severity: green for excellent, amber for watch-worthy, red for actionable differences.
      </Narrative>
      <div className="card">
        <AsymmetryBar leftSummary={session.left_summary} rightSummary={session.right_summary} height={220} />
      </div>

      <InsightStack insights={insights} />

      <SectionHeader number={3} title="Per-Side Profile" />
      <Narrative>
        Individual foot profiles with mean values and standard deviations. The standard deviation reveals consistency — a low std means the foot behaves predictably stride to stride, while high variability may indicate terrain adaptation or neuromuscular inconsistency.
      </Narrative>
      <div className="side-compare">
        <SideCard title="Left Foot" summary={session.left_summary} count={session.n_left} color="var(--accent)" />
        <SideCard title="Right Foot" summary={session.right_summary} count={session.n_right} color="var(--amber)" />
      </div>

      {sessions.length > 1 && (
        <>
          <SectionHeader number={4} title="Asymmetry Across Sessions" />
          <Narrative>
            Tracking how bilateral asymmetry changes across sessions reveals whether the pattern is stable (structural) or variable (possibly fatigue- or context-dependent). Consistent asymmetry is generally more benign than volatile asymmetry.
          </Narrative>
          <div className="session-asym-table card">
            <table className="athlete-table compact">
              <thead>
                <tr><th>Session</th><th>Strides</th><th>GCT Asym</th><th>Stride Asym</th><th>FSA Asym</th></tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.date + s.label}>
                    <td>{s.date}</td>
                    <td>{s.n_strides}</td>
                    <td style={{ color: asym_color(s.asymmetry?.gct_ms), fontWeight: 600 }}>
                      {s.asymmetry?.gct_ms != null ? `${s.asymmetry.gct_ms.toFixed(1)} ms` : "—"}
                    </td>
                    <td>{s.asymmetry?.stride_len_m != null ? `${s.asymmetry.stride_len_m.toFixed(3)} m` : "—"}</td>
                    <td>{s.asymmetry?.fsa_deg != null ? `${s.asymmetry.fsa_deg.toFixed(1)}°` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

function asym_color(v) {
  if (v == null) return undefined;
  const a = Math.abs(v);
  return a < 5 ? "var(--green)" : a < 10 ? "var(--amber)" : "var(--red)";
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
        {value ?? "—"}<span className="side-unit"> {unit}</span>
        {std && <span className="side-std"> ± {std}</span>}
      </div>
    </div>
  );
}

// ---- SPEED ZONES TAB ----
function SpeedZonesTab({ session, insights }) {
  if (!session) return null;
  return (
    <>
      <SectionHeader number={1} title="Speed-Mechanics Coupling" />
      <Narrative>
        How mechanics change across speed zones reveals the relationship between pace and biomechanical output. As speed increases, expect GCT to shorten, forces to increase, and foot strike angle to shift forward. The rate of these changes reveals individual mechanical signatures — how efficiently the body scales movement with speed demands. This is the biomechanical equivalent of a car's torque curve.
      </Narrative>
      <div className="card">
        <SpeedZonesTable zones={session.speed_zones} />
      </div>
      <InsightStack insights={insights} />
    </>
  );
}

// ---- FATIGUE TAB ----
function FatigueTab({ session, insights, sessions, isAllRuns }) {
  if (!session) return null;
  return (
    <>
      <SectionHeader number={1} title="Fatigue Detection — Within-Session Drift" />
      <Narrative>
        Comparing the first quarter (fresh) vs the last quarter (fatigued) of each session detects biomechanical degradation. When GCT creeps upward while speed holds steady, the neuromuscular system is compensating — spending more time on the ground because the muscles can no longer generate the same force in the same timeframe. The combination of GCT drift and asymmetry drift tells the complete fatigue story.
      </Narrative>
      <div className="card">
        <FatiguePanel fatigue={session.fatigue} />
      </div>

      <InsightStack insights={insights} />

      {session.time_series && session.time_series.speed?.length > 0 && (
        <>
          <SectionHeader number={2} title="Full Session Timeline" />
          <Narrative>
            The full timeline of speed and ground contact time through the session. Watch for the divergence pattern: speed holding steady while GCT gradually increases — this is the visual signature of neuromuscular fatigue taking hold.
          </Narrative>
          <div className="card">
            <SessionChart timeSeries={session.time_series} metrics={["speed", "gct"]} height={260} />
          </div>
        </>
      )}

      {isAllRuns && sessions.length > 1 && (
        <>
          <SectionHeader number={3} title="Per-Session Fatigue Breakdown" />
          <Narrative>
            Each session's fatigue signature individually. Different session types produce different fatigue patterns — tempo runs may show minimal GCT drift but significant cardiac drift, while long easy runs may show the opposite.
          </Narrative>
          {sessions.map((s) => s.fatigue && (
            <div key={s.date + s.label} className="per-session-fatigue">
              <h4 className="psf-title">
                {s.date} — {s.n_strides} strides
              </h4>
              <div className="psf-cards">
                <FatigueMini label="GCT Drift" data={s.fatigue.gct_ms} />
                <FatigueMini label="vGRF Drift" data={s.fatigue.vgrf_bw} />
                <FatigueMini label="Speed Drift" data={s.fatigue.speed_mps} />
              </div>
              {s.fatigue.asymmetry_drift && (
                <div className="insight-card severity-info compact" style={{ marginTop: "0.35rem" }}>
                  <div className="insight-text">
                    <strong>Asymmetry drift:</strong> GCT asymmetry shifted from {Math.abs(s.fatigue.asymmetry_drift.gct_first_q).toFixed(1)}ms to {Math.abs(s.fatigue.asymmetry_drift.gct_last_q).toFixed(1)}ms.
                    {Math.abs(s.fatigue.asymmetry_drift.gct_last_q) > Math.abs(s.fatigue.asymmetry_drift.gct_first_q) + 2
                      ? " Asymmetry increased with fatigue — a signal to monitor."
                      : " Asymmetry remained stable through fatigue — good bilateral resilience."}
                  </div>
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </>
  );
}

function FatigueMini({ label, data }) {
  if (!data) return null;
  const pct = data.pct_change;
  const severity = Math.abs(pct) < 3 ? "stable" : pct > 0 ? "drifting" : "improving";
  const color = severity === "stable" ? "var(--green)" : severity === "drifting" ? "var(--red)" : "var(--green)";
  return (
    <div className="fatigue-mini">
      <div className="fm-label">{label}</div>
      <div className="fm-value" style={{ color }}>{pct > 0 ? "+" : ""}{pct.toFixed(1)}%</div>
      <div className="fm-detail">{data.first_q?.toFixed(1)} → {data.last_q?.toFixed(1)}</div>
    </div>
  );
}

// ---- TRENDS TAB ----
function TrendsTab({ sessions, insights }) {
  if (!sessions || sessions.length < 2)
    return <p className="narrative">Need 2+ sessions for trend analysis.</p>;
  return (
    <>
      <SectionHeader number={1} title="Cross-Session Progression" />
      <Narrative>
        Tracking key metrics across sessions reveals training adaptation, fatigue accumulation, or changes in running conditions. Upward trends in speed with stable or improving GCT suggest genuine fitness gains. Rising GCT without speed increases may signal accumulated fatigue or detraining.
      </Narrative>
      <InsightStack insights={insights} />
      <div className="trends-grid">
        <div className="card"><TrendChart sessions={sessions} metricPath="metrics.avg_speed_mps" label="Avg Speed (m/s)" color="var(--accent)" unit=" m/s" /></div>
        <div className="card"><TrendChart sessions={sessions} metricPath="metrics.avg_gct_ms" label="Avg GCT (ms)" color="var(--green)" unit=" ms" /></div>
        <div className="card"><TrendChart sessions={sessions} metricPath="metrics.avg_stride_len_m" label="Stride Length (m)" color="#22d3ee" unit=" m" /></div>
        <div className="card"><TrendChart sessions={sessions} metricPath="metrics.avg_vgrf_peak_bw" label="Peak vGRF (BW)" color="var(--amber)" unit=" BW" /></div>
        <div className="card"><TrendChart sessions={sessions} metricPath="asymmetry.gct_ms" label="GCT Asymmetry L-R (ms)" color="var(--red)" unit=" ms" /></div>
        <div className="card"><TrendChart sessions={sessions} metricPath="metrics.avg_cadence_spm" label="Cadence (spm)" color="#a78bfa" unit=" spm" /></div>
      </div>
    </>
  );
}

// ---- COACHING TAB ----
function CoachingTab({ insights, athlete }) {
  const strengths = insights.filter((i) => i.title.startsWith("Strength:"));
  const monitors = insights.filter((i) => i.title.startsWith("Monitor:"));
  const develops = insights.filter((i) => i.title.startsWith("Develop:"));
  const nexts = insights.filter((i) => i.title.startsWith("Next:"));
  const other = insights.filter((i) =>
    !i.title.startsWith("Strength:") && !i.title.startsWith("Monitor:") &&
    !i.title.startsWith("Develop:") && !i.title.startsWith("Next:")
  );

  return (
    <>
      <SectionHeader number={1} title={`Coaching Recommendations for ${athlete.name}`} />
      <Narrative>
        Based on the full biomechanical profile across {athlete.session_count} sessions and {athlete.total_strides.toLocaleString()} strides. Recommendations are categorized as strengths to maintain, areas to monitor, and development opportunities.
      </Narrative>

      {strengths.length > 0 && (
        <>
          <h4 className="coaching-category-title">Strengths</h4>
          <div className="coaching-grid">
            {strengths.map((ins, i) => <CoachingCard key={i} insight={ins} variant="strength" />)}
          </div>
        </>
      )}

      {monitors.length > 0 && (
        <>
          <h4 className="coaching-category-title">Monitor</h4>
          <div className="coaching-grid">
            {monitors.map((ins, i) => <CoachingCard key={i} insight={ins} variant="monitor" />)}
          </div>
        </>
      )}

      {develops.length > 0 && (
        <>
          <h4 className="coaching-category-title">Develop</h4>
          <div className="coaching-grid">
            {develops.map((ins, i) => <CoachingCard key={i} insight={ins} variant="develop" />)}
          </div>
        </>
      )}

      {nexts.length > 0 && (
        <>
          <h4 className="coaching-category-title">Next Steps</h4>
          <div className="coaching-grid">
            {nexts.map((ins, i) => <CoachingCard key={i} insight={ins} variant="next" />)}
          </div>
        </>
      )}

      {other.length > 0 && <InsightStack insights={other} />}
    </>
  );
}

function CoachingCard({ insight, variant }) {
  return (
    <div className={`coaching-card variant-${variant}`}>
      <h4 className="cc-title">{insight.title.replace(/^(Strength|Monitor|Develop|Next): /, "")}</h4>
      <p className="cc-text">{insight.text}</p>
    </div>
  );
}
