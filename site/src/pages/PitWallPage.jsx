import "./PitWallPage.css";

export default function PitWallPage() {
  return (
    <div className="pw-page">

      {/* ── Hero ────────────────────────────────────────────── */}
      <div className="pw-hero">
        <div className="pw-hero-content">
          <p className="pw-kicker">The F1 of Human Racing</p>
          <h1 className="pw-title">
            THE PIT<br />
            <span className="pw-accent">WALL</span>
          </h1>
          <p className="pw-subtitle">
            The athlete is the car. The shoe is the tire. The coach is the race engineer.
            <br />
            <strong>What if we could read a runner the way F1 reads a car?</strong>
          </p>
        </div>
      </div>

      {/* ── The F1 Analogy ─────────────────────────────────── */}
      <section className="pw-section">
        <p className="pw-section-label">The Analogy</p>
        <h2 className="pw-section-title">Telemetry Changed Motorsport. It Will Change Running.</h2>
        <p className="pw-text">
          In Formula 1, hundreds of sensors read the car every millisecond — tire degradation, fuel load, 
          engine temperature, aerodynamic balance. The race engineer on the pit wall synthesizes these signals 
          and makes real-time decisions that win or lose the race. The driver feels the car. The data 
          confirms — or contradicts — what they feel.
        </p>
        <p className="pw-text">
          Elite running is approaching the same inflection point. The ecosystem is building out: recovery 
          tracking, training load management, nutrition optimization, physiological testing. But one layer 
          is missing — the telemetry itself. <em>What is actually happening when foot meets ground?</em>
        </p>

        <div className="f1-map">
          <div className="f1-row f1-row-header">
            <span className="f1-col-label">Formula 1</span>
            <span className="f1-col-arrow" />
            <span className="f1-col-label">Running</span>
          </div>
          <F1Row left="The Car" right="The Runner" accent />
          <F1Row left="The Tires" right="The Shoe" accent />
          <F1Row left="Race Engineer" right="The Coach" />
          <F1Row left="Telemetry Sensors" right="Underfoot Sensing" accent />
          <F1Row left="Engine Diagnostics" right="Recovery (Oura, WHOOP)" />
          <F1Row left="Fuel Strategy" right="Nutrition (Maurten, CGMs)" />
          <F1Row left="Chassis Maintenance" right="S&C Load (Dane's App)" />
          <F1Row left="Wind Tunnel Data" right="Lab Testing (Physiologist)" />
          <F1Row left="Pit Wall" right="Cortex" accent />
        </div>
      </section>

      <div className="pw-divider" />

      {/* ── The Ecosystem Today ────────────────────────────── */}
      <section className="pw-section">
        <p className="pw-section-label">The Ecosystem</p>
        <h2 className="pw-section-title">Everyone Is Measuring Around the Run</h2>
        <p className="pw-text">
          The elite running data landscape is growing fast — but it's fragmented. Each tool 
          answers a different question. None of them answer the most important one.
        </p>

        <div className="eco-grid">
          <EcoSilo
            icon="💤"
            name="Recovery"
            tools="Oura Ring · WHOOP"
            question="How recovered am I?"
            signals="HRV, sleep quality, readiness score, body temperature"
            when="Between runs"
          />
          <EcoSilo
            icon="🏋️"
            name="Training Load"
            tools="S&C Apps · TrainingPeaks"
            question="How much total stress am I carrying?"
            signals="Volume across modalities — runs, gym, conditioning"
            when="Aggregated weekly"
          />
          <EcoSilo
            icon="🧪"
            name="Physiology"
            tools="Lab Testing · Physiologist"
            question="What are my thresholds?"
            signals="VO2max, lactate threshold, running economy"
            when="Point-in-time tests"
          />
          <EcoSilo
            icon="⚡"
            name="Fueling"
            tools="Maurten · CGMs"
            question="Am I fueled correctly?"
            signals="Glycogen availability, bicarbonate loading, hydration"
            when="Pre/during/post run"
          />
        </div>

        <div className="eco-gap">
          <div className="eco-gap-line" />
          <div className="eco-gap-center">
            <div className="eco-gap-icon">?</div>
            <p className="eco-gap-question">What is my body actually doing when I run?</p>
            <p className="eco-gap-sub">
              Every stride. Both feet. Ground contact, force, angle, cadence, asymmetry, fatigue — 
              measured continuously, not estimated.
            </p>
          </div>
          <div className="eco-gap-line" />
        </div>

        <div className="eco-answer">
          <div className="eco-answer-badge">Nike Underfoot Sensing</div>
          <p className="eco-answer-text">
            The only signal source that captures what happens <em>during</em> the run, at the 
            stride level, for each foot independently. This is the telemetry layer. Everything 
            else measures around it.
          </p>
        </div>
      </section>

      <div className="pw-divider" />

      {/* ── What Only Nike Can See ─────────────────────────── */}
      <section className="pw-section">
        <p className="pw-section-label">The Telemetry Feed</p>
        <h2 className="pw-section-title">What Only Underfoot Sensing Reveals</h2>
        <p className="pw-text">
          These aren't hypothetical. These are real capabilities demonstrated in Cortex today, 
          from actual athlete sessions. No watch, ring, or blood marker can see any of this.
        </p>

        <div className="telem-grid">
          <TelemCard
            signal="Fatigue Signature"
            metric="GCT drift +12ms"
            context="Mile 14 → Mile 18"
            insight="Invisible to pace, invisible to heart rate. The body is compensating — ground contact creeps up as neuromuscular fatigue accumulates. The runner doesn't feel it yet. The data already sees it."
            invisible="Watch, HR monitor, Oura"
          />
          <TelemCard
            signal="Asymmetry Under Load"
            metric="Right foot +8% loading"
            context="At race pace"
            insight="One side is absorbing significantly more force than the other. This bilateral imbalance is an injury risk signal that no wrist-based device can detect. It only appears under load — easy runs look symmetrical."
            invisible="Watch, GPS, RPE"
          />
          <TelemCard
            signal="Shoe–Mechanics Interaction"
            metric="GCT −6ms, Loading Rate −11%"
            context="Vaporfly vs. Pegasus, same athlete"
            insight="Product impact quantified per individual. Not marketing claims — measured biomechanical changes from footwear on this specific runner's body. This is how you prove product performance."
            invisible="All non-footwear sensors"
          />
          <TelemCard
            signal="Form Breakdown Timing"
            metric="Stride −4cm in final 5K"
            context="Half marathon"
            insight="When exactly does form break down? Is it trainable? Is it shoe-dependent? Is it nutrition-related? The stride data pinpoints the mile — everything else is just pace slowing down."
            invisible="GPS pace, HR, lab tests"
          />
          <TelemCard
            signal="Mechanical vs. Training Load"
            metric="Same 10 miles, 2x mechanical cost"
            context="Fresh vs. accumulated fatigue"
            insight="Dane's app tracks volume. Nike tracks how that volume lands. Same distance, same pace, but vGRF impulse and loading rate tell a completely different story about what the body absorbed."
            invisible="Volume-based load tracking"
          />
        </div>
      </section>

      <div className="pw-divider" />

      {/* ── The Integration Vision ─────────────────────────── */}
      <section className="pw-section">
        <p className="pw-section-label">The Integration</p>
        <h2 className="pw-section-title">One Pit Wall</h2>
        <p className="pw-text">
          Nike's underfoot data is valuable alone. Combined with the other signals in the ecosystem, 
          it becomes exponentially more powerful. This is where the race engineer sits — synthesizing 
          every feed into one picture.
        </p>

        <div className="integration-cards">
          <IntegrationCard
            sources="Oura Readiness + Nike Mechanics"
            scenario="You slept 4 hours. Your GCT is 15ms above baseline."
            decision="Today is not the day for the tempo session."
            color="purple"
          />
          <IntegrationCard
            sources="S&C Load + Nike Load"
            scenario="Weekly mechanical load trending up 20%. S&C volume is flat."
            decision="The extra stress is coming from the runs, not the gym. Adjust volume."
            color="cyan"
          />
          <IntegrationCard
            sources="Maurten Protocol + Nike Fatigue"
            scenario="Fatigue onset moved from mile 12 to mile 16 after switching to bi-carb loading."
            decision="The nutrition change is working — 4 extra miles before mechanical breakdown."
            color="amber"
          />
          <IntegrationCard
            sources="Physiologist Thresholds + Nike Real-Time"
            scenario="Crossed lactate threshold pace at mile 6. GCT confirms: mechanics degraded within 0.3 miles."
            decision="The lab threshold is validated in the field. Pace ceiling is biomechanically confirmed."
            color="red"
          />
        </div>
      </section>

      <div className="pw-divider" />

      {/* ── Three Audiences ────────────────────────────────── */}
      <section className="pw-section">
        <p className="pw-section-label">The Output</p>
        <h2 className="pw-section-title">Same Data. Three Audiences.</h2>
        <p className="pw-text">
          Every insight from underfoot sensing serves three stakeholders simultaneously. 
          The same analysis, translated for each.
        </p>

        <div className="audience-grid">
          <AudienceCard
            icon="🏃"
            audience="The Coach"
            name="Trevor & the Physiologist"
            items={[
              "Session-by-session biomechanical trends across the group",
              "Fatigue onset tracking — which athletes are accumulating mechanical debt",
              "Asymmetry monitoring — early warning before injury manifests",
              "Readiness-informed training: mechanics confirm or override the plan",
              "Individual mechanical profiles for pacing race day strategy",
            ]}
          />
          <AudienceCard
            icon="👟"
            audience="The Athlete"
            name="The M11 Runners"
            items={[
              "Smoothed pace with biomechanical context — not just 'how fast' but 'how efficiently'",
              "Personal baselines — what 'your normal' looks like, and when you deviate",
              "Shoe impact on their mechanics — which footwear optimizes their stride",
              "Fatigue profiles — how their body breaks down and where to focus training",
              "Recovery validation — mechanics confirming body is (or isn't) ready",
            ]}
          />
          <AudienceCard
            icon="⚙️"
            audience="Product"
            name="Nike"
            items={[
              "Population-scale biomechanical data across shoe models in real training",
              "Real-world performance validation — not lab tests, actual race-day data",
              "Individual fit and response profiles that inform design",
              "Material degradation signals from changing mechanics over shoe life",
              "The feedback loop: athlete data flows into what gets built next",
            ]}
          />
        </div>
      </section>

      <div className="pw-divider" />

      {/* ── The 20-Miler ──────────────────────────────────── */}
      <section className="pw-section">
        <p className="pw-section-label">The Proof Point</p>
        <h2 className="pw-section-title">The 20-Miler That Got Away</h2>
        <p className="pw-text pw-text-italic">
          "It would've been great to wear your sensors for the 20 miler!!"
        </p>
        <p className="pw-text">
          That 20-miler is exactly the session where underfoot sensing matters most. 
          Here's what we would have captured:
        </p>

        <div className="twenty-miler">
          <div className="tm-stat-row">
            <TmStat value="~32,000" label="strides" />
            <TmStat value="~16,000" label="per foot" />
            <TmStat value="20" label="mile splits" />
            <TmStat value="~90" label="minutes of telemetry" />
          </div>

          <div className="tm-timeline">
            <TmMile
              range="Miles 1–4"
              title="Warmup Phase"
              detail="Establishing baseline mechanics. GCT, cadence, stride length all at fresh-state values. This is the reference point everything else gets compared to."
            />
            <TmMile
              range="Miles 5–10"
              title="Steady State"
              detail="Mechanics hold. This is where we learn the athlete's efficient operating range — the cruise speed where their biomechanics are most stable."
            />
            <TmMile
              range="Miles 11–14"
              title="The First Drift"
              detail="GCT starts creeping up 2-3ms. Cadence drops slightly. The runner doesn't notice. The pace hasn't changed. But the body is beginning to compensate."
            />
            <TmMile
              range="Miles 15–17"
              title="Fatigue Onset"
              detail="The drift accelerates. Stride shortens. Loading rate increases as form degrades. Asymmetry may appear — one side fatiguing faster. This is where injury risk compounds."
            />
            <TmMile
              range="Miles 18–20"
              title="The Wall"
              detail="Full mechanical degradation. GCT potentially +15-20ms above baseline. Stride shortened 5-8cm. Force distribution shifted. This data answers: is this trainable? Is the shoe helping or hurting? Is the nutrition protocol extending the onset?"
            />
          </div>

          <div className="tm-punchline">
            <p className="tm-punchline-text">
              No watch captures this. No ring captures this. No blood marker captures this.
              <br />
              <strong>Only what's between the foot and the ground tells this story.</strong>
            </p>
          </div>
        </div>
      </section>

      {/* ── Coda ───────────────────────────────────────────── */}
      <div className="pw-coda">
        <p className="pw-coda-line">
          Nike doesn't compete with Oura. Nike doesn't compete with Maurten.<br />
          Nike provides the layer they can't.
        </p>
        <p className="pw-coda-sub">
          The question isn't whether elite running will become data-driven — it already is. 
          The question is whether Nike owns the most important signal.
        </p>
        <p className="pw-coda-final">What happens when foot meets ground.</p>
      </div>
    </div>
  );
}


