#!/usr/bin/env python3
from __future__ import annotations

"""
Cortex data pipeline v2.

Reads raw session CSVs, normalizes them, builds per-session + aggregate
analytics, generates insights, and outputs JSON for the web app.
"""

import json
import re
from datetime import datetime
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
OUTPUT_DIR = ROOT / "site" / "public" / "data"

CANONICAL_COLS = {
    "timestamp": "timestamp", "gct_ms": "gct_ms", "gctms": "gct_ms",
    "swing_time": "swing_time", "swingtime": "swing_time",
    "stride_time": "stride_time", "stridetime": "stride_time",
    "gait_cycle_time": "gait_cycle_time", "gaitcycletime": "gait_cycle_time",
    "cadence": "cadence", "gct_pct": "gct_pct", "gctpct": "gct_pct",
    "activity_type": "activity_type", "activitytype": "activity_type",
    "speed_mps": "speed_mps", "speedmps": "speed_mps",
    "vgrf_average": "vgrf_avg", "vgrfaverage": "vgrf_avg",
    "fsa_deg": "fsa_deg", "fsadeg": "fsa_deg",
    "stride_len_m": "stride_len_m", "stride_len_m ": "stride_len_m",
    "stridelenm": "stride_len_m",
    "vgrf_impulse_bws": "vgrf_impulse", "vgrfimpulsebws": "vgrf_impulse",
    "vgrf_active_peak_bw": "vgrf_peak", "vgrfactivepeakbw": "vgrf_peak",
    "lr_instantaneous_bwps": "loading_rate", "lrinstantaneousbwps": "loading_rate",
    "vgrf_curve_bn_output_0": "vgrf_curve_0", " vgrf_curve_bn_output_0": "vgrf_curve_0",
    "vgrf_curve_bn_output_1": "vgrf_curve_1", " vgrf_curve_bn_output_1": "vgrf_curve_1",
    "vgrf_curve_bn_output_2": "vgrf_curve_2", " vgrf_curve_bn_output_2": "vgrf_curve_2",
    "vgrf_curve_bn_output_3": "vgrf_curve_3", " vgrf_curve_bn_output_3": "vgrf_curve_3",
    "vgrfcurvebnoutput0": "vgrf_curve_0", "vgrfcurvebnoutput1": "vgrf_curve_1",
    "vgrfcurvebnoutput2": "vgrf_curve_2", "vgrfcurvebnoutput3": "vgrf_curve_3",
    "latitude": "latitude", "longitude": "longitude",
}

GARMIN_LEFT_MAP = {
    "l__gct__ms": "gct_ms", "l__fsa__deg": "fsa_deg",
    "l__stride_length__m": "stride_len_m", "l__speed__mps": "speed_mps",
    "l__vgrf_avg__bw": "vgrf_avg", "l__vgrf_active_peak__bw": "vgrf_peak",
    "l__lr__bwps": "loading_rate", "l__cadence__steps per min": "cadence",
    "l__vgrf_curve_bn_0__": "vgrf_curve_0", "l__vgrf_curve_bn_1__": "vgrf_curve_1",
    "l__vgrf_curve_bn_2__": "vgrf_curve_2", "l__vgrf_curve_bn_3__": "vgrf_curve_3",
}

GARMIN_RIGHT_MAP = {
    "r__gct__ms": "gct_ms", "r__fsa__deg": "fsa_deg",
    "r__stride_length__m": "stride_len_m", "r__speed__mps": "speed_mps",
    "r__vgrf_avg__bw": "vgrf_avg", "r__vgrf_active_peak__bw": "vgrf_peak",
    "r__lr__bwps": "loading_rate", "r__cadence__steps per min": "cadence",
    "r__vgrf_curve_bn_0__": "vgrf_curve_0", "r__vgrf_curve_bn_1__": "vgrf_curve_1",
    "r__vgrf_curve_bn_2__": "vgrf_curve_2", "r__vgrf_curve_bn_3__": "vgrf_curve_3",
}

SPEED_ZONE_BOUNDS = [
    ("recovery", 0, 2.5), ("easy", 2.5, 3.5), ("moderate", 3.5, 4.5),
    ("tempo", 4.5, 5.5), ("fast", 5.5, 7.0), ("sprint", 7.0, 100),
]

RUN_SPEED_MIN = 1.8   # m/s — below this is walking (~14:50/mi)
RUN_SPEED_MAX = 7.0   # m/s — above this is likely sensor noise (~3:50/mi)


# ---------------------------------------------------------------------------
# Utility helpers
# ---------------------------------------------------------------------------

def normalize_col(name: str) -> str:
    lower = name.strip().lower()
    return CANONICAL_COLS.get(lower, name.strip())


def detect_foot(filename: str) -> str:
    upper = filename.upper()
    if "_L_" in upper or upper.endswith("_L_GAIT_METRICS.CSV"):
        return "left"
    if "_R_" in upper or upper.endswith("_R_GAIT_METRICS.CSV"):
        return "right"
    return "unknown"


def parse_session_date(folder_name: str) -> str:
    parts = folder_name.split(".")
    if len(parts) == 3:
        try:
            month, day, year = parts
            y = f"20{year}" if len(year) == 2 else year
            return f"{y}-{int(month):02d}-{int(day):02d}"
        except ValueError:
            pass
    m = re.search(r"(\d{4})(\d{2})(\d{2})", folder_name)
    if m:
        return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
    return folder_name


def parse_garmin_date(filename: str) -> str:
    m = re.match(r"(\d{4}-\d{2}-\d{2})", filename)
    return m.group(1) if m else filename


def ts_sort_key(ts) -> float:
    if ts is None:
        return 0.0
    if isinstance(ts, (int, float)):
        return float(ts)
    s = str(ts)
    try:
        return float(s)
    except ValueError:
        pass
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00")).timestamp()
    except (ValueError, TypeError):
        return 0.0


