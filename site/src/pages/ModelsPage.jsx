import { useEffect, useState, useMemo } from "react";
import { fetchSummary, fetchAthlete } from "../api";
import "./ModelsPage.css";

function fmtTime(s) {
  if (!s || s <= 0) return "—";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function ModelsPage() {
  const [summary, setSummary] = useState(null);
  const [athletes, setAthletes] = useState({});
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary().then((s) => {
      setSummary(s);
      const ids = (s.athletes || []).map((a) => a.id);
      Promise.all(ids.map((id) => fetchAthlete(id).then((d) => [id, d]))).then((results) => {
        const map = {};
        for (const [id, data] of results) map[id] = data;
        setAthletes(map);
        setSelected(ids);
        setLoading(false);
      });
    });
  }, []);

  const toggleAthlete = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectedAthletes = useMemo(
    () => selected.map((id) => athletes[id]).filter(Boolean),
    [selected, athletes]
  );

  if (loading) return <div className="models-loading">Loading model data...</div>;

  return (
    <div className="models-page">
      <div className="models-hero">
        <h1 className="models-title">PREDICTIVE MODELS</h1>
        <p className="models-subtitle">
          Race time estimation from biomechanical sensor data
        </p>
      </div>

      {/* Athlete Selector */}
      <section className="models-section">
        <h2 className="ms-heading">Select Athletes</h2>
        <p className="ms-desc">
          Choose which athletes to include in the analysis. Exclude athletes whose data may not
          represent typical running (e.g. other sports, equipment tests).
        </p>
        <div className="athlete-selector">
          {Object.values(athletes).map((a) => {
            const isSelected = selected.includes(a.id);
            const hasPredictions = a.race_predictions?.has_predictions;
            return (
              <button
                key={a.id}
                className={`as-btn ${isSelected ? "as-active" : ""} ${!hasPredictions ? "as-no-data" : ""}`}
                onClick={() => toggleAthlete(a.id)}
              >
                <span className="as-check">{isSelected ? "✓" : ""}</span>
                <span className="as-name">{a.name}</span>
                <span className="as-meta">
                  {a.session_count} sessions
                  {!hasPredictions && " · insufficient data"}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Methodology */}
      <section className="models-section">
        <h2 className="ms-heading">Methodology</h2>
        <div className="methodology-card">
          <MethodologyWalkthrough />
        </div>
      </section>

      {/* Per-Athlete Results */}
      {selectedAthletes.filter((a) => a.race_predictions?.has_predictions).length > 0 && (
        <section className="models-section">
          <h2 className="ms-heading">Predictions by Athlete</h2>
          <p className="ms-desc">
            Each athlete's model is independent — trained only on their own data.
          </p>
          <div className="athlete-results">
            {selectedAthletes.map((a) => (
              <AthleteModelCard key={a.id} athlete={a} />
            ))}
          </div>
        </section>
      )}

      {/* Comparison Table */}
      {selectedAthletes.filter((a) => a.race_predictions?.has_predictions).length >= 2 && (
        <section className="models-section">
          <h2 className="ms-heading">Head-to-Head Comparison</h2>
          <ComparisonTable athletes={selectedAthletes.filter((a) => a.race_predictions?.has_predictions)} />
        </section>
      )}

      {/* Fatigue Comparison */}
      {selectedAthletes.filter((a) => a.fatigue_profile?.has_data).length >= 2 && (
        <section className="models-section">
          <h2 className="ms-heading">Fatigue Resistance Comparison</h2>
          <FatigueComparison athletes={selectedAthletes.filter((a) => a.fatigue_profile?.has_data)} />
        </section>
      )}
    </div>
  );
}


function MethodologyWalkthrough() {
  return (
    <div className="meth-content">
      <div className="meth-step">
        <div className="meth-step-num">1</div>
        <div className="meth-step-body">
          <h3 className="meth-step-title">Determine Demonstrated Pace</h3>
          <p className="meth-text">
            From all recorded sessions, we extract per-mile splits and identify the athlete's
            <strong> top 10% fastest sustained miles</strong>. This represents the pace ceiling
            the athlete has demonstrated in training.
          </p>
          <div className="meth-formula">
            v<sub>sustained</sub> = mean(top 10% mile speeds)
          </div>
        </div>
      </div>

      <div className="meth-step">
        <div className="meth-step-num">2</div>
        <div className="meth-step-body">
          <h3 className="meth-step-title">Apply Distance-Fatigue Scaling (Riegel Model)</h3>
          <p className="meth-text">
            The Riegel formula is the standard for predicting race times at different distances.
            It models the relationship between pace and distance as a power law:
          </p>
          <div className="meth-formula meth-formula-big">
            T<sub>race</sub> = T<sub>mile</sub> × (D<sub>race</sub> / D<sub>mile</sub>)<sup>b</sup>
          </div>
          <p className="meth-text">
            The standard exponent <em>b</em> = 1.06 works for average recreational runners.
            We adjust it based on the athlete's observed fatigue rate — if their GCT increases
            more per mile, their muscles fatigue faster, so <em>b</em> increases (predicting
            relatively slower long-distance times).
          </p>
          <div className="meth-formula">
            b<sub>adjusted</sub> = 1.06 + (50 − fatigue_resistance) × 0.001
          </div>
        </div>
      </div>

      <div className="meth-step">
        <div className="meth-step-num">3</div>
        <div className="meth-step-body">
          <h3 className="meth-step-title">Biomechanical Efficiency Adjustment</h3>
          <p className="meth-text">
            We compute an efficiency score (0–100) from three biomechanical factors:
          </p>
          <ul className="meth-list">
            <li><strong>Ground Contact Time (GCT):</strong> Lower = more efficient. Elite runners: &lt;250ms, recreational: 300-400ms</li>
            <li><strong>Cadence:</strong> Higher cadence generally indicates more efficient turnover. Target: 170+ spm</li>
            <li><strong>Stride Length vs Speed:</strong> Stride should scale proportionally with speed. Over-striding penalizes efficiency.</li>
          </ul>
          <div className="meth-formula">
            T<sub>final</sub> = T<sub>race</sub> × (1 + (50 − efficiency) × 0.002)
          </div>
        </div>
      </div>

      <div className="meth-step">
        <div className="meth-step-num">4</div>
        <div className="meth-step-body">
          <h3 className="meth-step-title">Fatigue Resistance Score</h3>
          <p className="meth-text">
            The fatigue resistance score (0–100) measures how well mechanics hold up over distance.
            It's a weighted composite of per-mile drift rates:
          </p>
          <ul className="meth-list">
            <li><strong>GCT drift</strong> (30% weight) — How much ground contact time increases per mile</li>
            <li><strong>Stride shortening</strong> (25%) — How much stride length decreases per mile</li>
            <li><strong>Speed decay</strong> (25%) — How much pace drops per mile</li>
            <li><strong>Cadence decay</strong> (20%) — How much turnover rate decreases per mile</li>
          </ul>
          <div className="meth-formula">
            score = 100 − composite_drift × 15
          </div>
        </div>
      </div>

      <div className="meth-caveats">
        <h3 className="meth-step-title">Important Caveats</h3>
        <ul className="meth-list meth-caveats-list">
          <li>These predictions use <strong>training data</strong>, not race data. Race-day effort is typically 5–10% harder.</li>
          <li>Terrain, weather, pacing strategy, and race-day nutrition are not modeled.</li>
          <li>Predictions improve with more sessions, longer runs, and varied paces.</li>
          <li>Athletes with only short runs (&lt;1 mile) cannot generate predictions.</li>
          <li>The model is deterministic — same data always produces the same output. No randomness or ML training involved.</li>
        </ul>
      </div>
    </div>
  );
}


function AthleteModelCard({ athlete }) {
  const rp = athlete.race_predictions;
  const fp = athlete.fatigue_profile;
  if (!rp?.has_predictions) {
    return (
      <div className="amc-card amc-no-data">
        <div className="amc-name">{athlete.name}</div>
        <div className="amc-reason">{rp?.reason || "Insufficient data for predictions"}</div>
      </div>
    );
  }

  const preds = rp.predictions;
  const inputs = rp.model_inputs;

  return (
    <div className="amc-card">
      <div className="amc-header">
        <div className="amc-name">{athlete.name}</div>
        <div className="amc-session-count">{inputs.n_sessions_analyzed} sessions analyzed</div>
      </div>

      <div className="amc-predictions">
        {Object.entries(preds).map(([name, p]) => (
          <div key={name} className="amc-pred">
            <span className="amc-dist">{name}</span>
            <span className="amc-time">{p.predicted_time_fmt}</span>
            <span className="amc-pace">{p.predicted_pace_fmt}/mi</span>
          </div>
        ))}
      </div>

      <div className="amc-inputs">
        <h4 className="amc-inputs-title">Model Inputs</h4>
        <div className="amc-inputs-grid">
          <InputRow label="Best sustained pace" value={inputs.sustained_pace_fmt + "/mi"} />
          <InputRow label="Sustained speed" value={inputs.sustained_top_speed_mps?.toFixed(2) + " m/s"} />
          <InputRow label="Riegel exponent" value={inputs.riegel_adjusted_exponent?.toFixed(4)} />
          <InputRow label="Efficiency score" value={inputs.efficiency_score?.toFixed(0) + "/100"} />
          <InputRow label="Avg GCT" value={inputs.avg_gct_ms ? inputs.avg_gct_ms.toFixed(0) + " ms" : "—"} />
          <InputRow label="Avg Cadence" value={inputs.avg_cadence_spm ? inputs.avg_cadence_spm.toFixed(0) + " spm" : "—"} />
          <InputRow label="Avg Stride" value={inputs.avg_stride_len_m ? inputs.avg_stride_len_m.toFixed(3) + " m" : "—"} />
          <InputRow label="Fatigue resistance" value={inputs.fatigue_resistance_score != null ? inputs.fatigue_resistance_score + "/100" : "—"} />
          <InputRow label="Mile splits analyzed" value={inputs.n_mile_splits_analyzed} />
        </div>
      </div>
    </div>
  );
}

function InputRow({ label, value }) {
  return (
    <div className="amc-input-row">
      <span className="air-label">{label}</span>
      <span className="air-value">{value}</span>
    </div>
  );
}


function ComparisonTable({ athletes }) {
  const races = ["5K", "10K", "Half"];
  return (
    <div className="comp-table-wrap">
      <table className="comp-table">
        <thead>
          <tr>
            <th>Athlete</th>
            {races.map((r) => (
              <th key={r} colSpan={2}>{r}</th>
            ))}
            <th>Efficiency</th>
            <th>Fatigue Resist.</th>
          </tr>
          <tr className="comp-sub-header">
            <th></th>
            {races.map((r) => (
              <><th key={r + "t"}>Time</th><th key={r + "p"}>Pace</th></>
            ))}
            <th></th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {athletes.map((a) => {
            const preds = a.race_predictions?.predictions || {};
            const inputs = a.race_predictions?.model_inputs || {};
            return (
              <tr key={a.id}>
                <td className="comp-name">{a.name}</td>
                {races.map((r) => {
                  const p = preds[r];
                  return (
                    <>
                      <td key={r + "t"} className="comp-time">{p?.predicted_time_fmt || "—"}</td>
                      <td key={r + "p"} className="comp-pace">{p?.predicted_pace_fmt ? p.predicted_pace_fmt + "/mi" : "—"}</td>
                    </>
                  );
                })}
                <td>{inputs.efficiency_score?.toFixed(0) || "—"}</td>
                <td>{inputs.fatigue_resistance_score ?? "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}


function FatigueComparison({ athletes }) {
  return (
    <div className="fatigue-comp">
      <div className="fc-bars">
        {athletes
          .sort((a, b) => (b.fatigue_profile?.resistance_score || 0) - (a.fatigue_profile?.resistance_score || 0))
          .map((a) => {
            const score = a.fatigue_profile?.resistance_score || 0;
            const color = score >= 75 ? "var(--green)" : score >= 50 ? "var(--accent)" : "var(--amber)";
            return (
              <div key={a.id} className="fc-row">
                <span className="fc-name">{a.name}</span>
                <div className="fc-bar-track">
                  <div className="fc-bar-fill" style={{ width: `${score}%`, background: color }} />
                </div>
                <span className="fc-score" style={{ color }}>{score}</span>
              </div>
            );
          })}
      </div>
      <p className="fc-note">
        Higher resistance = mechanics degrade less over distance = better long-distance potential.
      </p>
    </div>
  );
}