/* ── Helper Components ──────────────────────────────────────── */

function F1Row({ left, right, accent }) {
  return (
    <div className={`f1-row ${accent ? "f1-row-accent" : ""}`}>
      <span className="f1-left">{left}</span>
      <span className="f1-arrow">→</span>
      <span className="f1-right">{right}</span>
    </div>
  );
}

function EcoSilo({ icon, name, tools, question, signals, when }) {
  return (
    <div className="eco-silo">
      <div className="eco-silo-icon">{icon}</div>
      <h3 className="eco-silo-name">{name}</h3>
      <p className="eco-silo-tools">{tools}</p>
      <p className="eco-silo-question">"{question}"</p>
      <p className="eco-silo-signals">{signals}</p>
      <p className="eco-silo-when">{when}</p>
    </div>
  );
}

function TelemCard({ signal, metric, context, insight, invisible }) {
  return (
    <div className="telem-card">
      <div className="tc-header">
        <h3 className="tc-signal">{signal}</h3>
        <div className="tc-metric-row">
          <code className="tc-metric">{metric}</code>
          <span className="tc-context">{context}</span>
        </div>
      </div>
      <p className="tc-insight">{insight}</p>
      <div className="tc-invisible">
        <span className="tc-invisible-label">Invisible to:</span> {invisible}
      </div>
    </div>
  );
}

function IntegrationCard({ sources, scenario, decision, color }) {
  return (
    <div className={`int-card int-${color}`}>
      <p className="int-sources">{sources}</p>
      <p className="int-scenario">{scenario}</p>
      <p className="int-decision">{decision}</p>
    </div>
  );
}

function AudienceCard({ icon, audience, name, items }) {
  return (
    <div className="aud-card">
      <div className="aud-icon">{icon}</div>
      <p className="aud-audience">{audience}</p>
      <p className="aud-name">{name}</p>
      <ul className="aud-items">
        {items.map((item, i) => (
          <li key={i} className="aud-item">{item}</li>
        ))}
      </ul>
    </div>
  );
}

function TmStat({ value, label }) {
  return (
    <div className="tm-stat">
      <div className="tm-stat-value">{value}</div>
      <div className="tm-stat-label">{label}</div>
    </div>
  );
}

function TmMile({ range, title, detail }) {
  return (
    <div className="tm-mile">
      <div className="tm-marker">
        <div className="tm-dot" />
        <div className="tm-line" />
      </div>
      <div className="tm-content">
        <span className="tm-range">{range}</span>
        <h3 className="tm-title">{title}</h3>
        <p className="tm-detail">{detail}</p>
      </div>
    </div>
  );
}