def safe_mean(values):
    c = [v for v in values if v is not None and not (isinstance(v, float) and pd.isna(v))]
    return round(sum(c) / len(c), 3) if c else None


def safe_max(values):
    c = [v for v in values if v is not None and not (isinstance(v, float) and pd.isna(v))]
    return round(max(c), 3) if c else None


def safe_min(values):
    c = [v for v in values if v is not None and not (isinstance(v, float) and pd.isna(v))]
    return round(min(c), 3) if c else None


def safe_std(values):
    c = [v for v in values if v is not None and not (isinstance(v, float) and pd.isna(v))]
    if len(c) < 2:
        return None
    m = sum(c) / len(c)
    return round((sum((x - m) ** 2 for x in c) / (len(c) - 1)) ** 0.5, 3)


def extract(strides, key):
    return [s.get(key) for s in strides if s.get(key) is not None]


def is_running_stride(stride) -> bool:
    """True if the stride's speed falls within a reasonable running range."""
    spd = stride.get("speed_mps")
    if spd is None or (isinstance(spd, float) and pd.isna(spd)):
        return False
    return RUN_SPEED_MIN <= spd <= RUN_SPEED_MAX


def filter_running(strides: list) -> list:
    """Return only strides that look like actual running."""
    return [s for s in strides if is_running_stride(s)]


def normalize_per_foot_record(rec: dict) -> dict:
    """Fix per-foot sensor data to standard running metrics.

    Sensors report per-foot values:
    - stride_len_m is a full gait cycle (same foot to same foot) → halve for step length
    - cadence is one foot's steps/min → double for true running cadence

    Uses heuristics to avoid double-correcting already-normalized data:
    - Only halve stride if > 1.8m (clearly a gait cycle, not a step)
    - Only double cadence if < 120 spm (clearly per-foot, not total)
    """
    sl = rec.get("stride_len_m")
    if sl is not None and not (isinstance(sl, float) and pd.isna(sl)) and sl > 1.8:
        rec["stride_len_m"] = sl / 2.0

    cad = rec.get("cadence")
    if cad is not None and not (isinstance(cad, float) and pd.isna(cad)) and cad < 120:
        rec["cadence"] = cad * 2.0

    return rec


# ---------------------------------------------------------------------------
# CSV readers — return (sessions, all_left, all_right)
# ---------------------------------------------------------------------------

def process_nucleus(athlete_dir: Path, source_label: str | None = None):
    sessions_dir = athlete_dir / "sessions"
    if not sessions_dir.exists():
        return [], [], []
    sessions, all_left, all_right = [], [], []
    for date_dir in sorted(sessions_dir.iterdir()):
        if not date_dir.is_dir():
            continue
        left, right = [], []
        for f in date_dir.glob("*.csv"):
            if f.stat().st_size == 0:
                continue
            try:
                df = pd.read_csv(f)
            except Exception:
                continue
            if df.empty:
                continue
            df.columns = [normalize_col(c) for c in df.columns]
            foot = detect_foot(f.name)
            recs = df.to_dict("records")
            for r in recs:
                r["foot"] = foot
                normalize_per_foot_record(r)
            (left if foot == "left" else right).extend(recs)
        if not left and not right:
            continue
        sessions.append(build_session(parse_session_date(date_dir.name), date_dir.name, left, right, source_label))
        all_left.extend(left)
        all_right.extend(right)
    return sessions, all_left, all_right


def process_garmin(athlete_dir: Path, source_label: str | None = None):
    sessions_dir = athlete_dir / "sessions"
    if not sessions_dir.exists():
        return [], [], []
    sessions, all_left, all_right = [], [], []
    for f in sorted(sessions_dir.glob("*.csv")):
        if f.stat().st_size == 0:
            continue
        try:
            df = pd.read_csv(f)
        except Exception:
            continue
        if df.empty:
            continue
        left_df = df[[c for c in df.columns if c.startswith("l__") or c == "timestamp"]].copy()
        right_df = df[[c for c in df.columns if c.startswith("r__") or c == "timestamp"]].copy()
        left_df.columns = [GARMIN_LEFT_MAP.get(c, c) for c in left_df.columns]
        right_df.columns = [GARMIN_RIGHT_MAP.get(c, c) for c in right_df.columns]
        left, right = [], []
        for _, row in left_df.iterrows():
            r = row.to_dict()
            if pd.notna(r.get("gct_ms")) and r.get("gct_ms", 0) > 0:
                r["foot"] = "left"
                normalize_per_foot_record(r)
                left.append(r)
        for _, row in right_df.iterrows():
            r = row.to_dict()
            if pd.notna(r.get("gct_ms")) and r.get("gct_ms", 0) > 0:
                r["foot"] = "right"
                normalize_per_foot_record(r)
                right.append(r)
        if not left and not right:
            continue
        sessions.append(build_session(parse_garmin_date(f.name), f.stem, left, right, source_label))
        all_left.extend(left)
        all_right.extend(right)
    return sessions, all_left, all_right


