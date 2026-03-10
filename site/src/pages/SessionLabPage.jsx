import "./SessionLabPage.css";

// Realistic mock data for an elite female 800m runner (56.8 PB)
// Session: 5×500m at race pace, 3:30 recovery
const ATHLETE = {
  name: "Athlete K",
  event: "800m",
  pb: "1:56.8",
  targetPace: "~70s per 500m (race pace)",
  age: 24,
  weight_kg: 54,
};

const PRE_SESSION = {
  sleep: {
    source: "Oura Ring",
    score: 82,
    total_hours: 7.4,
    deep_pct: 21,
    rem_pct: 24,
    hrv_ms: 68,
    resting_hr: 42,
    body_temp: "+0.1°C",
    readiness: 84,
    note: "Solid sleep. HRV slightly below her 7-day avg (74ms) — may reflect residual fatigue from Tuesday's tempo.",
  },
  blood: {
    source: "Physiologist (monthly panel)",
    hemoglobin: 13.8,
    ferritin: 48,
    cortisol_am: 14.2,
    creatine_kinase: 189,
    testosterone: 1.8,
    vitD: 62,
    note: "Hemoglobin solid for altitude-trained athlete. CK slightly elevated (normal <170) — consistent with Monday's plyometrics. Ferritin trending down from 61 two months ago; worth monitoring.",
  },
  strength: {
    source: "Dane's S&C App",
    week_load_score: 72,
    sessions_this_week: 2,
    last_session: "Monday — Lower body (trap bar DL 3×5 @ 85kg, split squats, Nordic hamstrings)",
    soreness_reported: "Mild glute soreness (3/10)",
    cumulative_trend: "Load increasing 8% week-over-week for 3 weeks. Approaching planned deload.",
    note: "Two days post-lower-body lift. Loading has been progressive. Soreness is manageable but cumulative load is high heading into this quality session.",
  },
  training: {
    source: "Training Log / Coros",
    week_km: 68,
    week_sessions: 8,
    yesterday: "Easy 8km (4:45/km avg, HR 138)",
    two_days_ago: "REST",
    three_days_ago: "Monday: AM lift + PM 6km easy",
    race_in: "18 days (conference championships)",
    block: "Sharpening phase — volume down 15%, intensity up",
    note: "Middle of a sharpening block. Today's session is the key quality workout of the week — race-specific 500m repeats.",
  },
};

const REPS = [
  {
    rep: 1, time: "69.2s", avg_hr: 176, peak_hr: 182, recovery_hr: 128,
    avg_gct_ms: 186, avg_cadence: 208, avg_stride_m: 2.18, avg_vgrf_bw: 2.71,
    avg_fsa_deg: 8.2, asymmetry_gct_pct: 1.4, loading_rate: 48.2,
    gct_first_100m: 183, gct_last_100m: 188,
    notes: "Clean opener. Coming through 400 in ~55.4. Mechanics crisp. GCT flat through the rep. HR rises appropriately.",
  },
  {
    rep: 2, time: "69.8s", avg_hr: 179, peak_hr: 186, recovery_hr: 134,
    avg_gct_ms: 188, avg_cadence: 206, avg_stride_m: 2.16, avg_vgrf_bw: 2.74,
    avg_fsa_deg: 8.5, asymmetry_gct_pct: 1.8, loading_rate: 49.1,
    gct_first_100m: 185, gct_last_100m: 191,
    notes: "Marginally slower. GCT up 2ms — within noise. HR recovery between reps was 3:22. Slight FSA increase suggests minor foot-strike shift.",
  },
  {
    rep: 3, time: "70.6s", avg_hr: 183, peak_hr: 189, recovery_hr: 139,
    avg_gct_ms: 191, avg_cadence: 204, avg_stride_m: 2.14, avg_vgrf_bw: 2.78,
    avg_fsa_deg: 9.1, asymmetry_gct_pct: 2.6, loading_rate: 50.8,
    gct_first_100m: 187, gct_last_100m: 196,
    notes: "First signs of fatigue. GCT now +5ms from Rep 1. Cadence dropping — stride shortening to compensate. Recovery HR not fully coming down (139 vs 128). Asymmetry creeping up. Through 400 in ~56.5.",
  },
  {
    rep: 4, time: "71.4s", avg_hr: 186, peak_hr: 192, recovery_hr: 144,
    avg_gct_ms: 195, avg_cadence: 201, avg_stride_m: 2.11, avg_vgrf_bw: 2.82,
    avg_fsa_deg: 9.8, asymmetry_gct_pct: 3.9, loading_rate: 53.1,
    gct_first_100m: 190, gct_last_100m: 202,
    notes: "Clear fatigue pattern. GCT +9ms from Rep 1. Stride shortened 7cm. Asymmetry nearly tripled. Recovery HR barely dropping between reps. Loading rate increasing — she's landing harder as form degrades.",
  },
  {
    rep: 5, time: "72.3s", avg_hr: 189, peak_hr: 194, recovery_hr: null,
    avg_gct_ms: 199, avg_cadence: 198, avg_stride_m: 2.08, avg_vgrf_bw: 2.86,
    avg_fsa_deg: 10.4, asymmetry_gct_pct: 5.2, loading_rate: 55.7,
    gct_first_100m: 193, gct_last_100m: 208,
    notes: "Full mechanical degradation. GCT +13ms from Rep 1 (7% drift). Cadence dropped 10spm. Asymmetry at 5.2% — left side fatiguing faster. Last 100m GCT (208ms) is 25ms above first 100m of Rep 1. Through 400 in ~57.8 — 2.4s slower than opener.",
  },
];

