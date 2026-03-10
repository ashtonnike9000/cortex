"""
Cross-signal fusion — the capability that single-source systems can't provide.

Fusion takes signals from multiple sources and produces understanding that
no single source reveals on its own. This is the technical implementation of
"knowing what the data means."

Core principle: the same metric means different things depending on what
other signals are doing at the same time.

Examples:
  - GCT↑ + HR stable + pace stable → neuromuscular fatigue (not pacing)
  - GCT↑ + HR↑ + pace↑ → normal speed scaling (expected)
  - Asymmetry↑ + RPE "legs feel different" → validated compensation
  - Asymmetry↑ + RPE "felt normal" → subclinical compensation (more concerning)
  - FSA shift + footwear change → shoe-induced gait modification (product signal)
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from .brief import Confidence, Insight


@dataclass
class FusionContext:
    """Signals available at a given moment from all sources."""

    # Gait signals (from pod or insole)
    gct_ms: Optional[float] = None
    gct_change_pct: Optional[float] = None
    asymmetry_ms: Optional[float] = None
    asymmetry_change_ms: Optional[float] = None
    fsa_deg: Optional[float] = None
    fsa_change_deg: Optional[float] = None
    stride_len_m: Optional[float] = None
    cadence: Optional[float] = None

    # Cardio signals (from watch or HR strap)
    heart_rate_bpm: Optional[float] = None
    hr_drift_pct: Optional[float] = None
    hr_zone: Optional[str] = None

    # Spatial signals (from GPS)
    speed_mps: Optional[float] = None
    speed_change_pct: Optional[float] = None
    elevation_change_m: Optional[float] = None

    # Subjective signals
    rpe: Optional[float] = None
    pain_reported: bool = False
    session_note: Optional[str] = None

    # Context
    stride_number: Optional[int] = None
    total_strides: Optional[int] = None
    session_fraction: Optional[float] = None  # 0.0 to 1.0
    footwear: Optional[str] = None
    surface: Optional[str] = None
    is_race: bool = False


def fuse_signals(ctx: FusionContext) -> list[Insight]:
    """
    Apply fusion rules to produce insights that require multiple signals.

    Each rule encodes domain knowledge — the kind of interpretation that
    requires understanding both the biomechanics and the training context.
    This is what Coros dashboards can't do and what makes the understanding
    system different from a data platform.
    """
    insights = []

    insights.extend(_neuromuscular_fatigue_rules(ctx))
    insights.extend(_cardiovascular_rules(ctx))
    insights.extend(_footwear_interaction_rules(ctx))
    insights.extend(_asymmetry_rules(ctx))
    insights.extend(_race_specific_rules(ctx))

    return insights


def _neuromuscular_fatigue_rules(ctx: FusionContext) -> list[Insight]:
    """Detect neuromuscular fatigue by combining gait + cardio + pace."""
    insights = []

    # GCT increasing while pace is stable and HR is stable → neuromuscular fatigue
    if (ctx.gct_change_pct is not None and ctx.gct_change_pct > 5
            and ctx.speed_change_pct is not None and abs(ctx.speed_change_pct) < 3
            and ctx.hr_drift_pct is not None and ctx.hr_drift_pct < 5):
        insights.append(Insight(
            observation=f"Ground contact time increased {ctx.gct_change_pct:.1f}% while pace and heart rate remained stable.",
            interpretation="This is a neuromuscular fatigue signature — the muscles can no longer generate the same force in the same timeframe, so the foot stays on the ground longer to compensate. The cardiovascular system isn't the limiter here; the peripheral musculature is.",
            recommendation="This athlete's performance ceiling in this session was muscular, not cardiovascular. Training prescription: eccentric strength work, plyometric progressions, and progressive overload on long intervals to build mechanical durability.",
            confidence=Confidence.HIGH,
            supporting_data={
                "gct_change_pct": ctx.gct_change_pct,
                "speed_change_pct": ctx.speed_change_pct,
                "hr_drift_pct": ctx.hr_drift_pct,
            },
        ))

    # GCT increasing AND HR drifting → combined fatigue (both systems degrading)
    if (ctx.gct_change_pct is not None and ctx.gct_change_pct > 5
            and ctx.hr_drift_pct is not None and ctx.hr_drift_pct > 8):
        insights.append(Insight(
            observation=f"Both GCT (+{ctx.gct_change_pct:.1f}%) and heart rate (+{ctx.hr_drift_pct:.1f}%) are drifting upward.",
            interpretation="Both the cardiovascular and neuromuscular systems are under strain. This typically occurs in sessions that are both long and intense — the body is accumulating global fatigue.",
            recommendation="This session pushed both systems. Recovery priority is high. Consider an easy or off day before the next quality session.",
            confidence=Confidence.HIGH,
            supporting_data={
                "gct_change_pct": ctx.gct_change_pct,
                "hr_drift_pct": ctx.hr_drift_pct,
            },
        ))

    return insights


def _cardiovascular_rules(ctx: FusionContext) -> list[Insight]:
    """Detect cardiovascular patterns from HR + pace + gait signals."""
    insights = []

    # HR drifting up while pace and GCT are stable → cardiac drift (heat, dehydration, or aerobic strain)
    if (ctx.hr_drift_pct is not None and ctx.hr_drift_pct > 8
            and ctx.speed_change_pct is not None and abs(ctx.speed_change_pct) < 3
            and ctx.gct_change_pct is not None and abs(ctx.gct_change_pct) < 3):
        insights.append(Insight(
            observation=f"Heart rate drifted +{ctx.hr_drift_pct:.1f}% while pace and ground contact mechanics remained stable.",
            interpretation="Classic cardiac drift — the cardiovascular system is working harder to maintain the same output. Mechanics are preserved, which means the neuromuscular system isn't the limiter. Could indicate dehydration, heat stress, or simply running near aerobic threshold for an extended period.",
            recommendation="Mechanics are holding up well — the body is coping. If this is a training run, this is a productive stimulus for aerobic development. If pre-race, note that cardiovascular reserve is being consumed faster than mechanical reserves.",
            confidence=Confidence.MODERATE,
            supporting_data={
                "hr_drift_pct": ctx.hr_drift_pct,
                "speed_change_pct": ctx.speed_change_pct,
                "gct_change_pct": ctx.gct_change_pct,
            },
        ))

    return insights


def _footwear_interaction_rules(ctx: FusionContext) -> list[Insight]:
    """Detect gait changes that may relate to footwear (product intelligence)."""
    insights = []

    # FSA shift with a logged footwear change
    if (ctx.fsa_change_deg is not None and abs(ctx.fsa_change_deg) > 3
            and ctx.footwear is not None):
        direction = "more anterior (toward forefoot)" if ctx.fsa_change_deg < 0 else "more posterior (toward rearfoot)"
        insights.append(Insight(
            observation=f"Foot strike angle shifted {abs(ctx.fsa_change_deg):.1f}° {direction} in {ctx.footwear}.",
            interpretation="A 3°+ shift in foot strike angle is biomechanically meaningful. If this coincides with a footwear change, the shoe geometry is altering landing mechanics. This is a product signal — the shoe is inducing a gait modification.",
            recommendation="[Athlete] Monitor whether this shift persists across sessions. If it's comfortable and performance-neutral, it may be adaptive. If it correlates with discomfort or performance changes, the shoe fit may need adjustment. [Product] Log this as a footwear interaction data point — FSA shift magnitude + direction + shoe model. Aggregate across athletes to build the footwear interaction map.",
            confidence=Confidence.MODERATE,
            supporting_data={
                "fsa_change_deg": ctx.fsa_change_deg,
                "footwear": ctx.footwear,
            },
        ))

    return insights


def _asymmetry_rules(ctx: FusionContext) -> list[Insight]:
    """Contextualize asymmetry changes using multi-source signals."""
    insights = []

    # Asymmetry increasing + subjective pain → validated compensation
    if (ctx.asymmetry_change_ms is not None and ctx.asymmetry_change_ms > 5
            and ctx.pain_reported):
        insights.append(Insight(
            observation=f"GCT asymmetry increased by {ctx.asymmetry_change_ms:.1f}ms, and the athlete reported pain.",
            interpretation="The asymmetry increase is validated by the athlete's subjective report. The body is redistributing load to protect the painful side. This is a conscious or unconscious compensation pattern.",
            recommendation="The compensation is likely protective. Do not attempt to 'correct' the asymmetry until the pain source is addressed. Refer for assessment. Track whether asymmetry returns to baseline as pain resolves.",
            confidence=Confidence.HIGH,
            supporting_data={
                "asymmetry_change_ms": ctx.asymmetry_change_ms,
                "pain_reported": True,
            },
        ))

    # Asymmetry increasing + NO subjective report → subclinical (more concerning)
    if (ctx.asymmetry_change_ms is not None and ctx.asymmetry_change_ms > 5
            and not ctx.pain_reported and ctx.rpe is not None):
        insights.append(Insight(
            observation=f"GCT asymmetry increased by {ctx.asymmetry_change_ms:.1f}ms, but the athlete reported no pain (RPE: {ctx.rpe}).",
            interpretation="Subclinical compensation — the body is shifting load asymmetrically without the athlete's awareness. This is often more concerning than pain-reported asymmetry because the athlete doesn't know to modify their training. The biomechanical system is signaling a problem that hasn't reached conscious perception yet.",
            recommendation="Flag for monitoring. If this persists across 2-3 sessions, it warrants a preventive assessment. The absence of pain does not mean the absence of a problem.",
            confidence=Confidence.MODERATE,
            supporting_data={
                "asymmetry_change_ms": ctx.asymmetry_change_ms,
                "rpe": ctx.rpe,
                "pain_reported": False,
            },
        ))

    return insights


def _race_specific_rules(ctx: FusionContext) -> list[Insight]:
    """Insights specific to race-day data — the rarest and most valuable dataset."""
    if not ctx.is_race:
        return []

    insights = []

    # Late-race GCT spike + asymmetry spike → neuromuscular wall
    if (ctx.session_fraction is not None and ctx.session_fraction > 0.75
            and ctx.gct_change_pct is not None and ctx.gct_change_pct > 10
            and ctx.asymmetry_change_ms is not None and ctx.asymmetry_change_ms > 5):
        insights.append(Insight(
            observation=f"In the final quarter of the race, GCT increased {ctx.gct_change_pct:.1f}% and asymmetry spiked {ctx.asymmetry_change_ms:.1f}ms.",
            interpretation="This athlete hit a neuromuscular wall in the final quarter. The unilateral degradation (asymmetry spike) means one side fatigued faster than the other — the performance limiter wasn't cardiovascular capacity or pacing strategy, it was peripheral muscular endurance, specifically on the degrading side.",
            recommendation="[Athlete] Targeted single-leg strength and endurance work on the degrading side. The goal isn't to fix asymmetry at rest — it's to equalize fatigue resistance under race-intensity load. [Product] The degrading side may be experiencing different shoe-ground interaction as mechanics break down. Check if the spike geometry supports the fatigued gait pattern, not just the fresh one.",
            confidence=Confidence.HIGH if ctx.heart_rate_bpm else Confidence.MODERATE,
            supporting_data={
                "session_fraction": ctx.session_fraction,
                "gct_change_pct": ctx.gct_change_pct,
                "asymmetry_change_ms": ctx.asymmetry_change_ms,
            },
        ))

    return insights
