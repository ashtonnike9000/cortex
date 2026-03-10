"""
Coros adapter — placeholder for pod + watch + HR sensor data.

Coros devices export FIT files (binary) or CSV summaries. This adapter
will handle both. For now, it defines the interface and the signal mapping
so the architecture is ready when Coros data arrives.

Coros signal sources:
  - COROS POD 2: stride metrics, ground contact, foot strike, L/R balance
  - COROS PACE 3 / VERTIX 2S: GPS, HR (optical), pace, power, elevation
  - COROS HR Monitor: chest-strap HR (higher accuracy than optical)

The unique value of Coros data: race-day capture. Most wearable data is
from training. Coros athletes wear the full stack in competition.
"""
from __future__ import annotations

from pathlib import Path

from .base import CanonicalRecord, SessionContext, SignalSet, SourceAdapter


# Mapping from Coros CSV/FIT field names to canonical signals.
# These will be confirmed once actual export files are available.
COROS_POD_MAP = {
    "ground_contact_time": "gct_ms",
    "stride_length": "stride_len_m",
    "cadence": "cadence",
    "foot_strike_type": "fsa_deg",
    "l_r_balance": "lr_balance",
    "vertical_oscillation": "vertical_osc_cm",
    "vertical_ratio": "vertical_ratio",
}

COROS_WATCH_MAP = {
    "heart_rate": "heart_rate_bpm",
    "speed": "speed_mps",
    "latitude": "latitude",
    "longitude": "longitude",
    "altitude": "elevation_m",
    "power": "power_w",
    "cadence": "cadence",
}


class CorosPodAdapter(SourceAdapter):
    """Adapter for COROS POD 2 data."""

    source_name = "coros_pod"

    def supported_signals(self) -> list[str]:
        return [
            "gct_ms", "stride_len_m", "cadence", "fsa_deg",
            "vertical_osc_cm", "vertical_ratio",
        ]

    def read(self, path: Path, athlete_id: str = "", session_context: SessionContext | None = None) -> list[CanonicalRecord]:
        # TODO: Implement when Coros export format is available.
        # Expected flow:
        #   1. Parse FIT file or CSV export
        #   2. Map fields through COROS_POD_MAP
        #   3. Emit CanonicalRecord per stride/sample
        #   4. Set source_confidence based on pod placement (back vs. shoe)
        raise NotImplementedError("Awaiting Coros data export format")


class CorosWatchAdapter(SourceAdapter):
    """Adapter for COROS watch data (GPS, HR, power)."""

    source_name = "coros_watch"

    def supported_signals(self) -> list[str]:
        return [
            "heart_rate_bpm", "speed_mps", "latitude", "longitude",
            "elevation_m", "power_w", "cadence",
        ]

    def read(self, path: Path, athlete_id: str = "", session_context: SessionContext | None = None) -> list[CanonicalRecord]:
        raise NotImplementedError("Awaiting Coros data export format")


class CorosHRAdapter(SourceAdapter):
    """Adapter for COROS HR Monitor (chest strap)."""

    source_name = "coros_hr"

    def supported_signals(self) -> list[str]:
        return ["heart_rate_bpm", "hrv_ms"]

    def read(self, path: Path, athlete_id: str = "", session_context: SessionContext | None = None) -> list[CanonicalRecord]:
        raise NotImplementedError("Awaiting Coros data export format")
