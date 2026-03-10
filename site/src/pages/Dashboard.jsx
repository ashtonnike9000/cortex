import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchSummary } from "../api";
import "./Dashboard.css";

const STATUS_CONFIG = {
  on_track: { label: "ON TRACK", color: "var(--green)", bg: "var(--green-dim)" },
  watch: { label: "WATCH", color: "var(--amber)", bg: "var(--amber-dim)" },
  check_in: { label: "CHECK IN", color: "var(--red)", bg: "var(--red-dim)" },
};

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary().then(setSummary).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="dash-loading">Loading...</div>;
  if (!summary) return <div className="dash-loading">No data available</div>;

  const f = summary.fleet;
  const athletes = summary.athletes || [];
  const synthesis = summary.synthesis || [];
  const fleetWatch = summary.fleet_watch_list || [];

  const needsAttention = athletes.filter(a => a.status?.level !== "on_track");
  const onTrack = athletes.filter(a => a.status?.level === "on_track" || !a.status);

  return (
    <div className="dashboard">
      <div className="dash-hero">
        <h1 className="dash-title">RUNNING INTELLIGENCE</h1>
        <p className="dash-subtitle">Coach view — attention-first</p>
      </div>

      {/* Fleet Overview */}
      <div className="fleet-bar">
        <FleetStat value={f.total_athletes} label="Athletes" />
        <FleetStat value={f.total_sessions} label="Sessions" />
        <FleetStat value={f.total_strides?.toLocaleString()} label="Total Strides" />
        <FleetStat value={f.avg_gct_ms?.toFixed(0)} label="Pack GCT" unit="ms" />
        <FleetStat value={f.avg_speed_mps?.toFixed(2)} label="Pack Speed" unit="m/s" />
      </div>

      {/* Needs Attention */}
      {needsAttention.length > 0 && (
        <section className="dash-section">
          <h2 className="dash-section-title">
            <span className="attention-dot" />
            Needs Attention
            <span className="dash-section-count">{needsAttention.length}</span>
          </h2>
          <div className="athlete-cards">
            {needsAttention.map(a => <AthleteCard key={a.id} athlete={a} />)}
          </div>
        </section>
      )}

      {/* On Track */}
      {onTrack.length > 0 && (
        <section className="dash-section">
          <h2 className="dash-section-title">
            <span className="ok-dot" />
            {needsAttention.length > 0 ? "On Track" : "All Athletes"}
            <span className="dash-section-count">{onTrack.length}</span>
          </h2>
          <div className="athlete-cards">
            {onTrack.map(a => <AthleteCard key={a.id} athlete={a} />)}
          </div>
        </section>
      )}

      {/* Fleet Watch List */}
      {fleetWatch.length > 0 && (
        <section className="dash-section">
          <h2 className="dash-section-title">
            <span className="attention-dot" />
            Pack Watch List
            <span className="dash-section-count">{fleetWatch.length}</span>
          </h2>
          <div className="fleet-watch-items">
            {fleetWatch.map((item, i) => (
              <Link key={i} to={`/athlete/${item.athlete_id}`} className="fw-item">
                <div className="fw-top">
                  <span className="fw-athlete">{item.athlete}</span>
                  <span className={`fw-sev fw-sev-${item.severity}`}>{item.severity}</span>
                </div>
                <div className="fw-title">{item.title}</div>
                <div className="fw-detail">{item.detail}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Fleet Synthesis */}
      {synthesis.length > 0 && (
        <FleetSynthesis synthesis={synthesis} />
      )}
    </div>
  );
}

function AthleteCard({ athlete }) {
  const a = athlete;
  const status = a.status || {};
  const cfg = STATUS_CONFIG[status.level] || STATUS_CONFIG.on_track;

  return (
    <Link to={`/athlete/${a.id}`} className="athlete-card">
      <div className="ac-top">
        <div className="ac-avatar">{a.name?.[0]}</div>
        <div className="ac-info">
          <div className="ac-name">{a.name}</div>
          <div className="ac-meta">
            {a.session_count} sessions · {a.total_strides?.toLocaleString()} strides
          </div>
        </div>
        <div className="ac-status-badge" style={{ background: cfg.bg, color: cfg.color }}>
          {cfg.label}
        </div>
      </div>

      <div className="ac-headline">{status.headline || "No data"}</div>

      {status.details?.length > 0 && (
        <div className="ac-details">
          {status.details.slice(0, 2).map((d, i) => (
            <span key={i} className="ac-detail">{d}</span>
          ))}
        </div>
      )}

      <div className="ac-metrics">
        <AcMetric label="Speed" value={a.avg_speed_mps?.toFixed(2)} unit="m/s" />
        <AcMetric label="GCT" value={a.avg_gct_ms?.toFixed(0)} unit="ms" />
        <AcMetric label="Stride" value={a.avg_stride_len_m?.toFixed(2)} unit="m" />
        <AcMetric label="Distance" value={a.total_distance_mi?.toFixed(1)} unit="mi" />
        <AcMetric label="Load" value={a.total_load?.toFixed(0)} />
      </div>

      {(a.alert_count > 0 || a.watch_count > 0) && (
        <div className="ac-flags">
          {a.alert_count > 0 && <span className="ac-flag alert">{a.alert_count} alerts</span>}
          {a.watch_count > 0 && <span className="ac-flag watch">{a.watch_count} watch</span>}
        </div>
      )}
    </Link>
  );
}

function AcMetric({ label, value, unit, highlight }) {
  return (
    <div className={`ac-metric ${highlight ? "highlight" : ""}`}>
      <span className="acm-label">{label}</span>
      <span className="acm-value">
        {value ?? "—"}{value != null && <span className="acm-unit">{unit}</span>}
      </span>
    </div>
  );
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

const CATEGORY_CONFIG = {
  efficiency: { label: "Efficiency", color: "var(--accent)" },
  mechanics: { label: "Mechanics", color: "var(--cyan)" },
  asymmetry: { label: "Asymmetry", color: "var(--amber)" },
  pattern: { label: "Shared Pattern", color: "var(--red)" },
  fleet: { label: "Pack", color: "var(--text-muted)" },
  training: { label: "Training", color: "var(--green)" },
};

function FleetSynthesis({ synthesis }) {
  const grouped = {};
  for (const s of synthesis) {
    const cat = s.category || "fleet";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(s);
  }

  const categoryOrder = ["pattern", "efficiency", "asymmetry", "mechanics", "training", "fleet"];
  const sortedCategories = categoryOrder.filter(c => grouped[c]);

  return (
    <section className="dash-section synthesis-section">
      <h2 className="dash-section-title">
        <span className="synthesis-dot" />
        Pack Synthesis
        <span className="dash-section-count">{synthesis.length} insights</span>
      </h2>
      <p className="synthesis-desc">
        Cross-athlete patterns and relationships. These insights emerge from comparing
        runners at the same pace, tracking shared deviations, and analyzing mechanical profiles
        across the pack. They become richer with more athletes and more sessions.
      </p>

      {sortedCategories.map(cat => {
        const items = grouped[cat];
        const cfg = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.fleet;
        return (
          <div key={cat} className="synthesis-group">
            <div className="sg-header">
              <span className="sg-dot" style={{ background: cfg.color }} />
              <span className="sg-label">{cfg.label}</span>
              <span className="sg-count">{items.length}</span>
            </div>
            <div className="synthesis-cards">
              {items.map((s, i) => (
                <SynthesisCard key={i} insight={s} cfg={cfg} />
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}

function SynthesisCard({ insight, cfg }) {
  const s = insight;
  return (
    <div className={`synthesis-card sev-${s.severity || "info"}`}>
      <div className="sc-header">
        <span className="sc-title">{s.title}</span>
        {s.zone && <span className="sc-zone">{s.zone}</span>}
      </div>
      <p className="sc-text">{s.text}</p>
      {s.athletes && s.athletes.length > 0 && (
        <div className="sc-athletes">
          {s.athletes.map(name => (
            <span key={name} className="sc-athlete-tag">{name}</span>
          ))}
        </div>
      )}
      {s.data && (
        <div className="sc-data">
          {Object.entries(s.data).map(([name, vals]) => (
            <div key={name} className="sc-data-row">
              <span className="sc-data-name">{name}</span>
              {vals.gct != null && <span className="sc-data-val">GCT {vals.gct.toFixed(0)}ms</span>}
              {vals.stride != null && <span className="sc-data-val">Stride {vals.stride.toFixed(2)}m</span>}
              {vals.cadence != null && <span className="sc-data-val">Cad {vals.cadence.toFixed(0)}spm</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
