"""
Intelligence briefs — the primary output of the understanding system.

A brief is not a dashboard. It's a curated, contextualized document that
answers three questions for its audience:

  1. What changed? (the observation)
  2. Why does it matter? (the interpretation — this is the hard part)
  3. What should you do? (the recommendation)

The same underlying analysis gets framed differently for each audience.
This is the "know what the data means" differentiator.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class Audience(Enum):
    ATHLETE = "athlete"
    COACH = "coach"
    PRODUCT = "product"
    BIOMECHANIST = "biomechanist"


class Urgency(Enum):
    """How quickly this insight needs attention."""
    IMMEDIATE = "immediate"  # before next session
    THIS_WEEK = "this_week"  # within current training block
    STRATEGIC = "strategic"  # longer-term pattern or opportunity
    ARCHIVAL = "archival"    # interesting but not time-sensitive


class Confidence(Enum):
    """How much the data supports this interpretation."""
    HIGH = "high"        # multiple converging signals, established pattern
    MODERATE = "moderate" # single strong signal or emerging pattern
    LOW = "low"          # suggestive but insufficient data
    SPECULATIVE = "speculative"  # hypothesis worth investigating


@dataclass
class Insight:
    """A single observation-interpretation-recommendation unit."""

    observation: str       # what the data shows (objective)
    interpretation: str    # what it means (requires expertise)
    recommendation: str    # what to do about it
    confidence: Confidence = Confidence.MODERATE
    supporting_data: dict = field(default_factory=dict)


@dataclass
class AthleteBrief:
    """
    Intelligence output for the athlete and coach.

    Structured to complete the loop: know → think → choose → do.
    - "know" = the observation (what happened)
    - "think" = the interpretation (what it means for YOUR body)
    - "choose" = the options (what you could do about it)
    - "do" = the recommendation (what to do next)
    """

    athlete_id: str
    athlete_name: str
    generated_at: str
    brief_type: str  # "session_debrief" | "race_prep" | "weekly_summary" | "trend_alert"
    headline: str
    urgency: Urgency = Urgency.THIS_WEEK

    insights: list[Insight] = field(default_factory=list)

    # The full-loop summary
    know: str = ""     # what the data says
    think: str = ""    # what it means for this athlete
    choose: str = ""   # what the options are
    do: str = ""       # what to do next

    context_summary: str = ""  # where this sits in the training arc
    data_sources: list[str] = field(default_factory=list)


@dataclass
class ProductBrief:
    """
    Intelligence output for the product team.

    Every insight that helps an athlete also contains information about
    what the shoe, spike, or apparel should do differently. This brief
    extracts the product implications from the same analysis.
    """

    generated_at: str
    brief_type: str  # "footwear_interaction" | "population_pattern" | "design_implication" | "validation_finding"
    headline: str

    insights: list[Insight] = field(default_factory=list)

    # Product-specific framing
    affected_product: Optional[str] = None  # e.g., "Nike Air Zoom Victory 2"
    product_category: Optional[str] = None  # e.g., "sprint spike"
    design_implications: list[str] = field(default_factory=list)
    validation_opportunities: list[str] = field(default_factory=list)

    athlete_population: list[str] = field(default_factory=list)  # which athletes contributed
    data_sources: list[str] = field(default_factory=list)
    sample_size: Optional[str] = None  # e.g., "3 athletes, 47 sessions, 12,000 strides"


def generate_athlete_brief(sessions, baseline, context) -> AthleteBrief:
    """
    Generate an athlete-facing intelligence brief.

    This evolves from the existing insights.py engine, adding:
    - Multi-source signal fusion
    - Full-loop framing (know/think/choose/do)
    - Temporal context (where this sits in the training arc)
    - Confidence calibration
    """
    # TODO: Implement. The existing insights.py generates the raw insights.
    # This layer wraps them in the brief structure with audience-appropriate
    # framing and the full know→think→choose→do loop.
    raise NotImplementedError("Phase 2 implementation")


def generate_product_brief(sessions, baseline, fleet_data) -> ProductBrief:
    """
    Generate a product-facing intelligence brief.

    Extracts the product implications from the same analysis that
    produces athlete insights. This is the second audience — the one
    that justifies the capability inside Nike.
    """
    # TODO: Implement. Requires aggregation across athletes to identify
    # patterns with product implications (footwear interactions, degradation
    # signatures, mechanical archetypes that map to product needs).
    raise NotImplementedError("Phase 3 implementation")
