import { useEffect, useState, useMemo, useCallback, useRef, createContext, useContext } from "react";
import { createPortal } from "react-dom";
import { useParams, Link } from "react-router-dom";
import { fetchAthlete } from "../api";
import InteractiveSessionChart from "../components/charts/InteractiveSessionChart";
import SessionOverlayChart from "../components/charts/SessionOverlayChart";
import MileSplitsChart from "../components/charts/MileSplitsChart";
import TrendPlot from "../components/charts/TrendPlot";
import LoadChart from "../components/charts/LoadChart";
import BilateralTable from "../components/charts/BilateralTable";
import SpeedZonesTable from "../components/charts/SpeedZonesTable";
import FatiguePanel from "../components/charts/FatiguePanel";
import { SHOES } from "../data/shoes";
import "./AthletePage.css";

// ---------------------------------------------------------------------------
// Shoe assignment helpers (localStorage-backed)
// ---------------------------------------------------------------------------

const SHOE_STORAGE_KEY = "cortex_shoe_assignments";

function loadShoeAssignments() {
  try { return JSON.parse(localStorage.getItem(SHOE_STORAGE_KEY)) || {}; }
  catch { return {}; }
}

function saveShoeAssignments(data) {
  localStorage.setItem(SHOE_STORAGE_KEY, JSON.stringify(data));
}

function sessionKey(athleteId, session) {
  return `${athleteId}::${session.date}::${session.label || session.source || ""}`;
}

function useShoeAssignments(athleteId, sessions) {
  const [assignments, setAssignments] = useState(() => loadShoeAssignments());

  const assign = useCallback((session, shoeId) => {
    setAssignments((prev) => {
      const key = sessionKey(athleteId, session);
      const next = { ...prev, [key]: shoeId || null };
      if (!shoeId) delete next[key];
      saveShoeAssignments(next);
      return next;
    });
  }, [athleteId]);

  const getShoe = useCallback((session) => {
    const key = sessionKey(athleteId, session);
    return assignments[key] || null;
  }, [athleteId, assignments]);

  const usedShoes = useMemo(() => {
    const shoes = new Set();
    for (const s of sessions) {
      const sid = getShoe(s);
      if (sid) shoes.add(sid);
    }
    return [...shoes];
  }, [sessions, getShoe]);

  return { assign, getShoe, usedShoes };
}

