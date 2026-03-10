"""
Subjective data adapter — athlete-reported signals.

This is the source that no wearable can replace: the athlete's own
perception. RPE, pain location, fatigue level, session notes, sleep quality.
These signals are low-frequency (once per session) but high-value for
interpretation. A GCT spike means something different when the athlete
reported "legs felt dead" vs. "felt great, experimenting with form."

Format: JSON or structured form input (from future mobile/web UI).
"""
from __future__ import annotations

import json
from pathlib import Path

from .base import CanonicalRecord, SessionContext, SignalSet, SourceAdapter


class SubjectiveAdapter(SourceAdapter):
    """Adapter for athlete-reported subjective data."""

    source_name = "subjective"

    def supported_signals(self) -> list[str]:
        return ["rpe", "pain_location", "session_note"]

    def read(self, path: Path, athlete_id: str = "", session_context: SessionContext | None = None) -> list[CanonicalRecord]:
        path = Path(path)

        if path.suffix == ".json":
            data = json.loads(path.read_text())
        else:
            return []

        entries = data if isinstance(data, list) else [data]
        records = []

        for entry in entries:
            signals = SignalSet(
                rpe=entry.get("rpe"),
                pain_location=entry.get("pain_location"),
                session_note=entry.get("note") or entry.get("session_note"),
            )
            ctx = session_context or SessionContext(athlete_id=athlete_id)
            ctx.activity_type = entry.get("activity_type", ctx.activity_type)

            records.append(CanonicalRecord(
                timestamp=entry.get("timestamp") or entry.get("date"),
                source=self.source_name,
                source_confidence=0.70,  # subjective data is inherently noisier
                signals=signals,
                context=ctx,
            ))

        return records
