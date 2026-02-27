import "./VisionPage.css";

export default function VisionPage() {
  return (
    <div className="vision-page">
      <div className="vision-hero">
        <div className="vision-hero-content">
          <p className="vision-kicker">The Future of Running</p>
          <h1 className="vision-title">
            EVERY STEP<br />
            <span className="vision-accent">TELLS A STORY</span>
          </h1>
          <p className="vision-subtitle">
            What happens when you give every footstrike a voice? A new era of running intelligence — 
            built from the ground up.
          </p>
        </div>
      </div>

      <div className="vision-content">
        <section className="vision-section">
          <div className="vision-era">
            <span className="era-badge current">Now</span>
            <h2 className="era-title">THE BIOMECHANICAL PROFILE</h2>
          </div>
          <p className="vision-text">
            Today, underfoot sensing captures what was previously invisible. Every stride generates a 
            biomechanical fingerprint — ground contact time, vertical force, foot strike angle, loading 
            rate — measured independently for each foot, every step, every run.
          </p>
          <div className="vision-points">
            <VisionPoint
              title="Asymmetry Detection"
              text="Left-right differences as small as 5 milliseconds become visible. These bilateral patterns are invisible to the eye but can signal compensation, weakness, or injury risk before symptoms appear."
            />
            <VisionPoint
              title="Fatigue Signatures"
              text="Watch mechanics drift within a session. Ground contact time creeps up. Force output drops. Cadence shifts. The body's response to accumulated load, captured stride by stride."
            />
            <VisionPoint
              title="Speed-Mechanics Coupling"
              text="How does your body scale from easy pace to sprint? Does ground contact time drop efficiently? Does force output scale linearly? The answer reveals your mechanical efficiency."
            />
          </div>
        </section>

        <div className="vision-divider" />

        <section className="vision-section">
          <div className="vision-era">
            <span className="era-badge near">Near-term</span>
            <h2 className="era-title">INTELLIGENT COACHING</h2>
          </div>
          <p className="vision-text">
            When biomechanical data meets machine learning, coaching becomes contextual and 
            personalized. Not generic advice — specific guidance derived from your unique movement 
            signature.
          </p>
          <div className="vision-points">
            <VisionPoint
              title="Real-Time Coaching Cues"
              text="Imagine audio cues during a run: 'Your left foot contact time is drifting — focus on hip extension.' Interventions informed by live biomechanical feedback, not heart rate zones alone."
            />
            <VisionPoint
              title="Injury Risk Scoring"
              text="Combine asymmetry patterns, fatigue signatures, and training load to generate a daily injury risk score. Know when to push and when to pull back, with data behind every recommendation."
            />
            <VisionPoint
              title="Shoe-Fit Optimization"
              text="Every shoe changes how your foot interacts with the ground. Measure the biomechanical impact of different footwear across conditions — and find the shoe that optimizes your mechanics."
            />
          </div>
        </section>

        <div className="vision-divider" />

        <section className="vision-section">
          <div className="vision-era">
            <span className="era-badge future">Future</span>
            <h2 className="era-title">PREDICTIVE PERFORMANCE</h2>
          </div>
          <p className="vision-text">
            The ultimate promise: a running intelligence platform that doesn't just describe what 
            happened, but predicts what will happen. Your biomechanical model becomes a digital twin — 
            a simulation of you that can test training strategies before you run a single step.
          </p>
          <div className="vision-points">
            <VisionPoint
              title="Race-Day Strategy from Mechanics"
              text="Your biomechanical profile at different speeds, fatigue levels, and conditions creates a pacing model. Not based on VO2 max estimates — based on your actual mechanical response to load."
            />
            <VisionPoint
              title="Predictive Performance Modeling"
              text="Train a model on thousands of sessions across an athlete's career. Predict when they'll plateau, when they'll break through, and what specific training stimulus will drive the next adaptation."
            />
            <VisionPoint
              title="Population-Scale Running Intelligence"
              text="Aggregate anonymized biomechanical data across thousands of runners. Discover patterns invisible at the individual level — how different body types respond to training, how injury risk varies with mechanics, how the fastest runners move differently."
            />
          </div>
        </section>

        <div className="vision-coda">
          <p className="coda-text">
            The insole is the interface. The data is the language.<br />
            <strong>The intelligence is what we build from it.</strong>
          </p>
        </div>
      </div>
    </div>
  );
}

function VisionPoint({ title, text }) {
  return (
    <div className="vision-point">
      <div className="vp-marker" />
      <div>
        <h3 className="vp-title">{title}</h3>
        <p className="vp-text">{text}</p>
      </div>
    </div>
  );
}
