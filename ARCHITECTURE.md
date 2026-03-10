# Cortex Architecture: The Understanding System

## Current State (v1–v3)

```
CSV files (Nucleus insoles, Garmin RDP)
    │
    ▼
┌──────────────┐
│  process.py   │  Normalize columns, detect foot, build sessions
│               │  Speed zones, fatigue analysis, bilateral comparison
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  baseline.py  │  Per-zone personal baselines, deviation detection
│               │  Status computation, trend narratives
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  insights.py  │  Rule-based insight generation
│               │  Asymmetry, fatigue, speed-mechanics, coaching
└──────┬───────┘
       │
       ▼
   JSON files → React dashboard
```

**Strengths of this architecture:**
- Personal baselines (compare athlete to themselves, not population norms)
- Pace-normalized analysis (compare mechanics at the same speed, not aggregate)
- Insight engine designed as swappable (rule-based now, LLM-ready)
- Bilateral analysis as a first-class concept

**Limitations:**
- Single data source type (underfoot gait CSVs)
- No cross-signal fusion (can't combine HR + gait + GPS)
- Athlete-only audience (no product intelligence output)
- Batch processing (no temporal context beyond session ordering)
- Dashboard-centric output (not intelligence briefs)

---

## Target State: The Understanding System

```
┌─────────────────────────────────────────────────────────────┐
│                     SOURCE ADAPTERS                          │
│                                                              │
│  Nucleus   Coros    Garmin   WHOOP   Video   Subjective     │
│  insole    pod+HR   RDP      band    race    RPE/notes      │
│    │        │        │        │       │        │             │
│    ▼        ▼        ▼        ▼       ▼        ▼             │
│  ┌──────────────────────────────────────────────────┐       │
│  │           Canonical Signal Schema                 │       │
│  │  Every source maps to a common representation     │       │
│  │  with source metadata, confidence, and sampling   │       │
│  └──────────────────────────────────────────────────┘       │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   CONTEXT ENGINE                             │
│                                                              │
│  Temporal Context     Training Context    Environmental      │
│  ├─ Where in session  ├─ Phase/block      ├─ Weather         │
│  ├─ Where in week     ├─ Load history     ├─ Altitude        │
│  ├─ Where in season   ├─ Recovery state   ├─ Surface         │
│  └─ Where in career   └─ Competition cal  └─ Footwear        │
│                                                              │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  FUSION + REASONING                           │
│                                                              │
│  Signal Fusion                  Baseline Engine (existing)   │
│  ├─ Cross-signal correlation    ├─ Per-zone personal norms   │
│  ├─ Conflict resolution         ├─ Deviation detection       │
│  ├─ Confidence weighting        └─ Trend computation         │
│  └─ Gap identification                                       │
│                                                              │
│  Causal Reasoning               Pattern Library              │
│  ├─ "GCT↑ + HR↗ + pace= →      ├─ Known signatures         │
│  │   neuromuscular fatigue"      ├─ Compensation patterns    │
│  ├─ "FSA shift + new shoe →      ├─ Injury precursors       │
│  │   footwear adaptation"        └─ Performance indicators   │
│  └─ Confidence calibration                                   │
│                                                              │
└──────────┬──────────────────────────────┬───────────────────┘
           │                              │
           ▼                              ▼
┌────────────────────────┐  ┌────────────────────────────────┐
│  ATHLETE INTELLIGENCE   │  │  PRODUCT INTELLIGENCE           │
│                         │  │                                  │
│  Audience: athlete,     │  │  Audience: product team,         │
│  coach, sport scientist │  │  designer, biomechanist          │
│                         │  │                                  │
│  ┌───────────────────┐  │  │  ┌────────────────────────────┐ │
│  │ Intelligence Brief │  │  │  │ Product Insight Report      │ │
│  │ • What changed     │  │  │  │ • Population patterns       │ │
│  │ • Why it matters   │  │  │  │ • Design implications       │ │
│  │ • What to do       │  │  │  │ • Validation opportunities  │ │
│  └───────────────────┘  │  │  └────────────────────────────┘ │
│                         │  │                                  │
│  ┌───────────────────┐  │  │  ┌────────────────────────────┐ │
│  │ Session Debrief    │  │  │  │ Footwear Interaction Map    │ │
│  │ • Key moments      │  │  │  │ • Shoe ↔ mechanics coupling │ │
│  │ • Fatigue story    │  │  │  │ • Degradation patterns      │ │
│  │ • Next session cue │  │  │  │ • Fit ↔ performance link    │ │
│  └───────────────────┘  │  │  └────────────────────────────┘ │
│                         │  │                                  │
│  ┌───────────────────┐  │  │  ┌────────────────────────────┐ │
│  │ Race Prep Brief    │  │  │  │ Athlete Archetype Analysis  │ │
│  │ • Pacing model     │  │  │  │ • Mechanical profiles       │ │
│  │ • Risk zones       │  │  │  │ • Product-need clustering   │ │
│  │ • Warm-up protocol │  │  │  │ • Unmet-need identification │ │
│  └───────────────────┘  │  │  └────────────────────────────┘ │
└────────────────────────┘  └────────────────────────────────┘
```

---

## Evolution Path (what to build, in what order)

### Phase 1: Multi-Source Ingestion (extend what exists)

The current `process.py` already handles two data sources (Nucleus, Garmin) with different column mappings. The pattern is sound — extend it.

**New source adapters to build:**
- `adapters/coros.py` — Coros pod + watch + HR (FIT file or CSV export)
- `adapters/subjective.py` — Structured RPE, fatigue, pain, session notes
- `adapters/environment.py` — Weather API, surface type, altitude from GPS

**Canonical signal schema** (extending the existing stride-level model):

```python
# Every data point, regardless of source, maps to this
{
    "timestamp": "2026-03-05T10:23:44.123Z",
    "source": "coros_pod",
    "source_confidence": 0.92,
    "signals": {
        # Gait (from any underfoot/pod source)
        "gct_ms": 214,
        "stride_len_m": 2.31,
        "cadence": 182,
        "fsa_deg": 4.2,
        "vgrf_avg": 2.1,
        "foot": "left",

        # Cardio (from watch, HR strap, or chest sensor)
        "heart_rate_bpm": 162,
        "hrv_ms": null,

        # Spatial (from GPS-enabled device)
        "speed_mps": 5.8,
        "latitude": 45.5231,
        "longitude": -122.6765,
        "elevation_m": 12.3,

        # Power (from pod or derived)
        "power_w": 310,

        # Subjective (from athlete input)
        "rpe": null,
        "pain_location": null,
        "session_note": null,
    },
    "context": {
        "session_id": "...",
        "athlete_id": "...",
        "activity_type": "race",
        "footwear": "Nike Air Zoom Victory 2",
        "surface": "track",
        "weather": {"temp_c": 18, "humidity_pct": 45, "wind_mps": 2.1},
        "training_phase": "competition",
    }
}
```

### Phase 2: Context Engine

Context turns data into understanding. The same GCT reading means different things depending on:
- Is this stride 10 or stride 1000?
- Is this a Tuesday easy run or a championship final?
- Is this after 3 days rest or 3 days of hard training?
- Is this in the same shoe they've been wearing, or a new prototype?

The context engine wraps every data point in the information needed to interpret it correctly. This is where the "know what the data means" differentiator lives.

### Phase 3: Cross-Signal Fusion

This is the new capability that single-source systems can't provide.

**Example fusion insights:**
- GCT increases 8% at the same HR and pace → neuromuscular fatigue (not pacing strategy)
- HR drift + stable pace + stable GCT → cardiovascular strain with preserved mechanics (different intervention than if GCT were also drifting)
- FSA shift coincides with footwear change → shoe-induced gait modification (product intelligence)
- Speed drops in final 200m + asymmetry spikes + HR plateau → the athlete hit a neuromuscular wall, not a cardiovascular one (changes race strategy)

### Phase 4: Dual-Audience Translation

Same analysis, two framings:

**Athlete brief:** "In your last 200m, your left GCT increased 12% while your right held steady. Your HR was already at ceiling. You didn't run out of cardiovascular capacity — your left hip extensors fatigued first. Protocol: 3x/week single-leg hip thrust progression for 4 weeks, then retest."

**Product brief:** "In the final 200m of the 400m race, bilateral GCT asymmetry increased from 4ms to 18ms. The degradation was unilateral (left side only), coinciding with the transition from midfoot to rearfoot strike on the left foot only. The spike's lateral forefoot geometry may be contributing to the compensation — the athlete is losing purchase on the left side as fatigue reduces ankle stiffness. Implication: evaluate lateral outsole traction geometry and forefoot stiffness in the next prototype."

---

## Data Model Evolution

### Current: `athletes.json`

```json
{
    "athletes": [
        {
            "id": "...",
            "name": "Ashton",
            "folder": "ashton",
            "data_source": "nucleus",
            "sport": "running"
        }
    ]
}
```

### Evolved: `athletes.json`

```json
{
    "athletes": [
        {
            "id": "...",
            "name": "Ashton",
            "folder": "ashton",
            "sport": "sprints",
            "events": ["100m", "200m", "400m"],
            "sources": [
                { "type": "nucleus", "device": "Nucleus Insole v2", "signals": ["gait"] },
                { "type": "coros", "device": "COROS PACE 3", "signals": ["hr", "gps", "power"] },
                { "type": "coros", "device": "COROS POD 2", "signals": ["gait", "form"] },
                { "type": "subjective", "method": "post-session", "signals": ["rpe", "notes"] }
            ],
            "footwear_log": [
                { "date": "2026-01-15", "shoe": "Nike Air Zoom Victory 2", "condition": "new" },
                { "date": "2026-02-20", "shoe": "Nike Air Zoom Victory 2", "condition": "200km" }
            ],
            "training_calendar": {
                "current_phase": "competition_prep",
                "next_competition": "2026-04-12",
                "coach": "Coach O"
            }
        }
    ]
}
```

---

## What This Means for the Existing Code

The existing pipeline is the seed, not something to throw away.

| Existing Module | Keeps | Evolves Into |
|---|---|---|
| `process.py` — CSV readers | Column normalization, foot detection | Source adapter pattern with canonical schema |
| `process.py` — session builder | Speed zones, fatigue, bilateral | Core analysis engine (with multi-signal inputs) |
| `baseline.py` | Per-zone personal norms, deviation detection | Expanded to include cardio + contextual baselines |
| `insights.py` | Rule-based insight generation | Dual-output intelligence engine (athlete + product) |
| `site/` — React dashboard | Visualization components | Intelligence brief interface (not just charts) |

The architecture respects what exists. It extends, it doesn't replace.

---

## The Name

- **Cortex** = the technical system. The processing layer.
- **Athlete Intelligence** = the organizational capability. The function Nike builds around it.

Cortex powers Athlete Intelligence. The pipeline is the engine. The intelligence is the output.
