import "./ThesisPage.css";

export default function ThesisPage() {
  return (
    <div className="thesis-page">

      {/* ── Hero ────────────────────────────────────────────── */}
      <div className="thesis-hero">
        <div className="thesis-hero-content">
          <p className="thesis-kicker">The Next Evolution of Cortex</p>
          <h1 className="thesis-title">
            ATHLETE<br />
            <span className="thesis-accent">INTELLIGENCE</span>
          </h1>
          <p className="thesis-subtitle">
            Don't build a data platform. Build an understanding system — one that takes 
            messy, multi-source data and produces clear, actionable insight for two audiences: 
            the athlete and the product.
          </p>
        </div>
      </div>

      {/* ── The Credo ──────────────────────────────────────── */}
      <section className="thesis-section">
        <div className="credo-strip">
          <div className="credo-step">
            <span className="credo-number">1</span>
            <span className="credo-word">Know</span>
            <span className="credo-desc">What's happening</span>
          </div>
          <div className="credo-arrow" />
          <div className="credo-step">
            <span className="credo-number">2</span>
            <span className="credo-word">Think</span>
            <span className="credo-desc">What it means</span>
          </div>
          <div className="credo-arrow" />
          <div className="credo-step">
            <span className="credo-number">3</span>
            <span className="credo-word">Choose</span>
            <span className="credo-desc">What to do</span>
          </div>
          <div className="credo-arrow" />
          <div className="credo-step">
            <span className="credo-number">4</span>
            <span className="credo-word">Do</span>
            <span className="credo-desc">Execute</span>
          </div>
        </div>
        <p className="thesis-text credo-caption">
          Understanding is the mechanism of improvement. The difference between a good athlete 
          and a great one isn't physical capacity — it's the quality of this loop. Most systems 
          only address the first word. The understanding system completes the sentence.
        </p>
      </section>

      <div className="thesis-divider" />

      {/* ── The Gap ────────────────────────────────────────── */}
      <section className="thesis-section">
        <p className="thesis-section-label">The Landscape</p>
        <h2 className="thesis-section-title">The Gap Nobody Is Filling</h2>
        <div className="landscape-grid">
          <LandscapeCard
            name="Coros"
            covers="Know"
            description="Three devices. Multi-signal capture. Race-day data. Elite athlete contracts. They're building measurement — and doing it well."
            limitation="Measurement without interpretation is noise. Dashboards require someone to know what the data means."
          />
          <LandscapeCard
            name="Nike"
            covers="Do"
            description="The world's most powerful product pipeline. The brand athletes trust. The organization that builds what athletes wear."
            limitation="Product development is disconnected from real-time athlete data. The athlete's experience doesn't systematically flow into what gets built."
          />
          <LandscapeCard
            name="Athlete Intelligence"
            covers="Know → Think → Choose → Do"
            description="The understanding system. Takes data from any source and produces intelligence for two audiences: the athlete and the product team."
            limitation={null}
            highlighted
          />
        </div>
      </section>

      <div className="thesis-divider" />

      {/* ── The System ─────────────────────────────────────── */}
      <section className="thesis-section">
        <p className="thesis-section-label">The Architecture</p>
        <h2 className="thesis-section-title">An Understanding System, Not a Data Platform</h2>
        <p className="thesis-text">
          The differentiator isn't access to data. Coros has that. The differentiator is knowing 
          what the data <em>means</em> — for both performance and product — because you've been 
          the athlete, you've studied the engineering, and you sit inside the organization that 
          builds the things athletes wear.
        </p>

        <div className="system-flow">
          {/* Sources */}
          <div className="flow-layer">
            <p className="flow-label">Sources</p>
            <div className="flow-chips">
              <Chip label="Nucleus Insole" type="gait" />
              <Chip label="Coros Pod" type="gait" />
              <Chip label="Coros Watch" type="cardio" />
              <Chip label="HR Sensor" type="cardio" />
              <Chip label="GPS" type="spatial" />
              <Chip label="Video" type="visual" />
              <Chip label="Athlete Voice" type="subjective" />
              <Chip label="Lab Testing" type="lab" />
            </div>
          </div>

          <div className="flow-connector">
            <div className="flow-line" />
            <span className="flow-connector-label">Canonical Signal Schema</span>
            <div className="flow-line" />
          </div>

          {/* Fusion */}
          <div className="flow-layer flow-layer-fusion">
            <p className="flow-label">Fusion + Reasoning</p>
            <div className="fusion-examples">
              <FusionRule
                signals="GCT↑ + HR stable + pace stable"
                meaning="Neuromuscular fatigue — not pacing"
              />
              <FusionRule
                signals="Asymmetry↑ + no pain reported"
                meaning="Subclinical compensation — more concerning than pain"
              />
              <FusionRule
                signals="FSA shift + footwear change"
                meaning="Shoe-induced gait modification — product signal"
              />
              <FusionRule
                signals="Late-race GCT spike + asymmetry spike"
                meaning="Neuromuscular wall — unilateral fatigue limiter"
              />
            </div>
          </div>

          <div className="flow-connector">
            <div className="flow-line" />
            <span className="flow-connector-label">Dual Translation</span>
            <div className="flow-line" />
          </div>

          {/* Outputs */}
          <div className="flow-layer">
            <div className="output-grid">
              <OutputCard
                audience="Athlete + Coach"
                icon="A"
                headline="Intelligence Briefs"
                items={[
                  "What changed — and why it matters for your body",
                  "What to do next — filtered, contextual, timed",
                  "Race-day preparation from your mechanics",
                  "Know → Think → Choose → Do — the full loop",
                ]}
              />
              <OutputCard
                audience="Product Team"
                icon="P"
                headline="Product Intelligence"
                items={[
                  "Footwear interaction patterns across athletes",
                  "Design implications from biomechanical signatures",
                  "Degradation patterns that reveal material needs",
                  "Athlete archetypes that map to product requirements",
                ]}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="thesis-divider" />

      {/* ── The Differentiator ──────────────────────────────── */}
      <section className="thesis-section">
        <p className="thesis-section-label">The Position</p>
        <h2 className="thesis-section-title">What Makes This Different</h2>

        <div className="diff-grid">
          <DiffCard
            title="Source-Agnostic"
            text="The system doesn't care where the data came from. Nucleus insole, Coros pod, Garmin watch, video, athlete voice — it all maps to a canonical schema. No hardware dependency. No vendor lock-in. The intelligence layer works with whatever the athlete wears."
          />
          <DiffCard
            title="Cross-Signal Fusion"
            text="The capability no single-source system can provide. The same metric means different things depending on what other signals are doing. GCT increasing while heart rate is stable means something fundamentally different than GCT increasing while heart rate is also climbing. Fusion is where understanding lives."
          />
          <DiffCard
            title="Dual Audience"
            text="Every insight that helps an athlete also contains information about what the product should do differently. Same data, same analysis, two translations. The athlete gets better. The product gets better. That feedback loop is the competitive moat."
          />
          <DiffCard
            title="Confidence Calibration"
            text="Honest about what the data supports vs. what's speculative. High confidence when multiple signals converge. Lower confidence from single signals. The system doesn't pretend to know more than it does — that's what makes it trustworthy."
          />
        </div>
      </section>

      <div className="thesis-divider" />

      {/* ── Same Data, Two Translations ─────────────────────── */}
      <section className="thesis-section">
        <p className="thesis-section-label">The Translation</p>
        <h2 className="thesis-section-title">Same Analysis, Two Audiences</h2>
        <p className="thesis-text">
          In the final 200m of the race, the athlete's left GCT increased 12% while the right 
          held steady. Heart rate was at ceiling. The same finding, framed for each audience:
        </p>
        <div className="translation-grid">
          <div className="translation-card translation-athlete">
            <div className="translation-header">
              <span className="translation-badge athlete">Athlete Brief</span>
            </div>
            <p className="translation-body">
              You didn't run out of cardiovascular capacity — your left hip extensors fatigued 
              first. That's why the last 200m felt like you were fighting yourself. Your right 
              side held up; your left side broke down. Protocol: 3x/week single-leg hip thrust 
              progression for 4 weeks, then retest.
            </p>
          </div>
          <div className="translation-card translation-product">
            <div className="translation-header">
              <span className="translation-badge product">Product Brief</span>
            </div>
            <p className="translation-body">
              Bilateral GCT asymmetry increased from 4ms to 18ms in the final 200m. The degradation 
              was unilateral, coinciding with transition from midfoot to rearfoot strike on the left 
              foot only. The spike's lateral forefoot geometry may be contributing — the athlete loses 
              purchase as fatigue reduces ankle stiffness. Evaluate lateral outsole traction and 
              forefoot stiffness in the next prototype.
            </p>
          </div>
        </div>
      </section>

      <div className="thesis-divider" />

      {/* ── The Evolution ──────────────────────────────────── */}
      <section className="thesis-section">
        <p className="thesis-section-label">The Path</p>
        <h2 className="thesis-section-title">From Cortex v1 to the Understanding System</h2>
        <p className="thesis-text">
          Cortex already does a version of this for underfoot gait data. The insight engine, 
          baseline system, and trend narratives are early implementations of the interpretation 
          layer. The evolution extends what exists — it doesn't replace it.
        </p>
        <div className="evolution-timeline">
          <EvolutionPhase
            phase="Built"
            title="Single-Source Intelligence"
            description="Underfoot gait analysis with personal baselines, pace-normalized comparisons, fatigue detection, bilateral analysis, and contextual insights. Two athletes, 12+ sessions, thousands of strides."
            status="complete"
          />
          <EvolutionPhase
            phase="Phase 1"
            title="Multi-Source Ingestion"
            description="Source adapter pattern. Accept data from Coros, Garmin, WHOOP, subjective reports, video — anything that maps to the canonical schema. The pipeline becomes device-agnostic."
            status="active"
          />
          <EvolutionPhase
            phase="Phase 2"
            title="Context + Fusion"
            description="Cross-signal reasoning. Combine gait + heart rate + pace + subjective data to produce insights that no single source reveals. Context engine wraps every data point in training, environmental, and temporal information."
            status="planned"
          />
          <EvolutionPhase
            phase="Phase 3"
            title="Dual-Audience Output"
            description="Intelligence briefs for athletes and product teams from the same analysis. The athlete gets better. The product gets better. Nike becomes the smartest company in sport."
            status="planned"
          />
          <EvolutionPhase
            phase="Proof"
            title="End-to-End Cycle"
            description="One sprint athlete. Multi-source data. An intelligence brief that changes their training. A product finding that changes a spike. Both from the same system. Both traceable."
            status="planned"
          />
        </div>
      </section>

      {/* ── Coda ───────────────────────────────────────────── */}
      <div className="thesis-coda">
        <p className="coda-line">
          Coros is building measurement.<br />
          Nike is building product.<br />
          <strong>Neither is building the complete thing.</strong>
        </p>
        <p className="coda-sub">
          The complete thing is the system that connects knowing to doing — 
          for the athlete and for the product. That's the gap. That's where the 
          philosophy, the role, and the opportunity converge.
        </p>
        <p className="coda-final">Build the understanding system.</p>
      </div>
    </div>
  );
}


