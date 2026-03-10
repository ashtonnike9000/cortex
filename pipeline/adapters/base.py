"""
Base adapter and canonical signal schema.

Every source adapter inherits from SourceAdapter and maps its native format
into CanonicalRecord instances. Downstream analysis never touches raw source
data — it works exclusively with canonical records.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class SignalSet:
    """All possible signals from any source. None means not available."""

    # Gait (underfoot / pod)
    gct_ms: Optional[float] = None
    swing_time: Optional[float] = None
    stride_time: Optional[float] = None
    stride_len_m: Optional[float] = None
    cadence: Optional[float] = None
    fsa_deg: Optional[float] = None
    vgrf_avg: Optional[float] = None
    vgrf_peak: Optional[float] = None
    loading_rate: Optional[float] = None
    foot: Optional[str] = None  # "left" | "right" | None

    # Cardio (watch / HR strap)
    heart_rate_bpm: Optional[float] = None
    hrv_ms: Optional[float] = None

    # Spatial (GPS-enabled device)
    speed_mps: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    elevation_m: Optional[float] = None

    # Power (pod or derived)
    power_w: Optional[float] = None

    # Subjective (athlete input)
    rpe: Optional[float] = None
    pain_location: Optional[str] = None
    session_note: Optional[str] = None


@dataclass
class SessionContext:
    """Contextual metadata that wraps every session."""

    session_id: str = ""
    athlete_id: str = ""
    activity_type: str = "training"  # training | race | warmup | test
    footwear: Optional[str] = None
    surface: Optional[str] = None  # track | road | trail | treadmill
    weather: dict = field(default_factory=dict)
    training_phase: Optional[str] = None


@dataclass
class CanonicalRecord:
    """A single timestamped observation from any source."""

    timestamp: Optional[str] = None
    source: str = "unknown"
    source_confidence: float = 1.0
    signals: SignalSet = field(default_factory=SignalSet)
    context: SessionContext = field(default_factory=SessionContext)


class SourceAdapter(ABC):
    """
    Base class for all source adapters.

    Each adapter knows how to read its native format and emit a list of
    CanonicalRecord instances. The adapter is responsible for:
    - Mapping native column names to canonical signal names
    - Setting source_confidence based on known device accuracy
    - Preserving whatever context is available in the raw data
    """

    source_name: str = "unknown"

    @abstractmethod
    def read(self, path) -> list[CanonicalRecord]:
        """Read a file or directory and return canonical records."""
        ...

    @abstractmethod
    def supported_signals(self) -> list[str]:
        """Return the signal names this source can provide."""
        ...