const ShoeCtx = createContext({ assign: () => {}, getShoe: () => null, usedShoes: [] });

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

  const shoeCtx = useShoeAssignments(id, athlete?.sessions || []);

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!athlete) return <div className="error">Athlete not found</div>;

  return (
    <UnitCtx.Provider value={unit}>
      <ShoeCtx.Provider value={shoeCtx}>
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
          <FootwearComparison athlete={athlete} />
          <FatigueProfile athlete={athlete} />
          <SessionCompare athlete={athlete} />
          <LoadTracking athlete={athlete} />
          <SessionTrends athlete={athlete} />
          <DetailDrawer athlete={athlete} />
          <SessionHistory athlete={athlete} />
        </div>
      </ShoeCtx.Provider>
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
        <Link to="/models" className="models-link"> See full methodology →</Link>
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

function SessionShoePicker({ session }) {
  const { assign, getShoe } = useContext(ShoeCtx);
  const [open, setOpen] = useState(false);
  const currentShoe = getShoe(session);
  const shoe = currentShoe ? SHOES[currentShoe] : null;

  const allShoes = Object.values(SHOES);
  const everyday = allShoes.filter((s) => s.category === "everyday");
  const racing = allShoes.filter((s) => s.category === "racing");

  return (
    <>
      <div className={`shoe-picker-block ${shoe ? "spb-assigned" : ""}`} onClick={() => setOpen(true)}>
        <div className="spb-left">
          <span className="spb-icon">👟</span>
          <div className="spb-content">
            {shoe ? (
              <>
                <div className="spb-shoe-name">{shoe.name}</div>
                <div className="spb-shoe-detail">{shoe.weight_g}g · {shoe.stack_heel_mm}/{shoe.stack_forefoot_mm}mm · {shoe.drop_mm}mm drop{shoe.plate?.includes("carbon") ? " · Carbon" : ""}</div>
              </>
            ) : (
              <>
                <div className="spb-cta">What shoe was this run in?</div>
                <div className="spb-cta-sub">Tap to assign — enables footwear performance comparison</div>
              </>
            )}
          </div>
        </div>
        <span className="spb-arrow">→</span>
      </div>

      {open && createPortal(
        <div className="shoe-modal-overlay" onClick={() => setOpen(false)}>
          <div className="shoe-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sm-header">
              <h3 className="sm-title">Select Shoe</h3>
              <div className="sm-session-info">{session.date} · {session.distance_mi?.toFixed(2)} mi</div>
              <button className="sm-close" onClick={() => setOpen(false)}>✕</button>
            </div>

            {shoe && (
              <button className="sm-clear" onClick={() => { assign(session, null); setOpen(false); }}>
                Clear shoe assignment
              </button>
            )}

            <div className="sm-section">
              <div className="sm-section-label">Everyday</div>
              <div className="sm-grid">
                {everyday.map((s) => {
                  const hasPlate = !!s.plate?.includes("carbon");
                  const isActive = currentShoe === s.id;
                  return (
                    <button
                      key={s.id}
                      className={`sm-card ${isActive ? "sm-card-active" : ""}`}
                      onClick={() => { assign(session, s.id); setOpen(false); }}
                    >
                      <div className="smc-name">{s.name}</div>
                      <div className="smc-foam">{s.foam_type?.split(" ")[0] || s.foam?.split(" ")[0]}</div>
                      <div className="smc-specs">
                        <span className="smc-weight">{s.weight_g}g</span>
                        <span>{s.drop_mm}mm</span>
                        {hasPlate && <span className="smc-plate">Carbon</span>}
                      </div>
                      <div className="smc-price">${s.price_usd}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="sm-section">
              <div className="sm-section-label">Road Racing</div>
              <div className="sm-grid">
                {racing.map((s) => {
                  const hasPlate = !!s.plate?.includes("carbon");
                  const isActive = currentShoe === s.id;
                  return (
                    <button
                      key={s.id}
                      className={`sm-card sm-card-racing ${isActive ? "sm-card-active" : ""}`}
                      onClick={() => { assign(session, s.id); setOpen(false); }}
                    >
                      <div className="smc-name">{s.name}</div>
                      <div className="smc-foam">ZoomX</div>
                      <div className="smc-specs">
                        <span className="smc-weight">{s.weight_g}g</span>
                        <span>{s.drop_mm}mm</span>
                        {hasPlate && <span className="smc-plate">Carbon</span>}
                      </div>
                      <div className="smc-price">${s.price_usd}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}


function SessionCalendar({ sessions, selectedIdx, onSelect, runOnly, onToggleRunOnly, session, pace, speed, unit }) {
  const calRef = useRef(null);
  const { getShoe } = useContext(ShoeCtx);

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
    const now = new Date();
    const ly = now.getFullYear(), lm = now.getMonth() + 1;
    const [fy, fm] = first.split("-").map(Number);

    const result = [];
    let y = fy, m = fm;
    while (y < ly || (y === ly && m <= lm)) {
      result.push({ year: y, month: m });
      m++;
      if (m > 12) { m = 1; y++; }
    }
    return result;
  }, [sessions]);

  useEffect(() => {
    if (calRef.current) {
      calRef.current.scrollLeft = calRef.current.scrollWidth;
    }
  }, [months]);

  const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
  const MONTH_NAMES = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const selectedDate = session?.date;
  const today = new Date().toISOString().slice(0, 10);

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

      <div className="cal-months" ref={calRef}>
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
                  const isToday = dateStr === today;
                  const hasShoe = hasSession && sessionIdxs.some((idx) => getShoe(sessions[idx]));
                  const noShoe = hasSession && !hasShoe;

                  return (
                    <button
                      key={i}
                      className={`cal-cell ${hasSession ? "cal-has-session" : ""} ${isSelected ? "cal-selected" : ""} ${isToday ? "cal-today" : ""} ${hasShoe ? "cal-has-shoe" : ""} ${noShoe ? "cal-no-shoe" : ""}`}
                      disabled={!hasSession}
                      onClick={() => hasSession && onSelect(sessionIdxs[sessionIdxs.length - 1])}
                      title={hasSession ? `${sessionIdxs.length} session${sessionIdxs.length > 1 ? "s" : ""}${hasShoe ? " · shoe tagged" : " · no shoe"}` : ""}
                    >
                      {day}
                      {hasSession && <span className={`cal-dot ${hasShoe ? "cal-dot-shoe" : ""}`} />}
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
      </div>

      <SessionShoePicker session={session} />
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
// FOOTWEAR COMPARISON — real metrics per shoe
// ==========================================================================

const FW_METRICS = [
  { key: "avg_speed_mps", label: "Speed", unit: "m/s", higherBetter: true, decimals: 2 },
  { key: "avg_gct_ms", label: "GCT", unit: "ms", higherBetter: false, decimals: 0 },
  { key: "avg_cadence_spm", label: "Cadence", unit: "spm", higherBetter: true, decimals: 0 },
  { key: "avg_stride_len_m", label: "Stride", unit: "m", higherBetter: true, decimals: 3 },
  { key: "avg_vgrf_peak_bw", label: "vGRF", unit: "BW", higherBetter: false, decimals: 2 },
  { key: "avg_fsa_deg", label: "FSA", unit: "°", higherBetter: false, decimals: 1 },
  { key: "avg_loading_rate", label: "Load Rate", unit: "BW/s", higherBetter: false, decimals: 1 },
];

const SHOE_COLORS = ["#cdff00", "#00d4ff", "#ff6b6b", "#a78bfa", "#fb923c", "#34d399", "#f472b6", "#fbbf24"];

function FootwearComparison({ athlete }) {
  const { getShoe, usedShoes } = useContext(ShoeCtx);
  const unit = useContext(UnitCtx);
  const sessions = athlete.sessions || [];
  const [activeMetric, setActiveMetric] = useState("avg_speed_mps");

  const shoeGroups = useMemo(() => {
    const groups = {};
    for (const s of sessions) {
      const sid = getShoe(s);
      if (!sid) continue;
      if (!groups[sid]) groups[sid] = { shoe: SHOES[sid], sessions: [] };
      groups[sid].sessions.push(s);
    }
    return groups;
  }, [sessions, getShoe]);

  const shoeIds = Object.keys(shoeGroups);
  if (shoeIds.length === 0) {
    return (
      <section className="v4-section fw-section">
        <h2 className="section-heading">Footwear Comparison</h2>
        <div className="fw-empty">
          <div className="fw-empty-icon">👟</div>
          <p>Assign shoes to sessions using the shoe picker in the calendar above, then come back here to compare performance across your rotation.</p>
          <Link to="/shoes" className="fw-lab-link">Browse Shoe Lab →</Link>
        </div>
      </section>
    );
  }

  const shoeStats = useMemo(() => {
    return shoeIds.map((sid, i) => {
      const g = shoeGroups[sid];
      const shoe = g.shoe;
      const sArr = g.sessions;
      const stats = {};
      for (const def of FW_METRICS) {
        const vals = sArr.map((s) => s.metrics?.[def.key]).filter((v) => v != null);
        if (vals.length) {
          stats[def.key] = {
            avg: vals.reduce((a, b) => a + b, 0) / vals.length,
            min: Math.min(...vals),
            max: Math.max(...vals),
            n: vals.length,
          };
        }
      }
      const totalDist = sArr.reduce((a, s) => a + (s.distance_mi || 0), 0);
      return {
        id: sid,
        shoe,
        sessions: sArr,
        sessionCount: sArr.length,
        totalDistance: totalDist,
        stats,
        color: SHOE_COLORS[i % SHOE_COLORS.length],
      };
    });
  }, [shoeIds, shoeGroups]);

  const metricDef = FW_METRICS.find((d) => d.key === activeMetric) || FW_METRICS[0];
  const allVals = shoeStats.flatMap((s) => {
    const st = s.stats[activeMetric];
    return st ? [st.avg] : [];
  });
  const maxVal = Math.max(...allVals, 0.001);
  const best = metricDef.higherBetter ? Math.max(...allVals) : Math.min(...allVals);

  return (
    <section className="v4-section fw-section">
      <div className="section-heading-row">
        <h2 className="section-heading">Footwear Comparison</h2>
        <Link to="/shoes" className="fw-lab-link-inline">Shoe Lab →</Link>
      </div>
      <p className="section-desc">
        Real performance data from {shoeStats.reduce((a, s) => a + s.sessionCount, 0)} sessions across {shoeIds.length} shoes.
        Select a metric to compare.
      </p>

      <div className="fw-pills">
        {FW_METRICS.map((d) => (
          <button
            key={d.key}
            className={`fw-pill ${activeMetric === d.key ? "active" : ""}`}
            onClick={() => setActiveMetric(d.key)}
          >
            {d.label}
          </button>
        ))}
      </div>

      <div className="fw-comparison">
        {shoeStats.map((ss) => {
          const st = ss.stats[activeMetric];
          if (!st) return null;
          const pct = (st.avg / maxVal) * 100;
          const isBest = Math.abs(st.avg - best) < 0.001;
          const hasPlate = !!ss.shoe?.plate?.includes("carbon");

          return (
            <div key={ss.id} className={`fw-shoe-row ${isBest ? "fw-best" : ""}`} style={{ "--fw-color": ss.color }}>
              <div className="fw-shoe-info">
                <div className="fw-shoe-name">{ss.shoe?.name || ss.id}</div>
                <div className="fw-shoe-meta">
                  {ss.sessionCount} run{ss.sessionCount !== 1 ? "s" : ""} · {ss.totalDistance.toFixed(1)} mi
                  {hasPlate && <span className="fw-plate-tag">Carbon</span>}
                </div>
              </div>
              <div className="fw-bar-area">
                <div className="fw-bar-track">
                  <div className="fw-bar" style={{ width: `${Math.max(5, pct)}%` }}>
                    <span className="fw-bar-val">
                      {st.avg.toFixed(metricDef.decimals)} {metricDef.unit}
                    </span>
                  </div>
                </div>
                <div className="fw-range">
                  {st.min.toFixed(metricDef.decimals)} – {st.max.toFixed(metricDef.decimals)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Shoe spec comparison table */}
      {shoeIds.length >= 2 && (
        <div className="fw-spec-table">
          <h3 className="fw-spec-title">Shoe Specs vs. Performance</h3>
          <table className="fw-table">
            <thead>
              <tr>
                <th>Shoe</th>
                <th>Weight</th>
                <th>Stack</th>
                <th>Drop</th>
                <th>Plate</th>
                <th>Avg Speed</th>
                <th>Avg GCT</th>
                <th>Avg Cadence</th>
                <th>Sessions</th>
              </tr>
            </thead>
            <tbody>
              {shoeStats.map((ss) => (
                <tr key={ss.id} style={{ "--fw-color": ss.color }}>
                  <td className="fw-td-name">{ss.shoe?.name}</td>
                  <td>{ss.shoe?.weight_g}g</td>
                  <td>{ss.shoe?.stack_heel_mm}/{ss.shoe?.stack_forefoot_mm}</td>
                  <td>{ss.shoe?.drop_mm}mm</td>
                  <td>{ss.shoe?.plate?.includes("carbon") ? "✓" : "—"}</td>
                  <td className="fw-td-metric">{ss.stats.avg_speed_mps?.avg.toFixed(2) || "—"}</td>
                  <td className="fw-td-metric">{ss.stats.avg_gct_ms?.avg.toFixed(0) || "—"}</td>
                  <td className="fw-td-metric">{ss.stats.avg_cadence_spm?.avg.toFixed(0) || "—"}</td>
                  <td>{ss.sessionCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Insights */}
      {shoeIds.length >= 2 && (
        <FootwearInsights shoeStats={shoeStats} />
      )}
    </section>
  );
}

function FootwearInsights({ shoeStats }) {
  const insights = useMemo(() => {
    const result = [];
    if (shoeStats.length < 2) return result;

    const bySpeed = [...shoeStats].filter((s) => s.stats.avg_speed_mps).sort((a, b) => b.stats.avg_speed_mps.avg - a.stats.avg_speed_mps.avg);
    if (bySpeed.length >= 2) {
      const fastest = bySpeed[0];
      const slowest = bySpeed[bySpeed.length - 1];
      const diff = fastest.stats.avg_speed_mps.avg - slowest.stats.avg_speed_mps.avg;
      const pct = (diff / slowest.stats.avg_speed_mps.avg * 100).toFixed(1);
      result.push({
        title: "Speed Differential",
        text: `${fastest.shoe.name} averages ${diff.toFixed(2)} m/s faster than ${slowest.shoe.name} (${pct}% difference). ` +
              (fastest.shoe?.plate?.includes("carbon") && !slowest.shoe?.plate?.includes("carbon")
                ? "The carbon plate likely contributes to this gap."
                : fastest.shoe.weight_g < slowest.shoe.weight_g
                  ? `The ${fastest.shoe.weight_g - slowest.shoe.weight_g}g weight advantage may be a factor.`
                  : "This could reflect workout type differences — check if faster sessions were tempo/race efforts."),
        color: fastest.color,
      });
    }

    const byGCT = [...shoeStats].filter((s) => s.stats.avg_gct_ms).sort((a, b) => a.stats.avg_gct_ms.avg - b.stats.avg_gct_ms.avg);
    if (byGCT.length >= 2) {
      const shortest = byGCT[0];
      const longest = byGCT[byGCT.length - 1];
      const diff = longest.stats.avg_gct_ms.avg - shortest.stats.avg_gct_ms.avg;
      if (diff > 5) {
        result.push({
          title: "Ground Contact Time",
          text: `${shortest.shoe.name} produces ${diff.toFixed(0)} ms shorter GCT on average. ` +
                (shortest.shoe.stack_forefoot_mm > longest.shoe.stack_forefoot_mm
                  ? "Higher forefoot stack may aid faster toe-off."
                  : "This could be related to the shoe's responsiveness or the type of runs done in it."),
          color: shortest.color,
        });
      }
    }

    const byCadence = [...shoeStats].filter((s) => s.stats.avg_cadence_spm).sort((a, b) => b.stats.avg_cadence_spm.avg - a.stats.avg_cadence_spm.avg);
    if (byCadence.length >= 2) {
      const highest = byCadence[0];
      const lowest = byCadence[byCadence.length - 1];
      const diff = highest.stats.avg_cadence_spm.avg - lowest.stats.avg_cadence_spm.avg;
      if (diff > 3) {
        result.push({
          title: "Cadence Effect",
          text: `Cadence is ${diff.toFixed(0)} spm higher in ${highest.shoe.name}. ` +
                (highest.shoe.drop_mm < lowest.shoe.drop_mm
                  ? `The lower ${highest.shoe.drop_mm}mm drop may encourage quicker turnover.`
                  : highest.shoe.weight_g < lowest.shoe.weight_g
                    ? "Lighter weight can facilitate higher turnover rate."
                    : "This may reflect different workout intensities."),
          color: highest.color,
        });
      }
    }

    return result;
  }, [shoeStats]);

  if (!insights.length) return null;

  return (
    <div className="fw-insights">
      <h3 className="fw-insights-title">What the Data Shows</h3>
      {insights.map((ins, i) => (
        <div key={i} className="fw-insight-card" style={{ "--fw-color": ins.color }}>
          <div className="fwi-title">{ins.title}</div>
          <div className="fwi-text">{ins.text}</div>
        </div>
      ))}
      <div className="fw-insight-caveat">
        Shoe-to-shoe comparisons are influenced by workout type, effort level, terrain, and conditions.
        More sessions per shoe improves reliability. Controlled A/B testing (same route, same effort, different shoes) gives the strongest signal.
      </div>
    </div>
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
// SESSION TRENDS — interactive infographic with pill selector
// ==========================================================================

const TREND_DEFS = [
  { key: "avg_speed_mps", label: "Speed", unit: "m/s", color: "#cdff00", higherBetter: true, icon: "→" },
  { key: "avg_gct_ms", label: "GCT", unit: "ms", color: "#00d4ff", higherBetter: false, icon: "⏱" },
  { key: "avg_cadence_spm", label: "Cadence", unit: "spm", color: "#ff6b6b", higherBetter: true, icon: "♩" },
  { key: "avg_stride_len_m", label: "Stride", unit: "m", color: "#a78bfa", higherBetter: true, icon: "⟷" },
  { key: "avg_vgrf_peak_bw", label: "vGRF", unit: "BW", color: "#fb923c", higherBetter: false, icon: "↓" },
  { key: "avg_fsa_deg", label: "FSA", unit: "°", color: "#34d399", higherBetter: false, icon: "∠" },
  { key: "avg_loading_rate", label: "Load Rate", unit: "BW/s", color: "#f472b6", higherBetter: false, icon: "⚡" },
];

function SessionTrends({ athlete }) {
  const sessions = athlete.sessions || [];
  const [activeKey, setActiveKey] = useState("avg_speed_mps");
  const unit = useContext(UnitCtx);

  if (sessions.length < 2) return null;

  const def = TREND_DEFS.find((d) => d.key === activeKey) || TREND_DEFS[0];
  const points = sessions
    .map((s, i) => ({ idx: i, date: s.date, val: s.metrics?.[activeKey], dist: s.distance_mi }))
    .filter((p) => p.val != null);

  if (!points.length) return null;

  const vals = points.map((p) => p.val);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  const range = max - min || 1;
  const first = vals[0];
  const last = vals[vals.length - 1];
  const delta = last - first;
  const deltaPct = first !== 0 ? (delta / first) * 100 : 0;
  const improving = def.higherBetter ? delta > 0 : delta < 0;

  const sparkW = 100;
  const sparkH = 40;
  const pathPoints = points.map((p, i) => {
    const x = points.length > 1 ? (i / (points.length - 1)) * sparkW : sparkW / 2;
    const y = sparkH - ((p.val - min) / range) * (sparkH - 4) - 2;
    return `${x},${y}`;
  });
  const sparkPath = `M${pathPoints.join(" L")}`;

  return (
    <section className="v4-section">
      <h2 className="section-heading">Performance Trends</h2>
      <p className="section-desc">Select a metric to explore how it evolves across sessions.</p>

      <div className="trend-pills">
        {TREND_DEFS.map((d) => {
          const hasData = sessions.some((s) => s.metrics?.[d.key] != null);
          if (!hasData) return null;
          return (
            <button
              key={d.key}
              className={`trend-pill ${activeKey === d.key ? "active" : ""}`}
              style={{ "--pill-color": d.color }}
              onClick={() => setActiveKey(d.key)}
            >
              <span className="tp-icon">{d.icon}</span>
              {d.label}
            </button>
          );
        })}
      </div>

      <div className="trend-infographic" style={{ "--trend-color": def.color }}>
        <div className="trend-hero">
          <div className="trend-hero-left">
            <div className="trend-hero-icon">{def.icon}</div>
            <div className="trend-hero-label">{def.label}</div>
          </div>
          <div className="trend-hero-center">
            <div className="trend-hero-value">{last.toFixed(def.key.includes("stride") ? 3 : def.key.includes("speed") ? 2 : 0)}</div>
            <div className="trend-hero-unit">{def.unit}</div>
            <div className="trend-hero-sub">Latest</div>
          </div>
          <div className="trend-hero-right">
            <div className={`trend-delta ${improving ? "positive" : "negative"}`}>
              {delta > 0 ? "+" : ""}{delta.toFixed(def.key.includes("stride") ? 3 : 1)}
              <span className="trend-delta-pct">({deltaPct > 0 ? "+" : ""}{deltaPct.toFixed(1)}%)</span>
            </div>
            <div className="trend-delta-label">{improving ? "Improving" : "Declining"}</div>
          </div>
        </div>

        <div className="trend-spark-container">
          <svg viewBox={`0 0 ${sparkW} ${sparkH}`} className="trend-spark-svg" preserveAspectRatio="none">
            <defs>
              <linearGradient id={`grad-${activeKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={def.color} stopOpacity="0.3" />
                <stop offset="100%" stopColor={def.color} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d={`${sparkPath} L${sparkW},${sparkH} L0,${sparkH} Z`}
              fill={`url(#grad-${activeKey})`}
            />
            <path d={sparkPath} fill="none" stroke={def.color} strokeWidth="1.5" />
            {points.map((p, i) => {
              const x = points.length > 1 ? (i / (points.length - 1)) * sparkW : sparkW / 2;
              const y = sparkH - ((p.val - min) / range) * (sparkH - 4) - 2;
              return <circle key={i} cx={x} cy={y} r="1.8" fill={def.color} opacity={i === points.length - 1 ? 1 : 0.5} />;
            })}
          </svg>
          <div className="trend-spark-labels">
            {points.length > 0 && <span>{points[0].date}</span>}
            {points.length > 1 && <span>{points[points.length - 1].date}</span>}
          </div>
        </div>

        <div className="trend-stat-row">
          <div className="trend-stat">
            <div className="ts-value">{avg.toFixed(def.key.includes("stride") ? 3 : 1)}</div>
            <div className="ts-label">Average</div>
          </div>
          <div className="trend-stat">
            <div className="ts-value">{max.toFixed(def.key.includes("stride") ? 3 : 1)}</div>
            <div className="ts-label">Best</div>
          </div>
          <div className="trend-stat">
            <div className="ts-value">{min.toFixed(def.key.includes("stride") ? 3 : 1)}</div>
            <div className="ts-label">Worst</div>
          </div>
          <div className="trend-stat">
            <div className="ts-value">{points.length}</div>
            <div className="ts-label">Sessions</div>
          </div>
        </div>

        {/* Per-session bars */}
        <div className="trend-bars">
          {points.map((p, i) => {
            const pct = ((p.val - min) / range) * 100;
            return (
              <div key={i} className="trend-bar-wrap" title={`${p.date}: ${p.val.toFixed(2)} ${def.unit}`}>
                <div className="trend-bar" style={{ height: `${Math.max(4, pct)}%` }} />
                <span className="trend-bar-date">{p.date.slice(5)}</span>
              </div>
            );
          })}
        </div>
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
