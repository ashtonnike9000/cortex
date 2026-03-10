import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { fetchSummary, fetchAthlete } from "../api";
import { SHOES, NINE_BOX, RACING_LINE, analyzeShoeImpact, compareShoes } from "../data/shoes";
import "./ShoeLab.css";

export default function ShoeLab() {
  const [summary, setSummary] = useState(null);
  const [athletes, setAthletes] = useState([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState(null);
  const [athleteData, setAthleteData] = useState(null);
  const [shoeA, setShoeA] = useState("pegasus_42");
  const [shoeB, setShoeB] = useState("vaporfly_4");
  const [activeTab, setActiveTab] = useState("compare");

  useEffect(() => {
    fetchSummary().then((s) => {
      setSummary(s);
      if (s?.athletes?.length) {
        const validAthletes = s.athletes.filter((a) => a.avg_speed_mps);
        setAthletes(validAthletes);
        if (validAthletes.length) setSelectedAthleteId(validAthletes[0].id);
      }
    });
  }, []);

  useEffect(() => {
    if (selectedAthleteId) {
      fetchAthlete(selectedAthleteId).then(setAthleteData);
    }
  }, [selectedAthleteId]);

  const metrics = useMemo(() => {
    if (!athleteData?.aggregate?.metrics) return null;
    return athleteData.aggregate.metrics;
  }, [athleteData]);

  const comparison = useMemo(() => {
    const a = SHOES[shoeA];
    const b = SHOES[shoeB];
    return compareShoes(a, b);
  }, [shoeA, shoeB]);

  const impactA = useMemo(() => analyzeShoeImpact(metrics, SHOES[shoeA]), [metrics, shoeA]);
  const impactB = useMemo(() => analyzeShoeImpact(metrics, SHOES[shoeB]), [metrics, shoeB]);

  return (
    <div className="shoe-lab">
      <div className="sl-hero">
        <h1 className="sl-title">SHOE LAB</h1>
        <p className="sl-subtitle">
          How does footwear shape performance? Select shoes and an athlete to explore predicted biomechanical impact.
        </p>
      </div>

      {/* Athlete selector */}
      {athletes.length > 0 && (
        <div className="sl-athlete-bar">
          <span className="sl-athlete-label">Athlete baseline:</span>
          {athletes.map((a) => (
            <button
              key={a.id}
              className={`sl-athlete-btn ${selectedAthleteId === a.id ? "active" : ""}`}
              onClick={() => setSelectedAthleteId(a.id)}
            >
              {a.name}
            </button>
          ))}
        </div>
      )}

      {/* Tab bar */}
      <div className="sl-tabs">
        <button className={`sl-tab ${activeTab === "compare" ? "active" : ""}`} onClick={() => setActiveTab("compare")}>
          Compare Shoes
        </button>
        <button className={`sl-tab ${activeTab === "catalog" ? "active" : ""}`} onClick={() => setActiveTab("catalog")}>
          Shoe Catalog
        </button>
        <button className={`sl-tab ${activeTab === "impact" ? "active" : ""}`} onClick={() => setActiveTab("impact")}>
          Performance Impact
        </button>
      </div>

      {activeTab === "compare" && (
        <CompareView
          shoeA={shoeA}
          shoeB={shoeB}
          setShoeA={setShoeA}
          setShoeB={setShoeB}
          comparison={comparison}
          impactA={impactA}
          impactB={impactB}
          metrics={metrics}
          athleteName={athletes.find((a) => a.id === selectedAthleteId)?.name}
        />
      )}

      {activeTab === "catalog" && <CatalogView />}

      {activeTab === "impact" && metrics && (
        <ImpactView metrics={metrics} athleteName={athletes.find((a) => a.id === selectedAthleteId)?.name} />
      )}
    </div>
  );
}


function ShoeSelector({ value, onChange, label }) {
  const allShoes = Object.values(SHOES);
  return (
    <div className="shoe-selector">
      <label className="ss-label">{label}</label>
      <select className="ss-select" value={value} onChange={(e) => onChange(e.target.value)}>
        <optgroup label="Everyday — Pegasus">
          {allShoes.filter((s) => s.line === "pegasus").map((s) => (
            <option key={s.id} value={s.id}>{s.name} — {s.weight_g}g — ${s.price_usd}</option>
          ))}
        </optgroup>
        <optgroup label="Everyday — Structure">
          {allShoes.filter((s) => s.line === "structure").map((s) => (
            <option key={s.id} value={s.id}>{s.name} — {s.weight_g}g — ${s.price_usd}</option>
          ))}
        </optgroup>
        <optgroup label="Everyday — Vomero">
          {allShoes.filter((s) => s.line === "vomero").map((s) => (
            <option key={s.id} value={s.id}>{s.name} — {s.weight_g}g — ${s.price_usd}</option>
          ))}
        </optgroup>
        <optgroup label="Road Racing">
          {allShoes.filter((s) => s.category === "racing").map((s) => (
            <option key={s.id} value={s.id}>{s.name} — {s.weight_g}g — ${s.price_usd}</option>
          ))}
        </optgroup>
      </select>
    </div>
  );
}


function CompareView({ shoeA, shoeB, setShoeA, setShoeB, comparison, impactA, impactB, metrics, athleteName }) {
  const sA = SHOES[shoeA];
  const sB = SHOES[shoeB];
  if (!sA || !sB) return null;

  return (
    <div className="compare-view">
      <div className="compare-selectors">
        <ShoeSelector value={shoeA} onChange={setShoeA} label="Shoe A" />
        <div className="compare-vs">VS</div>
        <ShoeSelector value={shoeB} onChange={setShoeB} label="Shoe B" />
      </div>

      {/* Side-by-side spec cards */}
      <div className="compare-cards">
        <ShoeSpecCard shoe={sA} side="a" />
        <ShoeSpecCard shoe={sB} side="b" />
      </div>

      {/* Visual comparison bars */}
      <div className="compare-metrics">
        <h3 className="cm-title">Head-to-Head</h3>
        <CompareBar label="Weight" aVal={sA.weight_g} bVal={sB.weight_g} unit="g" lowerBetter />
        <CompareBar label="Stack (heel)" aVal={sA.stack_heel_mm} bVal={sB.stack_heel_mm} unit="mm" />
        <CompareBar label="Drop" aVal={sA.drop_mm} bVal={sB.drop_mm} unit="mm" />
        <CompareBar label="Price" aVal={sA.price_usd} bVal={sB.price_usd} unit="$" lowerBetter />
      </div>

      {/* Differences breakdown */}
      {comparison?.differences?.length > 0 && (
        <div className="compare-insights">
          <h3 className="ci-title">Key Differences</h3>
          {comparison.differences.map((d, i) => (
            <div key={i} className="ci-item">
              <div className="ci-metric">{d.metric}</div>
              <div className="ci-values">
                <span className="ci-a">{d.a}</span>
                <span className="ci-arrow">→</span>
                <span className="ci-b">{d.b}</span>
              </div>
              <div className="ci-insight">{d.insight}</div>
            </div>
          ))}
        </div>
      )}

      {/* Athlete-specific impact */}
      {metrics && athleteName && (
        <div className="compare-athlete-impact">
          <h3 className="cai-title">Predicted Impact on {athleteName}</h3>
          <div className="cai-cards">
            {impactA && <ImpactCard impact={impactA} shoe={sA} metrics={metrics} />}
            {impactB && <ImpactCard impact={impactB} shoe={sB} metrics={metrics} />}
          </div>
        </div>
      )}
    </div>
  );
}


function ShoeSpecCard({ shoe, side }) {
  const hasPlate = !!shoe.plate?.includes("carbon");
  return (
    <div className={`spec-card spec-${side}`}>
      <div className="spec-name">{shoe.name}</div>
      <div className="spec-price">${shoe.price_usd}</div>
      <div className="spec-tags">
        {shoe.category === "racing" && <span className="spec-tag racing">Racing</span>}
        {hasPlate && <span className="spec-tag carbon">Carbon Plate</span>}
        {shoe.foam?.includes("ZoomX") && <span className="spec-tag zoomx">ZoomX</span>}
        {shoe.air_unit && <span className="spec-tag air">Air Zoom</span>}
      </div>
      <div className="spec-grid">
        <div className="spec-row"><span className="sr-label">Weight</span><span className="sr-value">{shoe.weight_g}g</span></div>
        <div className="spec-row"><span className="sr-label">Stack</span><span className="sr-value">{shoe.stack_heel_mm}/{shoe.stack_forefoot_mm}mm</span></div>
        <div className="spec-row"><span className="sr-label">Drop</span><span className="sr-value">{shoe.drop_mm}mm</span></div>
        <div className="spec-row"><span className="sr-label">Foam</span><span className="sr-value">{shoe.foam}</span></div>
        {shoe.plate && <div className="spec-row"><span className="sr-label">Plate</span><span className="sr-value">{shoe.plate.includes("carbon") ? "Carbon Fiber" : shoe.plate}</span></div>}
      </div>
      <div className="spec-notes">{shoe.notes}</div>
    </div>
  );
}


function CompareBar({ label, aVal, bVal, unit, lowerBetter }) {
  if (aVal == null || bVal == null) return null;
  const maxVal = Math.max(aVal, bVal);
  const aPct = (aVal / maxVal) * 100;
  const bPct = (bVal / maxVal) * 100;
  const aWins = lowerBetter ? aVal < bVal : aVal > bVal;
  const bWins = !aWins && aVal !== bVal;

  return (
    <div className="compare-bar-row">
      <span className="cbr-label">{label}</span>
      <div className="cbr-bars">
        <div className="cbr-bar-wrap cbr-a">
          <div className={`cbr-bar ${aWins ? "cbr-winner" : ""}`} style={{ width: `${aPct}%` }} />
          <span className="cbr-val">{unit === "$" ? `$${aVal}` : `${aVal}${unit}`}</span>
        </div>
        <div className="cbr-bar-wrap cbr-b">
          <div className={`cbr-bar ${bWins ? "cbr-winner" : ""}`} style={{ width: `${bPct}%` }} />
          <span className="cbr-val">{unit === "$" ? `$${bVal}` : `${bVal}${unit}`}</span>
        </div>
      </div>
    </div>
  );
}


function ImpactCard({ impact, shoe, metrics }) {
  if (!impact) return null;
  const p = impact.predictions;
  return (
    <div className="impact-card">
      <div className="ic-shoe">{shoe.name}</div>
      <div className="ic-stats">
        <div className="ic-stat">
          <span className="ics-label">Speed</span>
          <span className="ics-value">{p.speed_mps?.toFixed(2)} m/s</span>
          <span className={`ics-change ${p.speed_change_pct > 0 ? "pos" : "neg"}`}>
            {p.speed_change_pct > 0 ? "+" : ""}{p.speed_change_pct}%
          </span>
        </div>
        {p.gct_ms && (
          <div className="ic-stat">
            <span className="ics-label">GCT</span>
            <span className="ics-value">{p.gct_ms} ms</span>
            <span className={`ics-change ${p.gct_change_ms < 0 ? "pos" : "neg"}`}>
              {p.gct_change_ms > 0 ? "+" : ""}{p.gct_change_ms} ms
            </span>
          </div>
        )}
        {p.cadence_spm && (
          <div className="ic-stat">
            <span className="ics-label">Cadence</span>
            <span className="ics-value">{p.cadence_spm} spm</span>
            <span className={`ics-change ${p.cadence_change_spm > 0 ? "pos" : "neg"}`}>
              {p.cadence_change_spm > 0 ? "+" : ""}{p.cadence_change_spm} spm
            </span>
          </div>
        )}
      </div>
      {impact.summary.length > 0 && (
        <div className="ic-insights">
          {impact.summary.map((s, i) => <div key={i} className="ic-insight">{s}</div>)}
        </div>
      )}
    </div>
  );
}


function CatalogView() {
  const [selectedShoe, setSelectedShoe] = useState(null);

  return (
    <div className="catalog-view">
      <div className="catalog-section">
        <h3 className="cat-section-title">Everyday Running — The 9 Box</h3>
        <p className="cat-section-desc">
          Three lines (Pegasus, Structure, Vomero) across three tiers (Icon, Plus, Premium).
          Each step up adds performance foam, plates, or Air units.
        </p>
        <div className="nine-box">
          <div className="nb-corner" />
          {NINE_BOX.cols.map((col) => (
            <div key={col.tier} className="nb-col-header">
              <div className="nb-tier-name">{col.label}</div>
              <div className="nb-tier-desc">{col.label === "Icon" ? "Essential" : col.label === "Plus" ? "Upgraded" : "Pinnacle"}</div>
            </div>
          ))}
          {NINE_BOX.rows.map((row) => (
            <>
              <div key={`label-${row.line}`} className="nb-row-header">{row.label}</div>
              {NINE_BOX.cols.map((col) => {
                const shoeId = NINE_BOX.mapping[`${row.line}-${col.tier}`];
                const shoe = shoeId ? SHOES[shoeId] : null;
                return (
                  <button
                    key={`${row.line}-${col.tier}`}
                    className={`nb-cell ${shoe ? "nb-has-shoe" : "nb-empty"} ${selectedShoe === shoeId ? "nb-selected" : ""}`}
                    onClick={() => shoe && setSelectedShoe(shoeId === selectedShoe ? null : shoeId)}
                  >
                    {shoe ? (
                      <>
                        <div className="nb-shoe-name">{shoe.name}</div>
                        <div className="nb-shoe-weight">{shoe.weight_g}g</div>
                        <div className="nb-shoe-price">${shoe.price_usd}</div>
                      </>
                    ) : (
                      <span className="nb-tbd">TBD</span>
                    )}
                  </button>
                );
              })}
            </>
          ))}
        </div>
      </div>

      <div className="catalog-section">
        <h3 className="cat-section-title">Road Racing Line</h3>
        <p className="cat-section-desc">
          Carbon-plated race shoes optimized for speed. From the ultra-light Streakfly (5K) to the marathon-dominant Alphafly.
        </p>
        <div className="racing-grid">
          {RACING_LINE.map(({ id }) => {
            const shoe = SHOES[id];
            if (!shoe) return null;
            const hasPlate = !!shoe.plate?.includes("carbon");
            return (
              <button
                key={id}
                className={`racing-card ${selectedShoe === id ? "rc-selected" : ""}`}
                onClick={() => setSelectedShoe(id === selectedShoe ? null : id)}
              >
                <div className="rc-name">{shoe.name}</div>
                <div className="rc-weight">{shoe.weight_g}g</div>
                <div className="rc-tags">
                  {hasPlate && <span className="rc-tag">Carbon</span>}
                  <span className="rc-tag">{shoe.drop_mm}mm drop</span>
                </div>
                <div className="rc-best">{shoe.best_for?.slice(0, 2).join(", ")}</div>
                <div className="rc-price">${shoe.price_usd}</div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedShoe && SHOES[selectedShoe] && (
        <ShoeDetail shoe={SHOES[selectedShoe]} onClose={() => setSelectedShoe(null)} />
      )}
    </div>
  );
}


function ShoeDetail({ shoe, onClose }) {
  return (
    <div className="shoe-detail">
      <div className="sd-header">
        <h3 className="sd-name">{shoe.name}</h3>
        <button className="sd-close" onClick={onClose}>Close</button>
      </div>
      <div className="sd-body">
        <div className="sd-specs">
          <div className="sd-spec"><span>Weight</span><span>{shoe.weight_g}g</span></div>
          <div className="sd-spec"><span>Stack</span><span>{shoe.stack_heel_mm}/{shoe.stack_forefoot_mm}mm</span></div>
          <div className="sd-spec"><span>Drop</span><span>{shoe.drop_mm}mm</span></div>
          <div className="sd-spec"><span>Foam</span><span>{shoe.foam}</span></div>
          {shoe.plate && <div className="sd-spec"><span>Plate</span><span>{shoe.plate}</span></div>}
          {shoe.air_unit && <div className="sd-spec"><span>Air Unit</span><span>{shoe.air_unit}</span></div>}
          <div className="sd-spec"><span>Price</span><span>${shoe.price_usd}</span></div>
        </div>
        <div className="sd-impact-grid">
          {Object.entries(shoe.expected_impact || {}).map(([k, v]) => (
            <div key={k} className="sd-impact-item">
              <span className="sdi-label">{k.replace(/_/g, " ")}</span>
              <span className={`sdi-value sdi-${v.includes("increase") || v.includes("high") || v === "maximum" ? "good" : v.includes("decrease") || v.includes("low") ? "concern" : "neutral"}`}>{v}</span>
            </div>
          ))}
        </div>
        <div className="sd-notes">{shoe.notes}</div>
        {shoe.key_tech?.length > 0 && (
          <div className="sd-tech">
            {shoe.key_tech.map((t, i) => <span key={i} className="sd-tech-tag">{t}</span>)}
          </div>
        )}
      </div>
    </div>
  );
}


function ImpactView({ metrics, athleteName }) {
  const allShoes = Object.values(SHOES);
  const impacts = useMemo(() => {
    return allShoes
      .map((shoe) => ({ shoe, impact: analyzeShoeImpact(metrics, shoe) }))
      .filter((x) => x.impact)
      .sort((a, b) => b.impact.predictions.speed_change_pct - a.impact.predictions.speed_change_pct);
  }, [metrics]);

  if (!impacts.length) return <div className="sl-empty">Select an athlete with run data to see impact analysis.</div>;

  const maxChange = Math.max(...impacts.map((x) => Math.abs(x.impact.predictions.speed_change_pct)));

  return (
    <div className="impact-view">
      <h3 className="iv-title">Predicted Speed Impact for {athleteName}</h3>
      <p className="iv-desc">
        Based on {athleteName}'s aggregate biomechanics, here's how each shoe is predicted to affect pace.
        Rankings are driven by weight, foam type, carbon plate presence, and drop.
      </p>
      <div className="iv-rankings">
        {impacts.map(({ shoe, impact }, i) => {
          const p = impact.predictions;
          const barPct = maxChange > 0 ? (p.speed_change_pct / maxChange) * 100 : 0;
          return (
            <div key={shoe.id} className="iv-row">
              <span className="ivr-rank">#{i + 1}</span>
              <span className="ivr-name">{shoe.name}</span>
              <div className="ivr-bar-track">
                <div
                  className={`ivr-bar ${p.speed_change_pct > 0 ? "ivr-pos" : "ivr-neg"}`}
                  style={{ width: `${Math.abs(barPct)}%` }}
                />
              </div>
              <span className={`ivr-pct ${p.speed_change_pct > 0 ? "pos" : "neg"}`}>
                {p.speed_change_pct > 0 ? "+" : ""}{p.speed_change_pct.toFixed(1)}%
              </span>
              <span className="ivr-speed">{p.speed_mps?.toFixed(2)} m/s</span>
              <span className="ivr-price">${shoe.price_usd}</span>
            </div>
          );
        })}
      </div>

      <div className="iv-caveat">
        Predictions are estimates based on published research on shoe weight, foam type, and carbon plate effects.
        Individual results vary significantly based on running form, foot strike, and training. These predictions
        will improve as real shoe-specific session data is collected.
      </div>
    </div>
  );
}