def process_nucleus_flat(athlete_dir: Path, activity_types: list[str] | None = None, source_label: str | None = None):
    """Process Nucleus CSVs in flat folder layout: {Athlete}/{ActivityType}/*.csv
    Groups files into sessions by the session ID embedded in the filename
    (4th underscore-separated field)."""
    if activity_types is None:
        activity_types = ["Run"]

    sessions, all_left, all_right = [], [], []

    for act_type in activity_types:
        act_dir = athlete_dir / act_type
        if not act_dir.exists():
            continue

        is_sprint = act_type.lower() == "sprint"

        by_session: dict[str, list[Path]] = {}
        for f in sorted(act_dir.glob("*.csv")):
            if f.stat().st_size == 0:
                continue
            session_id = _extract_session_id(f.name)
            by_session.setdefault(session_id, []).append(f)

        for session_id, files in sorted(by_session.items()):
            left, right = [], []
            session_date = None

            for f in files:
                try:
                    df = pd.read_csv(f)
                except Exception:
                    continue
                if df.empty:
                    continue

                df.columns = [normalize_col(c) for c in df.columns]
                foot = detect_foot(f.name)
                recs = df.to_dict("records")

                # Filter out zero-GCT rows (placeholder/empty strides)
                valid = []
                for r in recs:
                    gct = r.get("gct_ms")
                    if gct is not None and not (isinstance(gct, float) and pd.isna(gct)) and gct > 0:
                        r["foot"] = foot
                        normalize_per_foot_record(r)
                        if is_sprint:
                            r["activity_label"] = "sprint"
                        valid.append(r)

                (left if foot == "left" else right).extend(valid)

                if session_date is None:
                    session_date = _extract_date_from_filename(f.name)

            if not left and not right:
                continue

            label_prefix = f"[Sprint] " if is_sprint else ""
            label = f"{label_prefix}{session_date or session_id}"
            sessions.append(build_session(session_date or session_id, label, left, right, source_label))
            all_left.extend(left)
            all_right.extend(right)

    return sessions, all_left, all_right


def _extract_session_id(filename: str) -> str:
    """Extract session ID from Nucleus filename.
    Format: YYYYMMDD_HHMMSS_timestamp_sessionId_sensorId_foot_gait_metrics.csv"""
    parts = filename.split("_")
    if len(parts) >= 4:
        return parts[3]
    return filename


def _extract_date_from_filename(filename: str) -> str:
    """Extract date from Nucleus flat filename (YYYYMMDD_HHMMSS_...)."""
    m = re.match(r"(\d{4})(\d{2})(\d{2})", filename)
    if m:
        return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
    m2 = re.match(r"(\d{4}-\d{2}-\d{2})", filename)
    if m2:
        return m2.group(1)
    return filename[:10]


# ---------------------------------------------------------------------------
# Session builder
# ---------------------------------------------------------------------------

def build_session(date: str, label: str, left: list, right: list, source_label: str | None = None) -> dict:
    all_raw = left + right

    # Filtered sets — used for all metric computations
    left_f = filter_running(left)
    right_f = filter_running(right)
    all_f = left_f + right_f

    n_filtered_out = len(all_raw) - len(all_f)

    speed_zones = build_speed_zones(all_f)
    fatigue = build_fatigue(left_f, right_f)
    bilateral = build_bilateral(left_f, right_f)
    ts = build_time_series(all_raw)  # time series keeps ALL data with running flag
    mile_splits = build_mile_splits(all_f)

    l_gct, r_gct = extract(left_f, "gct_ms"), extract(right_f, "gct_ms")
    l_sl, r_sl = extract(left_f, "stride_len_m"), extract(right_f, "stride_len_m")
    l_fsa, r_fsa = extract(left_f, "fsa_deg"), extract(right_f, "fsa_deg")

    stride_lens = extract(all_f, "stride_len_m")
    total_distance_m = round(sum(stride_lens), 1) if stride_lens else 0
    total_distance_mi = round(total_distance_m / 1609.344, 2) if total_distance_m else 0

    load = build_load_metrics(all_f, total_distance_mi)

    result = {
        "date": date, "label": label,
        "n_strides": len(all_raw), "n_left": len(left), "n_right": len(right),
        "n_running_strides": len(all_f),
        "n_filtered_out": n_filtered_out,
        "distance_m": total_distance_m,
        "distance_mi": total_distance_mi,
        "filter": {"min_speed_mps": RUN_SPEED_MIN, "max_speed_mps": RUN_SPEED_MAX},
        "metrics": {
            "avg_speed_mps": safe_mean(extract(all_f, "speed_mps")),
            "max_speed_mps": safe_max(extract(all_f, "speed_mps")),
            "avg_gct_ms": safe_mean(extract(all_f, "gct_ms")),
            "std_gct_ms": safe_std(extract(all_f, "gct_ms")),
            "avg_stride_len_m": safe_mean(extract(all_f, "stride_len_m")),
            "avg_cadence_spm": safe_mean(extract(all_f, "cadence")),
            "avg_fsa_deg": safe_mean(extract(all_f, "fsa_deg")),
            "avg_vgrf_bw": safe_mean(extract(all_f, "vgrf_avg")),
            "avg_vgrf_peak_bw": safe_mean(extract(all_f, "vgrf_peak")),
            "avg_loading_rate": safe_mean(extract(all_f, "loading_rate")),
        },
        "asymmetry": {
            "gct_ms": round(safe_mean(l_gct) - safe_mean(r_gct), 3) if l_gct and r_gct else None,
            "stride_len_m": round(safe_mean(l_sl) - safe_mean(r_sl), 3) if l_sl and r_sl else None,
            "fsa_deg": round(safe_mean(l_fsa) - safe_mean(r_fsa), 3) if l_fsa and r_fsa else None,
        },
        "left_summary": _side_summary(left_f),
        "right_summary": _side_summary(right_f),
        "bilateral": bilateral, "speed_zones": speed_zones,
        "fatigue": fatigue, "time_series": ts,
        "mile_splits": mile_splits,
        "load": load,
    }
    if source_label:
        result["source"] = source_label
    return result