const SESSION_TOTAL = {
  total_strides: 1840,
  total_distance_m: 2500,
  total_load: 4280,
  session_duration_min: 28,
  avg_recovery_sec: 210,
};

export default function SessionLabPage() {
  const rep1 = REPS[0];
  const rep5 = REPS[4];

  return (
    <div className="sl-page">

      {/* ── Hero ── */}
      <div className="sl-hero">
        <div className="sl-hero-content">
          <p className="sl-kicker">Multi-Source Session Intelligence</p>
          <h1 className="sl-title">
            THE<br />
            <span className="sl-accent">SESSION</span>
          </h1>
          <p className="sl-subtitle">
            What does a fully instrumented training session look like? 
            Every data source, every signal, one athlete, one workout.
          </p>
        </div>
      </div>

      {/* ── Athlete + Session ── */}
      <section className="sl-section">
        <div className="sl-athlete-bar">
          <div className="sl-athlete-info">
            <h2 className="sl-athlete-name">{ATHLETE.name}</h2>
            <p className="sl-athlete-event">{ATHLETE.event} — PB {ATHLETE.pb}</p>
          </div>
          <div className="sl-session-info">
            <span className="sl-session-badge">Today's Session</span>
            <p className="sl-session-desc">5 × 500m @ race pace ({ATHLETE.targetPace})</p>
            <p className="sl-session-sub">3:30 recovery · Track · Spikes</p>
          </div>
        </div>
      </section>

      <div className="sl-divider" />

      {/* ── Pre-Session Context ── */}
      <section className="sl-section">
        <p className="sl-section-label">Before the Session</p>
        <h2 className="sl-section-title">What Trevor Already Knows</h2>
        <p className="sl-text">
          Before the athlete steps on the track, the coaching team has a picture 
          assembled from four independent data sources. None of them talk to each other yet.
        </p>

        <div className="pre-grid">
          <PreCard
            icon="💤"
            source={PRE_SESSION.sleep.source}
            title="Recovery & Sleep"
            metrics={[
              { label: "Sleep Score", value: PRE_SESSION.sleep.score, unit: "/100" },
              { label: "Total Sleep", value: PRE_SESSION.sleep.total_hours, unit: "hrs" },
              { label: "HRV", value: PRE_SESSION.sleep.hrv_ms, unit: "ms" },
              { label: "Resting HR", value: PRE_SESSION.sleep.resting_hr, unit: "bpm" },
              { label: "Readiness", value: PRE_SESSION.sleep.readiness, unit: "/100" },
            ]}
            note={PRE_SESSION.sleep.note}
          />
          <PreCard
            icon="🩸"
            source={PRE_SESSION.blood.source}
            title="Blood Physiology"
            metrics={[
              { label: "Hemoglobin", value: PRE_SESSION.blood.hemoglobin, unit: "g/dL" },
              { label: "Ferritin", value: PRE_SESSION.blood.ferritin, unit: "ng/mL" },
              { label: "CK", value: PRE_SESSION.blood.creatine_kinase, unit: "U/L" },
              { label: "Cortisol (AM)", value: PRE_SESSION.blood.cortisol_am, unit: "μg/dL" },
              { label: "Vitamin D", value: PRE_SESSION.blood.vitD, unit: "ng/mL" },
            ]}
            note={PRE_SESSION.blood.note}
          />
          <PreCard
            icon="🏋️"
            source={PRE_SESSION.strength.source}
            title="Strength & Conditioning"
            metrics={[
              { label: "Week Load", value: PRE_SESSION.strength.week_load_score, unit: "/100" },
              { label: "Sessions", value: PRE_SESSION.strength.sessions_this_week, unit: "this week" },
              { label: "Soreness", value: "3", unit: "/10" },
            ]}
            note={PRE_SESSION.strength.note}
            extra={PRE_SESSION.strength.last_session}
          />
          <PreCard
            icon="🏃"
            source={PRE_SESSION.training.source}
            title="Training Context"
            metrics={[
              { label: "Week Volume", value: PRE_SESSION.training.week_km, unit: "km" },
              { label: "Sessions", value: PRE_SESSION.training.week_sessions, unit: "this week" },
              { label: "Race In", value: "18", unit: "days" },
            ]}
            note={PRE_SESSION.training.note}
            extra={`Block: ${PRE_SESSION.training.block}`}
          />
        </div>

        <div className="pre-synthesis">
          <h3 className="pre-synthesis-title">Pre-Session Read</h3>
          <p className="pre-synthesis-text">
            Readiness is good but not perfect. HRV is down slightly, CK is elevated from Monday's 
            lift, and cumulative S&C load is high. She's in a sharpening phase 18 days from 
            championships. This session matters — but pushing through compromised recovery 
            could backfire. Trevor greenlights the session but will watch the data closely.
          </p>
        </div>
      </section>

      <div className="sl-divider" />

      {/* ── Rep-by-Rep Telemetry ── */}
      <section className="sl-section">
        <p className="sl-section-label">During the Session</p>
        <h2 className="sl-section-title">Rep-by-Rep Telemetry</h2>
        <p className="sl-text">
          This is where it gets interesting. Coros captures HR and pace. Nike sensors capture 
          everything happening at the foot. Together, they tell a story neither can tell alone.
        </p>

        <div className="rep-table-wrap">
          <table className="rep-table">
            <thead>
              <tr>
                <th>Rep</th>
                <th>Time</th>
                <th>Avg HR</th>
                <th>GCT</th>
                <th>Cadence</th>
                <th>Stride</th>
                <th>vGRF</th>
                <th>Asym</th>
                <th>Load Rate</th>
              </tr>
            </thead>
            <tbody>
              {REPS.map((r, i) => {
                const gctDrift = r.avg_gct_ms - rep1.avg_gct_ms;
                const isLast = i === REPS.length - 1;
                return (
                  <tr key={r.rep} className={isLast ? "rep-row-last" : ""}>
                    <td className="rep-num">{r.rep}</td>
                    <td className="rep-time">{r.time}</td>
                    <td>{r.avg_hr} <span className="rep-sub">({r.peak_hr})</span></td>
                    <td>
                      {r.avg_gct_ms}
                      {gctDrift > 0 && <span className="rep-drift">+{gctDrift}</span>}
                    </td>
                    <td>{r.avg_cadence}</td>
                    <td>{r.avg_stride_m.toFixed(2)}</td>
                    <td>{r.avg_vgrf_bw.toFixed(2)}</td>
                    <td className={r.asymmetry_gct_pct > 3 ? "rep-warn" : ""}>{r.asymmetry_gct_pct}%</td>
                    <td>{r.loading_rate}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Rep-by-rep chart */}
        <RepChart reps={REPS} />

        {/* Rep detail cards */}
        <div className="rep-cards">
          {REPS.map((r) => (
            <div key={r.rep} className={`rep-card ${r.rep >= 4 ? "rep-card-fatigue" : ""}`}>
              <div className="rc-header">
                <span className="rc-num">Rep {r.rep}</span>
                <span className="rc-time">{r.time}</span>
              </div>
              <div className="rc-metrics">
                <RcMetric label="HR" value={`${r.avg_hr}/${r.peak_hr}`} unit="bpm" />
                <RcMetric label="GCT" value={r.avg_gct_ms} unit="ms" />
                <RcMetric label="Cadence" value={r.avg_cadence} unit="spm" />
                <RcMetric label="Asymmetry" value={`${r.asymmetry_gct_pct}%`} warn={r.asymmetry_gct_pct > 3} />
              </div>
              <div className="rc-gct-range">
                <span className="rc-gct-label">GCT first 100m → last 100m:</span>
                <span className="rc-gct-values">{r.gct_first_100m} → {r.gct_last_100m} ms</span>
              </div>
              {r.recovery_hr && (
                <div className="rc-recovery">Recovery HR: {r.recovery_hr} bpm</div>
              )}
              <p className="rc-notes">{r.notes}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="sl-divider" />

      {/* ── The Story ── */}
      <section className="sl-section">
        <p className="sl-section-label">The Synthesis</p>
        <h2 className="sl-section-title">What the Data Tells Us</h2>

        <div className="story-grid">
          <StoryCard
            heading="The Fatigue Curve"
            body={`GCT drifted from ${rep1.avg_gct_ms}ms to ${rep5.avg_gct_ms}ms across 5 reps — a ${rep5.avg_gct_ms - rep1.avg_gct_ms}ms increase (${((rep5.avg_gct_ms - rep1.avg_gct_ms) / rep1.avg_gct_ms * 100).toFixed(1)}%). This is within acceptable range for race-pace work, but the acceleration between reps 3-5 suggests she's entering the session with some residual neuromuscular fatigue — consistent with the elevated CK and slightly depressed HRV.`}
          />
          <StoryCard
            heading="The Asymmetry Signal"
            body={`Asymmetry went from ${rep1.asymmetry_gct_pct}% (negligible) to ${rep5.asymmetry_gct_pct}% (notable) — left side fatiguing faster. This wasn't visible in reps 1-2 but emerged under accumulated load. Monday's single-leg work (split squats) may have left one side more depleted. Worth checking: is this pattern consistent across sessions, or specific to post-lift days?`}
          />
          <StoryCard
            heading="HR × Mechanics Divergence"
            body={`Reps 1-3: HR rises but mechanics hold — normal cardiovascular response. Reps 4-5: HR is still climbing but mechanics are now degrading independently. This divergence is the neuromuscular fatigue signal — the cardiovascular system is coping but the muscular system is not. Coros alone sees HR rising. Only the sensors see the form breaking down.`}
          />
          <StoryCard
            heading="Recovery Tells a Story"
            body={`Recovery HR between reps: 128 → 134 → 139 → 144. Each rep takes longer to come down. Combined with the increasing GCT, this suggests she's not fully clearing fatigue between reps. In a race, she has no recovery periods — this pattern predicts where the 800m will get hard: the third 200m, when accumulated oxygen debt meets neuromuscular fatigue.`}
          />
        </div>
      </section>

      <div className="sl-divider" />

      {/* ── What Each Person Learns ── */}
      <section className="sl-section">
        <p className="sl-section-label">The Outputs</p>
        <h2 className="sl-section-title">Who Learns What</h2>

        <div className="learns-grid">
          <LearnsCard
            role="Trevor (Coach)"
            items={[
              "Reps 1-3 were productive. Reps 4-5 showed enough degradation that 6 reps would have been counterproductive.",
              "The asymmetry pattern post-lift day is new information — adjust S&C timing relative to quality sessions.",
              "Recovery HR decay rate can predict race-day fatigue onset: she'll start struggling around the third 200m.",
              "Sharpening block is working — Rep 1 mechanics are sharper than same session 4 weeks ago.",
              "Her fatigue onset is muscular, not cardiovascular. Training implication: more strength endurance, not more intervals.",
            ]}
          />
          <LearnsCard
            role="The Physiologist"
            items={[
              "CK of 189 correlates with measurable GCT drift — useful threshold for flagging when athletes are too loaded for quality work.",
              "HRV dip of 6ms from 7-day avg predicted the faster-than-normal fatigue progression. Calibrating HRV → readiness for this athlete.",
              "Ferritin trending down (61 → 48 in 2 months) hasn't shown up in performance yet but may start to. Mechanical efficiency could be an early warning before pace suffers.",
              "The bi-carb loading study: if Maurten's protocol delays the GCT drift onset by even 1 rep, that's a measurable, biomechanical confirmation of efficacy.",
            ]}
          />
          <LearnsCard
            role="Dane (S&C)"
            items={[
              "Monday lower body session is showing up Thursday in asymmetry data — 3 days isn't enough recovery before quality track work.",
              "Loading rate increase across reps (+15.6%) tells him which muscles are failing to absorb force — hamstrings and calves are the likely limiters.",
              "The trap bar DL is building general strength, but the single-leg deficit is real. Nordic hamstring and split squat progression should continue.",
              "Cumulative load score of 72 + this track session = planned deload next week is correctly timed.",
            ]}
          />
          <LearnsCard
            role="Nike (Product + Science)"
            items={[
              "How do racing spikes perform as the athlete fatigues? Does the spike's stiffness help or hurt when GCT increases 13ms?",
              "At 2.86 BW peak force in Rep 5 — what's the loading profile in the forefoot? Is the plate still returning energy or has the athlete's ankle stiffness dropped below the threshold where it helps?",
              "Asymmetry data across 50+ athletes in spikes vs. trainers: does the spike amplify or dampen bilateral differences?",
              "If GCT drift at race pace is a universal fatigue marker, can a shoe be designed to mitigate it? What midsole properties delay ground contact time degradation?",
              "This athlete's FSA shifted from 8.2° to 10.4° as she fatigued — she's transitioning toward a more heel-dominant strike. Does the spike's geometry support that transition, or fight it?",
            ]}
          />
        </div>
      </section>

      <div className="sl-divider" />

      {/* ── The Compound Effect ── */}
      <section className="sl-section">
        <p className="sl-section-label">The Compound Effect</p>
        <h2 className="sl-section-title">What No Single Source Can See</h2>
        <p className="sl-text">
          Each data source alone tells a fragment. The value is in the connections between them.
        </p>

        <div className="compound-list">
          <CompoundItem
            sources="Sleep + Biomechanics"
            finding="HRV was 6ms below average. GCT fatigue rate was 40% faster than her baseline session. The sleep data predicted the mechanical outcome."
          />
          <CompoundItem
            sources="S&C + Asymmetry"
            finding="Monday's unilateral lift appears in Thursday's bilateral data. The asymmetry didn't exist in Tuesday's easy run — it's load-dependent and emerges only at race pace."
          />
          <CompoundItem
            sources="Blood + Efficiency"
            finding="Ferritin has dropped 21% in 2 months. Her pace is holding. But her loading rate per rep is up 4% vs. the same session 8 weeks ago — she's working harder mechanically for the same speed. The efficiency loss precedes the pace loss."
          />
          <CompoundItem
            sources="HR + GCT"
            finding="Cardiac drift and mechanical drift separate after Rep 3. The heart is coping; the muscles aren't. This distinction determines whether the intervention is aerobic training or strength training."
          />
          <CompoundItem
            sources="All Sources → Race Prediction"
            finding="Based on today's fatigue profile, race-day pacing model says: go out at 27.0 for the first 200m (not 26.5), because the neuromuscular reserve won't support a negative split from a fast start with current CK and S&C load."
          />
        </div>
      </section>

      {/* ── Coda ── */}
      <div className="sl-coda">
        <p className="sl-coda-line">
          One session. Five reps. Four data sources.<br />
          <strong>One picture that none of them can build alone.</strong>
        </p>
        <p className="sl-coda-sub">
          This is what the pit wall looks like for running. Not a dashboard — 
          a synthesis engine that connects sleep to stride, blood to biomechanics, 
          and load to performance. The data exists. The connections are where 
          the intelligence lives.
        </p>
      </div>
    </div>
  );
}


/* ── Rep Chart ── */

const CHART_METRICS = [
  { key: "avg_gct_ms", label: "GCT (ms)", color: "#30d158", unit: "ms" },
  { key: "avg_hr", label: "Avg HR", color: "#ff453a", unit: "bpm" },
  { key: "avg_cadence", label: "Cadence", color: "#ffd60a", unit: "spm" },
  { key: "asymmetry_gct_pct", label: "Asymmetry", color: "#ff9f0a", unit: "%" },
  { key: "loading_rate", label: "Load Rate", color: "#64d2ff", unit: "BW/s" },
];

function RepChart({ reps }) {
  const W = 600, H = 260, PAD_L = 48, PAD_R = 16, PAD_T = 24, PAD_B = 36;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  return (
    <div className="rep-chart-section">
      <h3 className="rep-chart-title">Rep-by-Rep Progression</h3>
      <div className="rep-chart-legend">
        {CHART_METRICS.map((m) => (
          <span key={m.key} className="rcl-item">
            <span className="rcl-dot" style={{ background: m.color }} />
            {m.label}
          </span>
        ))}
      </div>
      <div className="rep-chart-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} className="rep-chart-svg">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
            const y = PAD_T + plotH * (1 - pct);
            return (
              <line key={pct} x1={PAD_L} y1={y} x2={W - PAD_R} y2={y}
                stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            );
          })}

          {/* Rep labels */}
          {reps.map((r, i) => {
            const x = PAD_L + (i / (reps.length - 1)) * plotW;
            return (
              <text key={i} x={x} y={H - 8} textAnchor="middle"
                fontSize="11" fill="#8e8e93" fontFamily="Inter, sans-serif" fontWeight="600">
                Rep {r.rep}
              </text>
            );
          })}

          {/* Lines for each metric (normalized to 0-1 range) */}
          {CHART_METRICS.map((m) => {
            const vals = reps.map((r) => r[m.key]);
            const min = Math.min(...vals);
            const max = Math.max(...vals);
            const range = max - min || 1;

            const points = reps.map((r, i) => {
              const x = PAD_L + (i / (reps.length - 1)) * plotW;
              const y = PAD_T + plotH - ((r[m.key] - min) / range) * plotH;
              return `${x},${y}`;
            });

            const dotPoints = reps.map((r, i) => ({
              x: PAD_L + (i / (reps.length - 1)) * plotW,
              y: PAD_T + plotH - ((r[m.key] - min) / range) * plotH,
              val: r[m.key],
            }));

            return (
              <g key={m.key}>
                <polyline
                  points={points.join(" ")}
                  fill="none"
                  stroke={m.color}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {dotPoints.map((p, i) => (
                  <g key={i}>
                    <circle cx={p.x} cy={p.y} r="4" fill={m.color} />
                    <text x={p.x} y={p.y - 8} textAnchor="middle"
                      fontSize="9" fill={m.color} fontFamily="Inter, sans-serif" fontWeight="700">
                      {m.key === "asymmetry_gct_pct" ? `${p.val}%` : p.val}
                    </text>
                  </g>
                ))}
              </g>
            );
          })}
        </svg>
      </div>
      <p className="rep-chart-note">
        Each metric is independently scaled to show its own progression. 
        All lines trending upward indicate increasing fatigue load.
      </p>
    </div>
  );
}


/* ── Helper Components ── */

function PreCard({ icon, source, title, metrics, note, extra }) {
  return (
    <div className="pre-card">
      <div className="pre-card-top">
        <span className="pre-icon">{icon}</span>
        <div>
          <h3 className="pre-title">{title}</h3>
          <p className="pre-source">{source}</p>
        </div>
      </div>
      <div className="pre-metrics">
        {metrics.map((m, i) => (
          <div key={i} className="pre-metric">
            <span className="pre-metric-value">{m.value}</span>
            <span className="pre-metric-unit">{m.unit}</span>
            <span className="pre-metric-label">{m.label}</span>
          </div>
        ))}
      </div>
      {extra && <p className="pre-extra">{extra}</p>}
      <p className="pre-note">{note}</p>
    </div>
  );
}

function RcMetric({ label, value, unit, warn }) {
  return (
    <div className={`rc-metric ${warn ? "rc-metric-warn" : ""}`}>
      <span className="rc-metric-value">{value}</span>
      {unit && <span className="rc-metric-unit">{unit}</span>}
      <span className="rc-metric-label">{label}</span>
    </div>
  );
}

function StoryCard({ heading, body }) {
  return (
    <div className="story-card">
      <h3 className="story-heading">{heading}</h3>
      <p className="story-body">{body}</p>
    </div>
  );
}

function LearnsCard({ role, items }) {
  return (
    <div className="learns-card">
      <h3 className="learns-role">{role}</h3>
      <ul className="learns-items">
        {items.map((item, i) => (
          <li key={i} className="learns-item">{item}</li>
        ))}
      </ul>
    </div>
  );
}

function CompoundItem({ sources, finding }) {
  return (
    <div className="compound-item">
      <code className="compound-sources">{sources}</code>
      <p className="compound-finding">{finding}</p>
    </div>
  );
}
