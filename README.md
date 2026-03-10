# Cortex

The technical engine behind **Athlete Intelligence** — an understanding system that takes multi-source athlete data and produces actionable intelligence for two audiences: the athlete/coach (so they improve) and the product team (so what Nike builds improves).

> Don't build a data platform. Build an understanding system.

## Branch: `athlete-intelligence`

This branch explores the evolution of Cortex from a single-source biomechanics dashboard into a source-agnostic understanding system with dual-audience output. See [THESIS.md](THESIS.md) for the strategic rationale and [ARCHITECTURE.md](ARCHITECTURE.md) for the technical blueprint.

## Architecture

```
cortex/
├── data/                    Raw session data organized by athlete
├── pipeline/
│   ├── adapters/            Source adapters (Nucleus, Coros, subjective, ...)
│   │   ├── base.py          Canonical signal schema + adapter interface
│   │   ├── nucleus.py       Nucleus insole adapter (implemented)
│   │   ├── coros.py         Coros pod/watch/HR adapter (interface ready)
│   │   └── subjective.py    Athlete-reported data adapter (implemented)
│   ├── intelligence/        Dual-audience intelligence layer
│   │   ├── brief.py         Intelligence brief structures (athlete + product)
│   │   └── fusion.py        Cross-signal fusion rules
│   ├── process.py           Core analysis engine (sessions, baselines, metrics)
│   ├── baseline.py          Personal baseline computation + deviation detection
│   └── insights.py          Rule-based insight generation (LLM-swappable)
├── site/                    React + Vite web app (deployed to GitHub Pages)
└── .github/workflows/       CI/CD automation
```

## Quick Start

```bash
# 1. Process raw data into JSON (existing pipeline, still works)
cd pipeline
pip install -r requirements.txt
python process.py

# 2. Run the web app locally
cd ../site
npm install
npm run dev
```

## Key Documents

- **[THESIS.md](THESIS.md)** — The strategic thesis: why an understanding system, why now, and how it positions against the competitive landscape
- **[ARCHITECTURE.md](ARCHITECTURE.md)** — Technical architecture: how the system evolves from v1 to the understanding system

## The Two Outputs

**Athlete Intelligence** — insights that complete the loop: *know → think → choose → do*. Not dashboards. Intelligence briefs that tell the athlete what changed, why it matters, and what to do next.

**Product Intelligence** — the same analysis, reframed for the product team. Every insight that helps an athlete also contains information about what the shoe, spike, or apparel should do differently. This is the connective tissue between athlete experience and product pipeline.

## Adding New Data Sources

1. Create a new adapter in `pipeline/adapters/` that inherits from `SourceAdapter`
2. Map native fields to the canonical `SignalSet` schema
3. Set appropriate `source_confidence` for the device
4. Register in `pipeline/process.py`

The pipeline doesn't care where the data came from — only that it conforms to the canonical schema after adaptation.