def _side_summary(strides):
    return {
        "avg_gct_ms": safe_mean(extract(strides, "gct_ms")),
        "std_gct_ms": safe_std(extract(strides, "gct_ms")),
        "avg_stride_len_m": safe_mean(extract(strides, "stride_len_m")),
        "avg_fsa_deg": safe_mean(extract(strides, "fsa_deg")),
        "std_fsa_deg": safe_std(extract(strides, "fsa_deg")),
        "avg_vgrf_bw": safe_mean(extract(strides, "vgrf_avg")),
        "avg_vgrf_peak_bw": safe_mean(extract(strides, "vgrf_peak")),
        "avg_loading_rate": safe_mean(extract(strides, "loading_rate")),
    }


# ---------------------------------------------------------------------------
# Analytics builders
# ---------------------------------------------------------------------------

def build_speed_zones(strides):
    zones = []
    for name, lo, hi in SPEED_ZONE_BOUNDS:
        zs = [s for s in strides if s.get("speed_mps") is not None and lo <= s["speed_mps"] < hi]
        if not zs:
            continue
        zones.append({
            "zone": name, "count": len(zs),
            "avg_speed": safe_mean([s["speed_mps"] for s in zs]),
            "avg_gct_ms": safe_mean(extract(zs, "gct_ms")),
            "avg_fsa_deg": safe_mean(extract(zs, "fsa_deg")),
            "avg_vgrf_bw": safe_mean(extract(zs, "vgrf_avg")),
            "avg_vgrf_peak_bw": safe_mean(extract(zs, "vgrf_peak")),
            "avg_stride_len_m": safe_mean(extract(zs, "stride_len_m")),
            "avg_cadence": safe_mean(extract(zs, "cadence")),
        })
    return zones


