import { useEffect, useState, useMemo, useCallback, createContext, useContext } from "react";
import { useParams } from "react-router-dom";
import { fetchAthlete } from "../api";
import InteractiveSessionChart from "../components/charts/InteractiveSessionChart";
import SessionOverlayChart from "../components/charts/SessionOverlayChart";
import MileSplitsChart from "../components/charts/MileSplitsChart";
import TrendPlot from "../components/charts/TrendPlot";
import LoadChart from "../components/charts/LoadChart";
import BilateralTable from "../components/charts/BilateralTable";
import SpeedZonesTable from "../components/charts/SpeedZonesTable";
import FatiguePanel from "../components/charts/FatiguePanel";
import "./AthletePage.css";

const STATUS_CONFIG = {
  on_track: { label: "ON TRACK", color: "var(--green)", bg: "var(--green-dim)", icon: "●" },
  watch: { label: "WATCH", color: "var(--amber)", bg: "var(--amber-dim)", icon: "◐" },
  check_in: { label: "CHECK IN", color: "var(--red)", bg: "var(--red-dim)", icon: "◉" },
};

const UnitCtx = createContext("mps");

function mpsToMph(mps) { return mps * 2.23694; }
function mpsToMinPerMile(mps) {
  if (!mps || mps <= 0) return null;
  const totalMin = 26.8224 / mps;
  const mins = Math.floor(totalMin);
  const secs = Math.round((totalMin - mins) * 60);
  if (secs === 60) return `${mins + 1}:00`;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
function formatSpeed(mps, unit) {
  if (mps == null) return "—";
  return unit === "mph" ? mpsToMph(mps).toFixed(1) : mps.toFixed(2);
}
function speedUnit(unit) { return unit === "mph" ? "mph" : "m/s"; }
function paceTag(mps) {
  const p = mpsToMinPerMile(mps);
  return p ? `${p}/mi` : null;
}

export default function AthletePage() {
  const { id } = useParams();
  const [athlete, setAthlete] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unit, setUnit] = useState("mps");

  useEffect(() => {
    setLoading(true);
    fetchAthlete(id)
      .then(setAthlete)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!athlete) return <div className="error">Athlete not found</div>;

  return (
    <UnitCtx.Provider value={unit}>
      <div className="unit-toggle-bar">
        <button className="unit-toggle" onClick={() => setUnit((u) => (u === "mps" ? "mph" : "mps"))}>
          <span className={unit === "mps" ? "ut-active" : ""}>m/s</span>
          <span className="ut-sep">/</span>
          <span className={unit === "mph" ? "ut-active" : ""}>mph</span>
        </button>
      </div>
      <div className="athlete-page">
        <StatusBanner athlete={athlete} />
        <WatchList athlete={athlete} />
        <RacePredictions athlete={athlete} />
        <SessionExplorer athlete={athlete} />
        <FatigueProfile athlete={athlete} />
        <SessionCompare athlete={athlete} />
        <LoadTracking athlete={athlete} />
        <SessionTrends athlete={athlete} />
        <DetailDrawer athlete={athlete} />
        <SessionHistory athlete={athlete} />
      </div>
    </UnitCtx.Provider>
  );
}


// ==========================================================================
// WATCH LIST
// ==========================================================================

const WATCH_ICONS = {
  data_quality: "⚠",
  biomechanics: "⚙",
  performance: "⚡",
  trend: "↗",
};
const SEVERITY_STYLES = {
  alert: { color: "var(--red)", bg: "var(--red-dim)", label: "ALERT" },
  warn: { color: "var(--amber)", bg: "var(--amber-dim)", label: "WARNING" },
  watch: { color: "var(--cyan)", bg: "rgba(0,200,255,0.06)", label: "WATCH" },
  info: { color: "var(--text-muted)", bg: "var(--bg-elevated)", label: "INFO" },
};

function WatchList({ athlete }) {
  const items = athlete.watch_list;
  if (!items?.length) return null;

  return (
    <section className="v4-section watch-list-section">
      <h2 className="section-heading">Things to Watch</h2>
      <p className="section-desc">
        Data quality flags, biomechanical patterns, and trends that may need attention.
      </p>
      <div className="watch-items">
        {items.map((item, i) => {
          const sev = SEVERITY_STYLES[item.severity] || SEVERITY_STYLES.info;
          const icon = WATCH_ICONS[item.type] || "●";
          return (
            <div key={i} className="watch-item" style={{ "--wi-color": sev.color, "--wi-bg": sev.bg }}>
              <div className="wi-header">
                <span className="wi-icon">{icon}</span>
                <span className="wi-title">{item.title}</span>
                <span className="wi-badge">{sev.label}</span>
              </div>
              <div className="wi-detail">{item.detail}</div>
              {item.action && <div className="wi-action">{item.action}</div>}
            </div>
          );
        })}
      </div>
    </section>
  );
}


// ==========================================================================
// STATUS BANNER
// ==========================================================================

function StatusBanner({ athlete }) {
  const unit = useContext(UnitCtx);
  const status = athlete.status || { level: "on_track", headline: "No data" };
  const cfg = STATUS_CONFIG[status.level] || STATUS_CONFIG.on_track;
  const agg = athlete.aggregate || {};
  const avgSpeed = agg.metrics?.avg_speed_mps;
  const pace = paceTag(avgSpeed);

  return (
    <div className="status-banner" style={{ borderColor: cfg.color }}>
      <div className="status-indicator" style={{ background: cfg.bg, color: cfg.color }}>
        <span className="status-icon">{cfg.icon}</span>
        <span className="status-label">{cfg.label}</span>
      </div>
      <div className="status-content">
        <h1 className="status-name">{athlete.name}</h1>
        <p className="status-headline">{status.headline}</p>
      </div>
      <div className="status-meta">
        <span className="meta-item">{athlete.session_count} sessions</span>
        <span className="meta-divider">·</span>
        <span className="meta-item">{athlete.total_strides?.toLocaleString()} strides</span>
        {avgSpeed != null && (
          <>
            <span className="meta-divider">·</span>
            <span className="meta-item">
              {formatSpeed(avgSpeed, unit)} {speedUnit(unit)}
              {pace && <span className="meta-pace"> ({pace})</span>}
            </span>
          </>
        )}
        {agg.distance_mi > 0 && (
          <>
            <span className="meta-divider">·</span>
            <span className="meta-item">{agg.distance_mi.toFixed(1)} mi total</span>
          </>
        )}
        <span className="meta-divider">·</span>
        <span className="meta-item">{athlete.date_range?.first} → {athlete.date_range?.last}</span>
      </div>
    </div>
  );
}


// ==========================================================================
// RACE PREDICTIONS
// ==========================================================================

function RacePredictions({ athlete }) {
  const unit = useContext(UnitCtx);
  const rp = athlete.race_predictions;
  if (!rp?.has_predictions) return null;

  const preds = rp.predictions;
  const inputs = rp.model_inputs;
  const conf = rp.confidence;
  const confColor = conf?.level === "good" ? "var(--green)" : conf?.level === "moderate" ? "var(--amber)" : "var(--red)";

  return (
    <section className="v4-section">
      <div className="section-heading-row">
        <h2 className="section-heading">Predicted Race Times</h2>
        {conf && (
          <span className="confidence-badge" style={{ "--conf-color": confColor }}>
            <span className="cb-dot" />
            {conf.label} confidence
          </span>
        )}
      </div>
      <p className="section-desc">
        Estimated from {inputs.n_sessions_analyzed} sessions and {inputs.n_mile_splits_analyzed} mile
        splits, adjusted for biomechanical efficiency and fatigue resistance.
        <a href="/cortex/models" className="models-link"> See full methodology →</a>
      </p>
      {conf?.reasons?.length > 0 && (
        <div className="confidence-reasons">
          {conf.reasons.map((r, i) => <span key={i} className="conf-reason">{r}</span>)}
        </div>
      )}
      <div className="race-cards">
        {Object.entries(preds).map(([name, p]) => (
          <div key={name} className="race-card">
            <div className="rc-distance">{name}</div>
            <div className="rc-time">{p.predicted_time_fmt}</div>
            <div className="rc-pace">{p.predicted_pace_fmt}/mi</div>
            <div className="rc-speed">{formatSpeed(p.predicted_speed_mps, unit)} {speedUnit(unit)}</div>
          </div>
        ))}
      </div>
      <div className="prediction-inputs">
        <span className="pi-item">Best mile: {inputs.sustained_pace_fmt}/mi</span>
        <span className="pi-sep">·</span>
        <span className="pi-item">Efficiency: {inputs.efficiency_score?.toFixed(0)}/100</span>
        <span className="pi-sep">·</span>
        <span className="pi-item">Fatigue exponent: {inputs.riegel_adjusted_exponent?.toFixed(3)}</span>
      </div>
    </section>
  );
}


// ==========================================================================
// FATIGUE PROFILE
// ==========================================================================

function FatigueProfile({ athlete }) {
  const fp = athlete.fatigue_profile;
  if (!fp?.has_data) return null;

  const curves = fp.curves || {};
  const curveKeys = [
    { key: "avg_gct_ms", label: "GCT", unit: "ms", worsens: "increases" },
    { key: "avg_stride_len_m", label: "Stride Length", unit: "m", worsens: "decreases" },
    { key: "avg_cadence_spm", label: "Cadence", unit: "spm", worsens: "decreases" },
    { key: "avg_speed_mps", label: "Speed", unit: "m/s", worsens: "decreases" },
    { key: "avg_vgrf_peak_bw", label: "vGRF Peak", unit: "BW", worsens: "varies" },
  ];

  return (
    <section className="v4-section">
      <h2 className="section-heading">Fatigue Profile</h2>
      <p className="section-desc">{fp.summary}</p>
      <div className="fatigue-header-row">
        <MiniCard label="Resistance Score" value={fp.resistance_score} sub="/100" accent />
        <MiniCard label="Sessions Analyzed" value={fp.n_sessions_analyzed} />
        <MiniCard label="Max Distance" value={fp.max_miles_observed} unit="mi" />
        <MiniCard label="Composite Drift" value={fp.composite_drift_pct_per_mile?.toFixed(2)} unit="%/mi" />
      </div>
      <div className="fatigue-curves">
        {curveKeys.map(({ key, label, unit, worsens }) => {
          const c = curves[key];
          if (!c) return null;
          const mileValues = c.mile_values || {};
          const miles = Object.keys(mileValues).sort((a, b) => Number(a) - Number(b));
          return (
            <div key={key} className="fatigue-curve-card">
              <div className="fcc-header">
                <span className="fcc-label">{label}</span>
                <span className={`fcc-drift ${Math.abs(c.pct_drift_per_mile) > 1.5 ? "fcc-notable" : ""}`}>
                  {c.pct_drift_per_mile > 0 ? "+" : ""}{c.pct_drift_per_mile.toFixed(2)}%/mi
                </span>
              </div>
              <div className="fcc-detail">
                Initial: {c.initial} {unit} · Slope: {c.slope_per_mile > 0 ? "+" : ""}{c.slope_per_mile} {unit}/mi
                {c.onset_mile && ` · Onset: mile ${c.onset_mile}`}
              </div>
              {miles.length > 1 && (
                <div className="fcc-sparkline">
                  {miles.map((mi) => {
                    const val = mileValues[mi];
                    const pct = c.initial !== 0 ? ((val - c.initial) / Math.abs(c.initial)) * 100 : 0;
                    return (
                      <div key={mi} className="fcc-bar-wrap">
                        <div
                          className={`fcc-bar ${Math.abs(pct) > 3 ? "fcc-bar-alert" : ""}`}
                          style={{ height: `${Math.min(40, Math.max(4, Math.abs(pct) * 5))}px` }}
                          title={`Mile ${mi}: ${val} ${unit} (${pct > 0 ? "+" : ""}${pct.toFixed(1)}%)`}
                        />
                        <span className="fcc-mi-label">{mi}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}


// ==========================================================================
// SESSION CALENDAR — visual date picker
// ==========================================================================

function SessionCalendar({ sessions, selectedIdx, onSelect, runOnly, onToggleRunOnly, session, pace, speed, unit }) {
  const sessionsByDate = useMemo(() => {
    const map = {};
    sessions.forEach((s, i) => {
      map[s.date] = map[s.date] || [];
      map[s.date].push(i);
    });
    return map;
  }, [sessions]);

  const months = useMemo(() => {
    if (!sessions.length) return [];
    const dates = sessions.map((s) => s.date).filter((d) => /^\d{4}-\d{2}/.test(d));
    if (!dates.length) return [];

    const first = dates[0];
    const last = dates[dates.length - 1];
    const [fy, fm] = first.split("-").map(Number);
    const [ly, lm] = last.split("-").map(Number);

    const result = [];
    let y = fy, m = fm;
    while (y < ly || (y === ly && m <= lm)) {
      result.push({ year: y, month: m });
      m++;
      if (m > 12) { m = 1; y++; }
    }
    return result;
  }, [sessions]);

  const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
  const MONTH_NAMES = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const selectedDate = session?.date;

  return (
    <div className="session-picker">
      <div className="session-picker-top">
        <label className="session-picker-label">Select a Run</label>
        <button
          className={`run-filter-toggle ${runOnly ? "active" : ""}`}
          onClick={onToggleRunOnly}
        >
          <span className="rft-dot" />
          {runOnly ? "Running only" : "All data"}
        </button>
      </div>

      <div className="cal-months">
        {months.map(({ year, month }) => {
          const firstDay = new Date(year, month - 1, 1);
          const daysInMonth = new Date(year, month, 0).getDate();
          let startDow = firstDay.getDay();
          startDow = startDow === 0 ? 6 : startDow - 1; // Monday-based

          const cells = [];
          for (let i = 0; i < startDow; i++) cells.push(null);
          for (let d = 1; d <= daysInMonth; d++) cells.push(d);

          return (
            <div key={`${year}-${month}`} className="cal-month">
              <div className="cal-month-label">{MONTH_NAMES[month]} {year}</div>
              <div className="cal-dow-row">
                {DAYS.map((d, i) => <span key={i} className="cal-dow">{d}</span>)}
              </div>
              <div className="cal-grid">
                {cells.map((day, i) => {
                  if (day === null) return <span key={i} className="cal-cell cal-empty" />;
                  const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const sessionIdxs = sessionsByDate[dateStr];
                  const hasSession = !!sessionIdxs;
                  const isSelected = dateStr === selectedDate;

                  return (
                    <button
                      key={i}
                      className={`cal-cell ${hasSession ? "cal-has-session" : ""} ${isSelected ? "cal-selected" : ""}`}
                      disabled={!hasSession}
                      onClick={() => hasSession && onSelect(sessionIdxs[sessionIdxs.length - 1])}
                      title={hasSession ? `${sessionIdxs.length} session${sessionIdxs.length > 1 ? "s" : ""}` : ""}
                    >
                      {day}
                      {hasSession && <span className="cal-dot" />}
                      {sessionIdxs?.length > 1 && <span className="cal-multi">{sessionIdxs.length}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Multi-session on same date: show sub-picker */}
      {sessionsByDate[selectedDate]?.length > 1 && (
        <div className="cal-sub-picker">
          {sessionsByDate[selectedDate].map((idx) => {
            const s = sessions[idx];
            return (
              <button
                key={idx}
                className={`cal-sub-btn ${idx === selectedIdx ? "active" : ""}`}
                onClick={() => onSelect(idx)}
              >
                {s.distance_mi?.toFixed(2)} mi · {s.n_running_strides ?? s.n_strides} strides
                {s.source ? ` · ${s.source}` : ""}
              </button>
            );
          })}
        </div>
      )}

      <div className="cal-session-summary">
        <span className="cal-date-badge">{session.date}</span>
        <span className="sps-stat"><strong>{session.distance_mi?.toFixed(2)}</strong> mi</span>
        <span className="sps-sep">·</span>
        <span className="sps-stat"><strong>{pace || formatSpeed(speed, unit)}</strong> {pace ? "pace" : speedUnit(unit)}</span>
        <span className="sps-sep">·</span>
        <span className="sps-stat"><strong>{session.n_running_strides ?? session.n_strides}</strong> strides</span>
        {session.n_filtered_out > 0 && (
          <>
            <span className="sps-sep">·</span>
            <span className="sps-filtered">{session.n_filtered_out} filtered</span>
          </>
        )}
        {session.source && (
          <>
            <span className="sps-sep">·</span>
            <span className="sps-source">{session.source}</span>
          </>
        )}
      </div>
    </div>
  );
}


// ==========================================================================
// SESSION EXPLORER — interactive chart + windowed metrics + mile splits
// ==========================================================================

function SessionExplorer({ athlete }) {
  const unit = useContext(UnitCtx);
  const sessions = athlete.sessions || [];
  const [selectedIdx, setSelectedIdx] = useState(sessions.length - 1);
  const [activeMetrics, setActiveMetrics] = useState(["speed", "gct"]);
  const [distRange, setDistRange] = useState(null);
  const [runOnly, setRunOnly] = useState(true);

  const session = sessions[selectedIdx] || sessions[sessions.length - 1];
  if (!session) return null;

  const tsRaw = session.time_series || [];
  const ts = runOnly ? tsRaw.filter((p) => p.running !== false) : tsRaw;
  const filteredCount = tsRaw.length - ts.length;

  const toggleMetric = useCallback((key) => {
    setActiveMetrics((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }, []);

  const windowedMetrics = useMemo(() => {
    if (!ts.length) return null;
    let points = ts;
    if (distRange) {
      points = ts.filter((p) => p.dist_mi >= distRange[0] && p.dist_mi <= distRange[1]);
    }
    if (!points.length) return null;

    const avg = (arr) => {
      const vals = arr.filter((v) => v != null);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    };

    const speeds = points.map((p) => p.speed);
    const avgSpeed = avg(speeds);
    const distMin = points[0].dist_mi;
    const distMax = points[points.length - 1].dist_mi;

    return {
      avg_speed_mps: avgSpeed,
      avg_gct_ms: avg(points.map((p) => p.gct)),
      avg_cadence_spm: avg(points.map((p) => p.cadence)),
      avg_fsa_deg: avg(points.map((p) => p.fsa)),
      avg_vgrf_peak_bw: avg(points.map((p) => p.vgrf_peak)),
      avg_stride_len_m: avg(points.map((p) => p.stride)),
      avg_loading_rate: avg(points.map((p) => p.lr)),
      distance_mi: distMax - distMin,
      n_points: points.length,
      pace: mpsToMinPerMile(avgSpeed),
    };
  }, [ts, distRange]);

  const speed = windowedMetrics?.avg_speed_mps ?? session.metrics?.avg_speed_mps;
  const pace = paceTag(speed);

  return (
    <section className="v4-section">
      <h2 className="section-heading">Session Explorer</h2>

      <SessionCalendar
        sessions={sessions}
        selectedIdx={selectedIdx}
        onSelect={(i) => { setSelectedIdx(i); setDistRange(null); }}
        runOnly={runOnly}
        onToggleRunOnly={() => setRunOnly((v) => !v)}
        session={session}
        pace={pace}
        speed={speed}
        unit={unit}
      />

      {distRange && (
        <div className="range-indicator">
          Viewing {distRange[0].toFixed(2)} – {distRange[1].toFixed(2)} mi
          <button className="range-reset" onClick={() => setDistRange(null)}>Reset</button>
        </div>
      )}

      {ts.length > 0 && (
        <div className="card">
          <InteractiveSessionChart
            timeSeries={ts}
            activeMetrics={activeMetrics}
            onToggleMetric={toggleMetric}
            onRangeChange={setDistRange}
            height={380}
          />
        </div>
      )}

      {/* Windowed summary cards */}
      {windowedMetrics && (
        <div className="windowed-cards">
          <MiniCard label="Speed" value={formatSpeed(windowedMetrics.avg_speed_mps, unit)} unit={speedUnit(unit)} sub={pace} accent />
          <MiniCard label="GCT" value={windowedMetrics.avg_gct_ms?.toFixed(0)} unit="ms" />
          <MiniCard label="Cadence" value={windowedMetrics.avg_cadence_spm?.toFixed(0)} unit="spm" />
          <MiniCard label="vGRF Peak" value={windowedMetrics.avg_vgrf_peak_bw?.toFixed(2)} unit="BW" />
          <MiniCard label="FSA" value={windowedMetrics.avg_fsa_deg?.toFixed(1)} unit="°" />
          <MiniCard label="Stride" value={windowedMetrics.avg_stride_len_m?.toFixed(2)} unit="m" />
          <MiniCard label="Distance" value={windowedMetrics.distance_mi?.toFixed(2)} unit="mi" />
          <MiniCard label="Load Rate" value={windowedMetrics.avg_loading_rate?.toFixed(1)} unit="BW/s" />
        </div>
      )}

      {/* Mile splits */}
      {session.mile_splits?.length > 0 && (
        <div className="card">
          <h3 className="card-title">Mile Splits</h3>
          <MileSplitsChart splits={session.mile_splits} height={240} />
        </div>
      )}
    </section>
  );
}


// ==========================================================================
// SESSION COMPARE — overlay multiple sessions
// ==========================================================================

function SessionCompare({ athlete }) {
  const sessions = (athlete.sessions || []).filter((s) => s.time_series?.length > 0);
  const [selectedIds, setSelectedIds] = useState(() => {
    const last2 = sessions.slice(-2);
    return last2.map((s) => s.date + s.label);
  });

  const toggleSession = useCallback((id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  if (sessions.length < 2) return null;

  return (
    <section className="v4-section">
      <h2 className="section-heading">Session Comparison</h2>
      <p className="section-desc">
        Overlay sessions on the same distance axis to spot differences. Pick a metric and select sessions to compare.
      </p>
      <div className="card">
        <SessionOverlayChart
          sessions={sessions}
          selectedSessionIds={selectedIds}
          onToggleSession={toggleSession}
          height={340}
        />
      </div>
    </section>
  );
}


// ==========================================================================
// LOAD TRACKING
// ==========================================================================

function LoadTracking({ athlete }) {
  const sessions = athlete.sessions || [];
  if (sessions.length < 2) return null;

  const totalLoad = sessions.reduce((sum, s) => sum + (s.load?.total || 0), 0);
  const avgPerSession = totalLoad / sessions.length;
  const totalDist = sessions.reduce((sum, s) => sum + (s.distance_mi || 0), 0);
  const avgPerMile = totalDist > 0 ? totalLoad / totalDist : 0;

  return (
    <section className="v4-section">
      <h2 className="section-heading">Mechanical Load</h2>
      <p className="section-desc">
        Estimated from ground reaction forces. Tracks how much mechanical stress each session puts on the body.
      </p>
      <div className="load-summary-row">
        <MiniCard label="Total Load" value={totalLoad.toFixed(0)} accent />
        <MiniCard label="Avg / Session" value={avgPerSession.toFixed(1)} />
        <MiniCard label="Avg / Mile" value={avgPerMile.toFixed(1)} />
        <MiniCard label="Total Distance" value={totalDist.toFixed(1)} unit="mi" />
      </div>
      <div className="card">
        <LoadChart sessions={sessions} height={280} />
      </div>
    </section>
  );
}


// ==========================================================================
// SESSION TRENDS — cross-session metrics
// ==========================================================================

function SessionTrends({ athlete }) {
  const sessions = athlete.sessions || [];
  const [activeMetrics, setActiveMetrics] = useState(["avg_speed_mps", "avg_gct_ms"]);

  const toggleMetric = useCallback((key) => {
    setActiveMetrics((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }, []);

  if (sessions.length < 2) return null;

  return (
    <section className="v4-section">
      <h2 className="section-heading">Trends Across Sessions</h2>
      <p className="section-desc">
        Toggle metrics to see how they evolve. Click a data point to jump to that session.
      </p>
      <div className="card">
        <TrendPlot
          sessions={sessions}
          activeMetrics={activeMetrics}
          onToggleMetric={toggleMetric}
          height={320}
        />
      </div>
    </section>
  );
}


// ==========================================================================
// DETAIL DRAWER — bilateral, speed zones, fatigue (collapsible)
// ==========================================================================

function DetailDrawer({ athlete }) {
  const sessions = athlete.sessions || [];
  const [selectedIdx, setSelectedIdx] = useState(sessions.length - 1);
  const [open, setOpen] = useState(true);
  const session = sessions[selectedIdx];
  if (!session) return null;

  return (
    <section className="v4-section">
      <button className="drawer-toggle" onClick={() => setOpen(!open)}>
        <h2 className="section-heading">Detailed Biomechanics</h2>
        <span className="drawer-arrow">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="drawer-content">
          <select
            className="session-select"
            value={selectedIdx}
            onChange={(e) => setSelectedIdx(Number(e.target.value))}
          >
            {sessions.map((s, i) => (
              <option key={s.date + s.label} value={i}>
                {s.date}{s.source ? ` (${s.source})` : ""}
              </option>
            ))}
          </select>

          {session.bilateral?.length > 0 && (
            <div className="detail-block">
              <h3 className="card-title">Left vs Right</h3>
              <div className="card"><BilateralTable bilateral={session.bilateral} /></div>
            </div>
          )}

          {session.speed_zones?.length > 0 && (
            <div className="detail-block">
              <h3 className="card-title">Speed Zones</h3>
              <div className="card"><SpeedZonesTable zones={session.speed_zones} /></div>
            </div>
          )}

          {session.fatigue && (
            <div className="detail-block">
              <h3 className="card-title">Fatigue — Early vs Late</h3>
              <div className="card"><FatiguePanel fatigue={session.fatigue} /></div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}


// ==========================================================================
// SESSION HISTORY — compact list
// ==========================================================================

function SessionHistory({ athlete }) {
  const unit = useContext(UnitCtx);
  const sessions = athlete.sessions || [];

  return (
    <section className="v4-section">
      <h2 className="section-heading">All Sessions</h2>
      <div className="session-table-wrap">
        <table className="session-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Source</th>
              <th>Distance</th>
              <th>Pace</th>
              <th>Speed</th>
              <th>GCT</th>
              <th>Cadence</th>
              <th>Strides</th>
              <th>Load</th>
            </tr>
          </thead>
          <tbody>
            {[...sessions].reverse().map((s) => {
              const speed = s.metrics?.avg_speed_mps;
              const pace = paceTag(speed);
              return (
                <tr key={s.date + s.label}>
                  <td className="st-date">{s.date}</td>
                  <td className="st-source">{s.source || "—"}</td>
                  <td>{s.distance_mi?.toFixed(2) || "—"} mi</td>
                  <td className="st-pace">{pace || "—"}</td>
                  <td>{formatSpeed(speed, unit)} {speedUnit(unit)}</td>
                  <td>{s.metrics?.avg_gct_ms?.toFixed(0) || "—"} ms</td>
                  <td>{s.metrics?.avg_cadence_spm?.toFixed(0) || "—"}</td>
                  <td>{s.n_running_strides ?? s.n_strides}</td>
                  <td>{s.load?.total?.toFixed(0) || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}


// ==========================================================================
// Small reusable components
// ==========================================================================

function MiniCard({ label, value, unit, sub, accent }) {
  return (
    <div className="mini-card">
      <div className="mc-label">{label}</div>
      <div className={`mc-value ${accent ? "mc-accent" : ""}`}>
        {value ?? "—"}
        {unit && <span className="mc-unit">{unit}</span>}
      </div>
      {sub && <div className="mc-sub">{sub}</div>}
    </div>
  );
}
