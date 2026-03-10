"""
Nucleus insole adapter.

Reads the existing Nucleus CSV format and emits canonical records.
This is the bridge between v1 (process.py) and the understanding system —
same data, new schema.
"""
from __future__ import annotations

from pathlib import Path

import pandas as pd

from .base import CanonicalRecord, SessionContext, SignalSet, SourceAdapter

COLUMN_MAP = {
    "timestamp": "timestamp",
    "gct_ms": "gct_ms", "gctms": "gct_ms",
    "swing_time": "swing_time", "swingtime": "swing_time",
    "stride_time": "stride_time", "stridetime": "stride_time",
    "gait_cycle_time": "gait_cycle_time",
    "cadence": "cadence",
    "speed_mps": "speed_mps", "speedmps": "speed_mps",
    "vgrf_average": "vgrf_avg", "vgrfaverage": "vgrf_avg",
    "fsa_deg": "fsa_deg", "fsadeg": "fsa_deg",
    "stride_len_m": "stride_len_m", "stridelenm": "stride_len_m",
    "vgrf_impulse_bws": "vgrf_impulse",
    "vgrf_active_peak_bw": "vgrf_peak", "vgrfactivepeakbw": "vgrf_peak",
    "lr_instantaneous_bwps": "loading_rate",
    "latitude": "latitude", "longitude": "longitude",
}


def _normalize_col(name: str) -> str:
    return COLUMN_MAP.get(name.strip().lower(), name.strip())


def _detect_foot(filename: str) -> str:
    upper = filename.upper()
    if "_L_" in upper or upper.endswith("_L_GAIT_METRICS.CSV"):
        return "left"
    if "_R_" in upper or upper.endswith("_R_GAIT_METRICS.CSV"):
        return "right"
    return "unknown"


class NucleusAdapter(SourceAdapter):
    source_name = "nucleus_insole"

    def supported_signals(self) -> list[str]:
        return [
            "gct_ms", "swing_time", "stride_len_m", "cadence",
            "fsa_deg", "vgrf_avg", "vgrf_peak", "loading_rate", "speed_mps",
        ]

    def read(self, path: Path, athlete_id: str = "", session_context: SessionContext | None = None) -> list[CanonicalRecord]:
        records = []
        path = Path(path)

        csv_files = list(path.glob("*.csv")) if path.is_dir() else [path]

        for f in csv_files:
            if f.stat().st_size == 0:
                continue
            try:
                df = pd.read_csv(f)
            except Exception:
                continue
            if df.empty:
                continue

            df.columns = [_normalize_col(c) for c in df.columns]
            foot = _detect_foot(f.name)

            for _, row in df.iterrows():
                r = row.to_dict()
                signals = SignalSet(
                    gct_ms=r.get("gct_ms"),
                    swing_time=r.get("swing_time"),
                    stride_len_m=r.get("stride_len_m"),
                    cadence=r.get("cadence"),
                    fsa_deg=r.get("fsa_deg"),
                    vgrf_avg=r.get("vgrf_avg"),
                    vgrf_peak=r.get("vgrf_peak"),
                    loading_rate=r.get("loading_rate"),
                    speed_mps=r.get("speed_mps"),
                    foot=foot,
                    latitude=r.get("latitude"),
                    longitude=r.get("longitude"),
                )
                ctx = session_context or SessionContext(athlete_id=athlete_id)

                records.append(CanonicalRecord(
                    timestamp=str(r.get("timestamp")) if r.get("timestamp") else None,
                    source=self.source_name,
                    source_confidence=0.90,
                    signals=signals,
                    context=ctx,
                ))

        return records