def build_fatigue(left, right):
    all_s = left + right
    if len(all_s) < 20:
        return None
    sa = sorted(all_s, key=lambda s: ts_sort_key(s.get("timestamp")))
    q = len(sa) // 4
    if q < 5:
        return None
    fq, lq = sa[:q], sa[-q:]

    def drift(metric):
        fv = safe_mean([s.get(metric) for s in fq if s.get(metric) is not None])
        lv = safe_mean([s.get(metric) for s in lq if s.get(metric) is not None])
        if fv is None or lv is None or fv == 0:
            return None
        return {"first_q": fv, "last_q": lv, "change": round(lv - fv, 3),
                "pct_change": round((lv - fv) / abs(fv) * 100, 1)}

    def side_drift(strides, metric):
        ss = sorted(strides, key=lambda s: ts_sort_key(s.get("timestamp")))
        ql = len(ss) // 4
        if ql < 3:
            return None
        fv = safe_mean([s.get(metric) for s in ss[:ql] if s.get(metric) is not None])
        lv = safe_mean([s.get(metric) for s in ss[-ql:] if s.get(metric) is not None])
        if fv is None or lv is None or fv == 0:
            return None
        return {"first_q": fv, "last_q": lv, "change": round(lv - fv, 3),
                "pct_change": round((lv - fv) / abs(fv) * 100, 1)}

    r = {"gct_ms": drift("gct_ms"), "vgrf_bw": drift("vgrf_avg"),
         "speed_mps": drift("speed_mps"), "cadence": drift("cadence"),
         "stride_len_m": drift("stride_len_m")}
    if left and right:
        r["left_gct"] = side_drift(left, "gct_ms")
        r["right_gct"] = side_drift(right, "gct_ms")
        r["left_vgrf"] = side_drift(left, "vgrf_avg")
        r["right_vgrf"] = side_drift(right, "vgrf_avg")
        sl = sorted(left, key=lambda s: ts_sort_key(s.get("timestamp")))
        sr = sorted(right, key=lambda s: ts_sort_key(s.get("timestamp")))
        ql, qr = max(1, len(sl)//4), max(1, len(sr)//4)
        lf = safe_mean(extract(sl[:ql], "gct_ms"))
        rf = safe_mean(extract(sr[:qr], "gct_ms"))
        ll = safe_mean(extract(sl[-ql:], "gct_ms"))
        rl = safe_mean(extract(sr[-qr:], "gct_ms"))
        if all(v is not None for v in [lf, rf, ll, rl]):
            r["asymmetry_drift"] = {"gct_first_q": round(lf - rf, 1), "gct_last_q": round(ll - rl, 1)}
    return r


def build_bilateral(left, right):
    if not left or not right:
        return []
    defs = [
        ("Ground Contact Time", "gct_ms", "ms", 10),
        ("Foot Strike Angle", "fsa_deg", "°", 3),
        ("vGRF Average", "vgrf_avg", "BW", 0.1),
        ("vGRF Peak", "vgrf_peak", "BW", 0.15),
        ("Stride Length", "stride_len_m", "m", 0.05),
        ("Loading Rate", "loading_rate", "BW/s", 5),
    ]
    rows = []
    for label, key, unit, thresh in defs:
        lv, rv = extract(left, key), extract(right, key)
        if not lv or not rv:
            continue
        lm, rm = safe_mean(lv), safe_mean(rv)
        diff = round(lm - rm, 3) if lm and rm else None
        assessment = "—"
        if diff is not None:
            ad = abs(diff)
            assessment = "Excellent" if ad < thresh * 0.5 else "Normal" if ad < thresh else "Monitor"
        rows.append({"label": label, "unit": unit,
                      "left_mean": lm, "left_std": safe_std(lv),
                      "right_mean": rm, "right_std": safe_std(rv),
                      "diff": diff, "assessment": assessment})
    return rows


def _rolling_smooth(values, window):
    """Apply centered rolling average, handling None values."""
    n = len(values)
    out = [None] * n
    half = window // 2
    for i in range(n):
        lo = max(0, i - half)
        hi = min(n, i + half + 1)
        chunk = [v for v in values[lo:hi] if v is not None]
        if chunk:
            out[i] = sum(chunk) / len(chunk)
    return out


def build_time_series(strides):
    """Build dense time-series with cumulative distance. Targets ~600-800 points."""
    if not strides:
        return []
    ss = sorted(strides, key=lambda s: ts_sort_key(s.get("timestamp")))
    target = 700
    step = max(1, len(ss) // target)

    distances = []
    d = 0.0
    for s in ss:
        sl = s.get("stride_len_m")
        if sl and sl > 0:
            d += sl
        distances.append(d)

    points = []
    for i in range(0, len(ss), step):
        s = ss[i]
        pt = {
            "idx": len(points),
            "dist_m": round(distances[i], 1),
            "dist_mi": round(distances[i] / 1609.344, 3),
        }
        for key, out in [("speed_mps", "speed"), ("gct_ms", "gct"), ("cadence", "cadence"),
                         ("fsa_deg", "fsa"), ("vgrf_avg", "vgrf"), ("vgrf_peak", "vgrf_peak"),
                         ("loading_rate", "lr"), ("stride_len_m", "stride"),
                         ("vgrf_impulse", "impulse")]:
            v = s.get(key)
            if v is not None:
                pt[out] = round(v, 3) if isinstance(v, float) else v
        pt["foot"] = s.get("foot", "unknown")
        pt["running"] = is_running_stride(s)
        points.append(pt)

    # Smoothed pace: rolling average of speed, then convert to min/mile
    SMOOTH_WINDOW = 21
    raw_speeds = [p.get("speed") for p in points]
    smoothed = _rolling_smooth(raw_speeds, SMOOTH_WINDOW)
    for i, p in enumerate(points):
        s = smoothed[i]
        if s and s > 0.3:
            p["pace"] = round(26.8224 / s, 2)  # min per mile
        else:
            p["pace"] = None

    return points


def build_mile_splits(strides):
    """Compute per-mile metric summaries from stride data."""
    if not strides:
        return []
    ss = sorted(strides, key=lambda s: ts_sort_key(s.get("timestamp")))

    MILE_M = 1609.344
    splits = []
    current_strides = []
    cum_dist = 0.0
    mile_num = 1

    for s in ss:
        sl = s.get("stride_len_m")
        if sl and sl > 0:
            cum_dist += sl
        current_strides.append(s)

        if cum_dist >= mile_num * MILE_M and current_strides:
            splits.append(_make_split(mile_num, current_strides, MILE_M))
            current_strides = []
            mile_num += 1

    # Final partial mile
    if current_strides:
        actual_dist = sum(s.get("stride_len_m", 0) for s in current_strides)
        splits.append(_make_split(mile_num, current_strides, actual_dist))

    return splits


def _make_split(mile_num, strides, distance_m):
    return {
        "mile": mile_num,
        "distance_m": round(distance_m, 1),
        "n_strides": len(strides),
        "metrics": {
            "avg_speed_mps": safe_mean(extract(strides, "speed_mps")),
            "avg_gct_ms": safe_mean(extract(strides, "gct_ms")),
            "avg_cadence_spm": safe_mean(extract(strides, "cadence")),
            "avg_vgrf_peak_bw": safe_mean(extract(strides, "vgrf_peak")),
            "avg_fsa_deg": safe_mean(extract(strides, "fsa_deg")),
            "avg_stride_len_m": safe_mean(extract(strides, "stride_len_m")),
            "avg_loading_rate": safe_mean(extract(strides, "loading_rate")),
        },
    }


def build_load_metrics(strides, distance_mi):
    """Estimate mechanical load from vGRF impulse or force-time proxy."""
    if not strides:
        return {"total": 0, "per_mile": 0, "per_stride_avg": 0}

    loads = []
    for s in strides:
        imp = s.get("vgrf_impulse")
        if imp is not None and imp > 0:
            loads.append(imp)
        else:
            peak = s.get("vgrf_peak")
            gct = s.get("gct_ms")
            if peak and gct and peak > 0 and gct > 0:
                loads.append(peak * gct / 1000.0)

    total = round(sum(loads), 2) if loads else 0
    per_stride = round(total / len(loads), 4) if loads else 0
    per_mile = round(total / distance_mi, 2) if distance_mi and distance_mi > 0 else 0

    return {"total": total, "per_mile": per_mile, "per_stride_avg": per_stride}


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    from insights import generate_insights
    from baseline import compute_baseline, compute_session_deviations, compute_status, compute_trend_narratives
    from models import compute_fatigue_profile, predict_race_times, assess_confidence, build_watch_list

    athletes_cfg = json.loads((DATA_DIR / "athletes.json").read_text())
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    all_athlete_data = []

    for ath in athletes_cfg["athletes"]:
        name = ath["name"]
        aid = ath["id"]
        print(f"Processing {name}...")

        sessions = []
        al, ar = [], []

        for src_cfg in ath.get("sources", []):
            folder = src_cfg["folder"]
            src_type = src_cfg["type"]
            src_label = src_cfg.get("label")
            adir = DATA_DIR / "athletes" / folder

            if src_type == "nucleus":
                s, sl, sr = process_nucleus(adir, src_label)
            elif src_type == "garmin":
                s, sl, sr = process_garmin(adir, src_label)
            elif src_type == "nucleus_flat":
                act_types = src_cfg.get("activity_types", ["Run"])
                s, sl, sr = process_nucleus_flat(adir, act_types, src_label)
            else:
                continue

            sessions.extend(s)
            al.extend(sl)
            ar.extend(sr)

        sessions.sort(key=lambda s: s["date"])
        total = sum(s["n_strides"] for s in sessions)
        total_running = sum(s.get("n_running_strides", s["n_strides"]) for s in sessions)
        total_filtered = total - total_running
        print(f"  {len(sessions)} sessions, {total} strides ({total_filtered} filtered as non-running)")

        # Cumulative load tracking across sessions
        cum_load = 0.0
        for s in sessions:
            session_load = s.get("load", {}).get("total", 0)
            cum_load += session_load
            s["load"]["cumulative"] = round(cum_load, 2)

        al_f = filter_running(al)
        ar_f = filter_running(ar)
        aggregate = build_session("all", "All Runs", al_f, ar_f)
        insights = generate_insights(sessions, aggregate)

        baseline = compute_baseline(al_f, ar_f)
        all_deviations = {}
        for s in sessions:
            devs = compute_session_deviations(s, baseline)
            all_deviations[s["date"]] = devs
            s["deviations"] = devs

        status = compute_status(sessions, baseline, all_deviations)
        trend_narratives = compute_trend_narratives(sessions, baseline)
        fatigue_profile = compute_fatigue_profile(sessions)
        race_predictions = predict_race_times(sessions, fatigue_profile)
        # Confidence and watch list
        if race_predictions.get("has_predictions"):
            confidence = assess_confidence(race_predictions["model_inputs"], sessions)
            race_predictions["confidence"] = confidence

        watch_list = build_watch_list(sessions, fatigue_profile, baseline, trend_narratives)

        print(f"  Status: {status['level']} | {len(trend_narratives)} trend narratives | {len(watch_list)} watch items")
        if race_predictions.get("has_predictions"):
            preds = race_predictions["predictions"]
            conf = race_predictions.get("confidence", {})
            times_str = ", ".join(f"{k}: {v['predicted_time_fmt']}" for k, v in preds.items())
            print(f"  Predicted: {times_str} (confidence: {conf.get('label', '?')})")

        athlete_out = {
            "id": aid, "name": name,
            "sport": ath.get("sport", "running"),
            "sessions": sessions,
            "aggregate": aggregate,
            "insights": insights,
            "baseline": baseline,
            "status": status,
            "trend_narratives": trend_narratives,
            "fatigue_profile": fatigue_profile,
            "race_predictions": race_predictions,
            "watch_list": watch_list,
            "session_count": len(sessions),
            "total_strides": total,
            "date_range": {
                "first": sessions[0]["date"] if sessions else None,
                "last": sessions[-1]["date"] if sessions else None,
            },
        }

        (OUTPUT_DIR / f"{aid}.json").write_text(json.dumps(athlete_out, indent=2))
        print(f"  Wrote {aid}.json")
        all_athlete_data.append(athlete_out)

    summary = build_cross_athlete_summary(all_athlete_data)
    (OUTPUT_DIR / "summary.json").write_text(json.dumps(summary, indent=2))
    print(f"\nWrote summary.json with {len(all_athlete_data)} athletes")


def build_cross_athlete_summary(athletes):
    """Build fleet-level summary with status-first data for the coach dashboard."""
    rows = []
    all_gct, all_vgrf, all_asym, all_speed = [], [], [], []

    for a in athletes:
        agg = a.get("aggregate", {})
        m = agg.get("metrics", {})
        asym = agg.get("asymmetry", {})
        status = a.get("status", {})

        recent_sessions = a.get("sessions", [])[-3:]
        alert_count = sum(
            len([d for d in s.get("deviations", []) if d.get("severity") == "alert"])
            for s in recent_sessions
        )
        watch_count = sum(
            len([d for d in s.get("deviations", []) if d.get("severity") == "watch"])
            for s in recent_sessions
        )
        attention_score = alert_count * 3 + watch_count

        total_dist = sum(s.get("distance_mi", 0) for s in a.get("sessions", []))
        total_load = sum(s.get("load", {}).get("total", 0) for s in a.get("sessions", []))

        row = {
            "id": a["id"], "name": a["name"],
            "session_count": a["session_count"],
            "total_strides": a["total_strides"],
            "date_range": a["date_range"],
            "avg_speed_mps": m.get("avg_speed_mps"),
            "avg_gct_ms": m.get("avg_gct_ms"),
            "avg_stride_len_m": m.get("avg_stride_len_m"),
            "avg_cadence_spm": m.get("avg_cadence_spm"),
            "avg_vgrf_peak_bw": m.get("avg_vgrf_peak_bw"),
            "avg_fsa_deg": m.get("avg_fsa_deg"),
            "gct_asymmetry_ms": asym.get("gct_ms"),
            "total_distance_mi": round(total_dist, 2),
            "total_load": round(total_load, 1),
            "status": status,
            "attention_score": attention_score,
            "alert_count": alert_count,
            "watch_count": watch_count,
            "headline_insight": a.get("insights", [{}])[0].get("title") if a.get("insights") else None,
            "watch_list_count": len(a.get("watch_list", [])),
            "watch_list_top": a.get("watch_list", [])[:3],
            "prediction_confidence": a.get("race_predictions", {}).get("confidence", {}).get("level"),
        }
        rows.append(row)
        if m.get("avg_gct_ms"): all_gct.append(m["avg_gct_ms"])
        if m.get("avg_vgrf_peak_bw"): all_vgrf.append(m["avg_vgrf_peak_bw"])
        if asym.get("gct_ms") is not None: all_asym.append(abs(asym["gct_ms"]))
        if m.get("avg_speed_mps"): all_speed.append(m["avg_speed_mps"])

    rows.sort(key=lambda r: r.get("attention_score", 0), reverse=True)

    synthesis = generate_fleet_synthesis(athletes, rows)

    fleet_watch = []
    for a in athletes:
        for item in a.get("watch_list", []):
            if item.get("severity") in ("alert", "warn"):
                fleet_watch.append({**item, "athlete": a["name"], "athlete_id": a["id"]})
    fleet_watch.sort(key=lambda x: {"alert": 0, "warn": 1}.get(x["severity"], 9))

    return {
        "generated_at": datetime.now().isoformat(),
        "athletes": rows,
        "fleet_watch_list": fleet_watch[:15],
        "fleet": {
            "total_athletes": len(athletes),
            "total_sessions": sum(a["session_count"] for a in athletes),
            "total_strides": sum(a["total_strides"] for a in athletes),
            "avg_gct_ms": safe_mean(all_gct),
            "avg_vgrf_peak_bw": safe_mean(all_vgrf),
            "avg_asymmetry_ms": safe_mean(all_asym),
            "avg_speed_mps": safe_mean(all_speed),
        },
        "distributions": {
            "gct_ms": sorted(all_gct),
            "vgrf_peak_bw": sorted(all_vgrf),
            "asymmetry_ms": sorted(all_asym),
            "speed_mps": sorted(all_speed),
        },
        "synthesis": synthesis,
    }


def generate_fleet_synthesis(athletes, rows):
    """Generate cross-athlete synthesis: patterns, comparisons, and relationships."""
    synthesis = []
    n = len(athletes)

    if n < 2:
        synthesis.append({
            "category": "fleet",
            "severity": "info",
            "title": "Building your pack",
            "text": f"With {n} athlete{'s' if n != 1 else ''} in the system, individual analysis is available. Cross-runner patterns, trends, and relationships will emerge as more athletes are added. Even 3-4 runners reveal meaningful pack-level signals.",
        })
        return synthesis

    # -------------------------------------------------------------------
    # 1. Pace-matched efficiency comparison across shared speed zones
    # -------------------------------------------------------------------
    shared_zones = set()
    athlete_zones = {}
    for a in athletes:
        bl = a.get("baseline", {}).get("zones", {})
        zones = set(bl.keys())
        athlete_zones[a["name"]] = bl
        if not shared_zones:
            shared_zones = zones
        else:
            shared_zones &= zones

    for zone in ["easy", "moderate", "tempo", "fast"]:
        if zone not in shared_zones:
            continue
        zone_data = []
        for a in athletes:
            bl = athlete_zones.get(a["name"], {}).get(zone, {})
            gct = bl.get("gct_ms", {}).get("mean")
            sl = bl.get("stride_len_m", {}).get("mean")
            cad = bl.get("cadence", {}).get("mean")
            vgrf = bl.get("vgrf_avg", {}).get("mean")
            count = bl.get("_count", 0)
            if gct is not None and count >= 10:
                zone_data.append({"name": a["name"], "gct": gct, "stride": sl, "cadence": cad, "vgrf": vgrf, "count": count})

        if len(zone_data) >= 2:
            sorted_gct = sorted(zone_data, key=lambda x: x["gct"])
            fastest = sorted_gct[0]
            slowest = sorted_gct[-1]
            diff = slowest["gct"] - fastest["gct"]

            if diff > 5:
                synthesis.append({
                    "category": "efficiency",
                    "severity": "notable",
                    "zone": zone,
                    "title": f"GCT spread of {diff:.0f}ms at {zone} pace",
                    "text": f"At {zone} pace, {fastest['name']} averages {fastest['gct']:.0f}ms ground contact while {slowest['name']} averages {slowest['gct']:.0f}ms — a {diff:.0f}ms difference. Shorter GCT at the same pace indicates more efficient force application. This gap reveals different mechanical profiles operating at the same intensity.",
                    "athletes": [d["name"] for d in zone_data],
                    "data": {d["name"]: {"gct": d["gct"], "stride": d.get("stride"), "cadence": d.get("cadence")} for d in zone_data},
                })

            # Stride length comparison at same pace
            stride_data = [d for d in zone_data if d.get("stride")]
            if len(stride_data) >= 2:
                sorted_sl = sorted(stride_data, key=lambda x: x["stride"], reverse=True)
                sl_diff = sorted_sl[0]["stride"] - sorted_sl[-1]["stride"]
                if sl_diff > 0.05:
                    synthesis.append({
                        "category": "mechanics",
                        "severity": "info",
                        "zone": zone,
                        "title": f"Stride length varies {sl_diff:.2f}m at {zone} pace",
                        "text": f"At {zone} pace, {sorted_sl[0]['name']} takes {sorted_sl[0]['stride']:.2f}m strides vs {sorted_sl[-1]['name']} at {sorted_sl[-1]['stride']:.2f}m. Longer strides at the same pace aren't inherently better — they must be combined with GCT and force data to understand efficiency. {sorted_sl[0]['name']}'s longer strides {'with shorter GCT suggest higher mechanical efficiency' if zone_data[0]['gct'] < zone_data[-1]['gct'] and zone_data[0]['name'] == sorted_sl[0]['name'] else 'reveal a different movement strategy'}.",
                        "athletes": [d["name"] for d in stride_data],
                    })

    # -------------------------------------------------------------------
    # 2. Asymmetry comparison
    # -------------------------------------------------------------------
    asym_data = [(a["name"], abs(a.get("aggregate", {}).get("asymmetry", {}).get("gct_ms", 0) or 0)) for a in athletes]
    asym_data.sort(key=lambda x: x[1], reverse=True)
    if len(asym_data) >= 2:
        highest = asym_data[0]
        lowest = asym_data[-1]
        if highest[1] > 5 and highest[1] - lowest[1] > 3:
            synthesis.append({
                "category": "asymmetry",
                "severity": "notable" if highest[1] > 10 else "info",
                "title": f"Asymmetry range: {lowest[1]:.1f}ms to {highest[1]:.1f}ms across the pack",
                "text": f"{highest[0]} shows the most bilateral asymmetry at {highest[1]:.1f}ms, while {lowest[0]} is most symmetric at {lowest[1]:.1f}ms. {'This spread suggests different injury histories or structural differences between athletes.' if highest[1] > 10 else 'Both are within acceptable ranges, but the difference highlights individual variation.'} Tracking each athlete against their own baseline matters more than comparing between athletes — a 5ms asymmetry that's consistent is less concerning than a sudden 3ms shift.",
                "athletes": [d[0] for d in asym_data],
            })

    # -------------------------------------------------------------------
    # 3. Common deviation patterns
    # -------------------------------------------------------------------
    dev_by_metric = {}
    for a in athletes:
        recent = a.get("sessions", [])[-3:]
        for s in recent:
            for d in s.get("deviations", []):
                key = d.get("metric", "unknown")
                dev_by_metric.setdefault(key, []).append({"name": a["name"], "zone": d.get("zone"), "severity": d.get("severity")})

    for metric, devs in dev_by_metric.items():
        affected_athletes = set(d["name"] for d in devs)
        if len(affected_athletes) >= 2:
            metric_labels = {"gct_ms": "GCT", "cadence": "Cadence", "fsa_deg": "FSA", "stride_len_m": "Stride Length", "vgrf_avg": "vGRF", "vgrf_peak": "Peak vGRF"}
            label = metric_labels.get(metric, metric)
            alert_count = sum(1 for d in devs if d["severity"] == "alert")
            synthesis.append({
                "category": "pattern",
                "severity": "notable" if alert_count >= 2 else "info",
                "title": f"{label} deviating across {len(affected_athletes)} athletes",
                "text": f"Multiple athletes are showing {label} deviations from their personal baselines in recent sessions: {', '.join(sorted(affected_athletes))}. When the same metric deviates across multiple athletes simultaneously, it may indicate a shared factor — similar training load, environmental conditions, or a common phase in a training cycle. {'This warrants investigation.' if alert_count >= 2 else 'Worth monitoring as more data comes in.'}",
                "athletes": sorted(affected_athletes),
            })

    # -------------------------------------------------------------------
    # 4. Status distribution summary
    # -------------------------------------------------------------------
    status_counts = {"on_track": 0, "watch": 0, "check_in": 0}
    for a in athletes:
        lvl = a.get("status", {}).get("level", "on_track")
        status_counts[lvl] = status_counts.get(lvl, 0) + 1

    if n >= 2:
        parts = []
        if status_counts["on_track"] > 0:
            parts.append(f"{status_counts['on_track']} on track")
        if status_counts["watch"] > 0:
            parts.append(f"{status_counts['watch']} to watch")
        if status_counts["check_in"] > 0:
            parts.append(f"{status_counts['check_in']} need check-in")
        synthesis.append({
            "category": "fleet",
            "severity": "notable" if status_counts["check_in"] > n * 0.5 else "info",
            "title": f"Pack status: {', '.join(parts)}",
            "text": f"Across {n} runners and {sum(a['session_count'] for a in athletes)} total sessions, {status_counts['on_track']} {'is' if status_counts['on_track'] == 1 else 'are'} operating within their personal baselines. {'A majority showing deviations may indicate a shared stressor or a particularly demanding training period.' if status_counts['check_in'] > n * 0.5 else 'Individual deviations are normal — the question is whether patterns cluster across the pack.'}",
        })

    # -------------------------------------------------------------------
    # 5. Mechanical signature comparison
    # -------------------------------------------------------------------
    fsa_data = []
    for a in athletes:
        fsa = a.get("aggregate", {}).get("metrics", {}).get("avg_fsa_deg")
        if fsa is not None:
            pattern = "forefoot" if fsa < 0 else "midfoot" if fsa < 8 else "rearfoot"
            fsa_data.append({"name": a["name"], "fsa": fsa, "pattern": pattern})

    if len(fsa_data) >= 2:
        patterns = set(d["pattern"] for d in fsa_data)
        if len(patterns) > 1:
            parts = [f"{d['name']} ({d['pattern']}, {d['fsa']:.1f}°)" for d in fsa_data]
            synthesis.append({
                "category": "mechanics",
                "severity": "info",
                "title": "Mixed foot strike patterns across the pack",
                "text": f"Runners show different foot strike strategies: {', '.join(parts)}. Different strike patterns aren't better or worse — they interact with individual anatomy, speed, and injury history. Tracking how each runner's pattern shifts with pace and fatigue provides more insight than comparing patterns between athletes.",
                "athletes": [d["name"] for d in fsa_data],
            })

    # -------------------------------------------------------------------
    # 6. Speed profile comparison
    # -------------------------------------------------------------------
    speed_profiles = []
    for a in athletes:
        sessions = a.get("sessions", [])
        if not sessions:
            continue
        speeds = [s["metrics"].get("avg_speed_mps") for s in sessions if s["metrics"].get("avg_speed_mps")]
        if speeds:
            speed_profiles.append({
                "name": a["name"],
                "avg": sum(speeds) / len(speeds),
                "max": max(speeds),
                "min": min(speeds),
                "range": max(speeds) - min(speeds),
            })

    if len(speed_profiles) >= 2:
        sorted_range = sorted(speed_profiles, key=lambda x: x["range"], reverse=True)
        most_varied = sorted_range[0]
        least_varied = sorted_range[-1]
        if most_varied["range"] - least_varied["range"] > 0.5:
            synthesis.append({
                "category": "training",
                "severity": "info",
                "title": f"Training variety differs across athletes",
                "text": f"{most_varied['name']} shows the widest pace range ({most_varied['min']:.1f}-{most_varied['max']:.1f} m/s, spread of {most_varied['range']:.1f} m/s), while {least_varied['name']} trains in a narrower band ({least_varied['min']:.1f}-{least_varied['max']:.1f} m/s, spread of {least_varied['range']:.1f} m/s). Greater pace variety exposes the biomechanical system to diverse demands, which may promote more robust mechanical adaptations.",
                "athletes": [d["name"] for d in speed_profiles],
            })

    synthesis.sort(key=lambda s: {"notable": 0, "info": 1}.get(s.get("severity", "info"), 2))
    return synthesis


if __name__ == "__main__":
    main()