function LandscapeCard({ name, covers, description, limitation, highlighted }) {
  return (
    <div className={`landscape-card ${highlighted ? "highlighted" : ""}`}>
      <div className="lc-header">
        <h3 className="lc-name">{name}</h3>
        <span className={`lc-covers ${highlighted ? "accent" : ""}`}>{covers}</span>
      </div>
      <p className="lc-desc">{description}</p>
      {limitation && <p className="lc-limit">{limitation}</p>}
    </div>
  );
}

function Chip({ label, type }) {
  return <span className={`source-chip chip-${type}`}>{label}</span>;
}

function FusionRule({ signals, meaning }) {
  return (
    <div className="fusion-rule">
      <code className="fusion-signals">{signals}</code>
      <span className="fusion-arrow">→</span>
      <span className="fusion-meaning">{meaning}</span>
    </div>
  );
}

function OutputCard({ audience, icon, headline, items }) {
  return (
    <div className="output-card">
      <div className="oc-icon">{icon}</div>
      <p className="oc-audience">{audience}</p>
      <h3 className="oc-headline">{headline}</h3>
      <ul className="oc-items">
        {items.map((item, i) => (
          <li key={i} className="oc-item">{item}</li>
        ))}
      </ul>
    </div>
  );
}

function DiffCard({ title, text }) {
  return (
    <div className="diff-card">
      <h3 className="diff-title">{title}</h3>
      <p className="diff-text">{text}</p>
    </div>
  );
}

function EvolutionPhase({ phase, title, description, status }) {
  return (
    <div className={`evo-phase evo-${status}`}>
      <div className="evo-marker">
        <div className="evo-dot" />
        <div className="evo-line" />
      </div>
      <div className="evo-content">
        <span className={`evo-badge ${status}`}>{phase}</span>
        <h3 className="evo-title">{title}</h3>
        <p className="evo-desc">{description}</p>
      </div>
    </div>
  );
}
