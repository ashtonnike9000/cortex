#!/usr/bin/env python3
from __future__ import annotations

"""
Cortex data pipeline.

Reads raw session CSVs from data/athletes/, normalizes them into a common
schema, and writes per-athlete JSON + a summary JSON into site/public/data/.
"""

import json
import os
import re
from datetime import datetime
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
OUTPUT_DIR = ROOT / "site" / "public" / "data"

# Canonical column names used throughout the app
CANONICAL_COLS = {
    "timestamp": "timestamp",
    "gct_ms": "gct_ms",
    "gctms": "gct_ms",
    "swing_time": "swing_time",
    "swingtime": "swing_time",
    "stride_time": "stride_time",
    "stridetime": "stride_time",
    "gait_cycle_time": "gait_cycle_time",
    "gaitcycletime": "gait_cycle_time",
    "cadence": "cadence",
    "gct_pct": "gct_pct",
    "gctpct": "gct_pct",
    "activity_type": "activity_type",
    "activitytype": "activity_type",
    "speed_mps": "speed_mps",
    "speedmps": "speed_mps",
    "vgrf_average": "vgrf_avg",
    "vgrfaverage": "vgrf_avg",
    "fsa_deg": "fsa_deg",
    "fsadeg": "fsa_deg",
    "stride_len_m": "stride_len_m",
    "stride_len_m ": "stride_len_m",  # trailing space in some files
    "stridelenm": "stride_len_m",
    "vgrf_impulse_bws": "vgrf_impulse",
    "vgrfimpulsebws": "vgrf_impulse",
    "vgrf_active_peak_bw": "vgrf_peak",
    "vgrfactivepeakbw": "vgrf_peak",
    "lr_instantaneous_bwps": "loading_rate",
    "lrinstantaneousbwps": "loading_rate",
    "vgrf_curve_bn_output_0": "vgrf_curve_0",
    "vgrf_curve_bn_output_1": "vgrf_curve_1",
    "vgrf_curve_bn_output_2": "vgrf_curve_2",
    "vgrf_curve_bn_output_3": "vgrf_curve_3",
    " vgrf_curve_bn_output_0": "vgrf_curve_0",
    " vgrf_curve_bn_output_1": "vgrf_curve_1",
    " vgrf_curve_bn_output_2": "vgrf_curve_2",
    " vgrf_curve_bn_output_3": "vgrf_curve_3",
    "vgrfcurvebnoutput0": "vgrf_curve_0",
    "vgrfcurvebnoutput1": "vgrf_curve_1",
    "vgrfcurvebnoutput2": "vgrf_curve_2",
    "vgrfcurvebnoutput3": "vgrf_curve_3",
    "latitude": "latitude",
    "longitude": "longitude",
}

GARMIN_LEFT_MAP = {
    "l__gct__ms": "gct_ms",
    "l__fsa__deg": "fsa_deg",
    "l__stride_length__m": "stride_len_m",
    "l__speed__mps": "speed_mps",
    "l__vgrf_avg__bw": "vgrf_avg",
    "l__vgrf_active_peak__bw": "vgrf_peak",
    "l__lr__bwps": "loading_rate",
    "l__cadence__steps per min": "cadence",
    "l__vgrf_curve_bn_0__": "vgrf_curve_0",
    "l__vgrf_curve_bn_1__": "vgrf_curve_1",
    "l__vgrf_curve_bn_2__": "vgrf_curve_2",
    "l__vgrf_curve_bn_3__": "vgrf_curve_3",
}

GARMIN_RIGHT_MAP = {
    "r__gct__ms": "gct_ms",
    "r__fsa__deg": "fsa_deg",
    "r__stride_length__m": "stride_len_m",
    "r__speed__mps": "speed_mps",
    "r__vgrf_avg__bw": "vgrf_avg",
    "r__vgrf_active_peak__bw": "vgrf_peak",
    "r__lr__bwps": "loading_rate",
    "r__cadence__steps per min": "cadence",
    "r__vgrf_curve_bn_0__": "vgrf_curve_0",
    "r__vgrf_curve_bn_1__": "vgrf_curve_1",
    "r__vgrf_curve_bn_2__": "vgrf_curve_2",
    "r__vgrf_curve_bn_3__": "vgrf_curve_3",
}


def normalize_col(name: str) -> str:
    """Convert any known column name variant to canonical form."""
    stripped = name.strip()
    lower = stripped.lower()
    if lower in CANONICAL_COLS:
        return CANONICAL_COLS[lower]
    return stripped


def detect_foot_from_filename(filename: str) -> str:
    """Determine L/R foot from filename conventions."""
    upper = filename.upper()
    if "_L_" in upper or upper.endswith("_L_GAIT_METRICS.CSV"):
        return "left"
    if "_R_" in upper or upper.endswith("_R_GAIT_METRICS.CSV"):
        return "right"
    for part in upper.split("_"):
        if part.endswith("X") and len(part) == 5:
            if part[:-1].isalnum():
                return "left" if "L" in filename.split("_")[-3] else "right"
    return "unknown"


def parse_session_date(folder_name: str) -> str:
    """Parse a session date folder name like '12.2.25' into '2025-12-02'."""
    parts = folder_name.split(".")
    if len(parts) == 3:
        try:
            month, day, year = parts
            year_full = f"20{year}" if len(year) == 2 else year
            return f"{year_full}-{int(month):02d}-{int(day):02d}"
        except ValueError:
            pass
    match = re.search(r"(\d{4})(\d{2})(\d{2})", folder_name)
    if match:
        return f"{match.group(1)}-{match.group(2)}-{match.group(3)}"
    return folder_name


def parse_garmin_date(filename: str) -> str:
    """Parse Garmin filename like '2025-12-17-06-48-09_parsed...' into '2025-12-17'."""
    match = re.match(r"(\d{4}-\d{2}-\d{2})", filename)
    return match.group(1) if match else filename


def process_nucleus_athlete(athlete_dir: Path) -> list[dict]:
    """Process Nucleus-format CSV files for an athlete."""
    sessions_dir = athlete_dir / "sessions"
    if not sessions_dir.exists():
        return []

    all_sessions = []

    for date_dir in sorted(sessions_dir.iterdir()):
        if not date_dir.is_dir():
            continue

        date_label = date_dir.name
        session_date = parse_session_date(date_label)
        csv_files = list(date_dir.glob("*.csv"))

        if not csv_files:
            continue

        left_strides = []
        right_strides = []

        for csv_file in csv_files:
            if csv_file.stat().st_size == 0:
                continue
            try:
                df = pd.read_csv(csv_file)
            except Exception:
                continue

            if df.empty:
                continue

            df.columns = [normalize_col(c) for c in df.columns]

            foot = detect_foot_from_filename(csv_file.name)
            records = df.to_dict("records")

            for r in records:
                r["foot"] = foot

            if foot == "left":
                left_strides.extend(records)
            elif foot == "right":
                right_strides.extend(records)
            else:
                right_strides.extend(records)

        if not left_strides and not right_strides:
            continue

        session = build_session_summary(
            session_date, date_label, left_strides, right_strides
        )
        all_sessions.append(session)

    return all_sessions


def process_garmin_athlete(athlete_dir: Path) -> list[dict]:
    """Process Garmin-format CSV files for an athlete."""
    sessions_dir = athlete_dir / "sessions"
    if not sessions_dir.exists():
        return []

    all_sessions = []

    for csv_file in sorted(sessions_dir.glob("*.csv")):
        if csv_file.stat().st_size == 0:
            continue
        try:
            df = pd.read_csv(csv_file)
        except Exception:
            continue

        if df.empty:
            continue

        session_date = parse_garmin_date(csv_file.name)

        left_df = df[[c for c in df.columns if c.startswith("l__") or c == "timestamp"]].copy()
        right_df = df[[c for c in df.columns if c.startswith("r__") or c == "timestamp"]].copy()

        left_df.columns = [GARMIN_LEFT_MAP.get(c, c) for c in left_df.columns]
        right_df.columns = [GARMIN_RIGHT_MAP.get(c, c) for c in right_df.columns]

        left_strides = []
        right_strides = []

        for _, row in left_df.iterrows():
            r = row.to_dict()
            if pd.notna(r.get("gct_ms")) and r.get("gct_ms", 0) > 0:
                r["foot"] = "left"
                left_strides.append(r)

        for _, row in right_df.iterrows():
            r = row.to_dict()
            if pd.notna(r.get("gct_ms")) and r.get("gct_ms", 0) > 0:
                r["foot"] = "right"
                right_strides.append(r)

        if not left_strides and not right_strides:
            continue

        session = build_session_summary(
            session_date, csv_file.stem, left_strides, right_strides
        )
        all_sessions.append(session)

    return all_sessions


def safe_mean(values: list) -> float | None:
    """Compute mean of non-null values, or None if empty."""
    clean = [v for v in values if v is not None and not (isinstance(v, float) and pd.isna(v))]
    return round(sum(clean) / len(clean), 3) if clean else None


def safe_max(values: list) -> float | None:
    clean = [v for v in values if v is not None and not (isinstance(v, float) and pd.isna(v))]
    return round(max(clean), 3) if clean else None


def safe_std(values: list) -> float | None:
    clean = [v for v in values if v is not None and not (isinstance(v, float) and pd.isna(v))]
    if len(clean) < 2:
        return None
    mean = sum(clean) / len(clean)
    variance = sum((x - mean) ** 2 for x in clean) / (len(clean) - 1)
    return round(variance ** 0.5, 3)


def build_session_summary(
    session_date: str,
    label: str,
    left_strides: list[dict],
    right_strides: list[dict],
) -> dict:
    """Build a session summary from left and right stride data."""
    all_strides = left_strides + right_strides

    def extract(strides, key):
        return [s.get(key) for s in strides if s.get(key) is not None]

    all_speeds = extract(all_strides, "speed_mps")
    all_gct = extract(all_strides, "gct_ms")
    all_stride_len = extract(all_strides, "stride_len_m")
    all_cadence = extract(all_strides, "cadence")
    all_fsa = extract(all_strides, "fsa_deg")
    all_vgrf = extract(all_strides, "vgrf_avg")
    all_vgrf_peak = extract(all_strides, "vgrf_peak")

    left_gct = extract(left_strides, "gct_ms")
    right_gct = extract(right_strides, "gct_ms")
    left_stride = extract(left_strides, "stride_len_m")
    right_stride = extract(right_strides, "stride_len_m")
    left_fsa = extract(left_strides, "fsa_deg")
    right_fsa = extract(right_strides, "fsa_deg")

    gct_asymmetry = None
    if left_gct and right_gct:
        gct_asymmetry = round(safe_mean(left_gct) - safe_mean(right_gct), 3)

    stride_asymmetry = None
    if left_stride and right_stride:
        stride_asymmetry = round(safe_mean(left_stride) - safe_mean(right_stride), 3)

    fsa_asymmetry = None
    if left_fsa and right_fsa:
        fsa_asymmetry = round(safe_mean(left_fsa) - safe_mean(right_fsa), 3)

    duration_sec = None
    timestamps = extract(all_strides, "timestamp")
    if len(timestamps) >= 2:
        try:
            ts = sorted([float(t) for t in timestamps if isinstance(t, (int, float)) or (isinstance(t, str) and t.replace(".", "").replace("-", "").isdigit())])
            if ts:
                span = ts[-1] - ts[0]
                if span < 1e9:
                    duration_sec = round(span, 1)
                else:
                    duration_sec = round(span / 1e6, 1)
        except (ValueError, TypeError):
            pass

    time_series = build_time_series(all_strides)
    speed_zones = build_speed_zones(all_strides)
    fatigue = build_fatigue_analysis(left_strides, right_strides)
    bilateral = build_bilateral_table(left_strides, right_strides)

    return {
        "date": session_date,
        "label": label,
        "n_strides": len(all_strides),
        "n_left": len(left_strides),
        "n_right": len(right_strides),
        "duration_sec": duration_sec,
        "metrics": {
            "avg_speed_mps": safe_mean(all_speeds),
            "max_speed_mps": safe_max(all_speeds),
            "avg_gct_ms": safe_mean(all_gct),
            "std_gct_ms": safe_std(all_gct),
            "avg_stride_len_m": safe_mean(all_stride_len),
            "avg_cadence_spm": safe_mean(all_cadence),
            "avg_fsa_deg": safe_mean(all_fsa),
            "avg_vgrf_bw": safe_mean(all_vgrf),
            "avg_vgrf_peak_bw": safe_mean(all_vgrf_peak),
            "avg_loading_rate": safe_mean(extract(all_strides, "loading_rate")),
        },
        "asymmetry": {
            "gct_ms": gct_asymmetry,
            "stride_len_m": stride_asymmetry,
            "fsa_deg": fsa_asymmetry,
        },
        "left_summary": {
            "avg_gct_ms": safe_mean(left_gct),
            "std_gct_ms": safe_std(left_gct),
            "avg_stride_len_m": safe_mean(left_stride),
            "avg_fsa_deg": safe_mean(left_fsa),
            "std_fsa_deg": safe_std(left_fsa),
            "avg_vgrf_bw": safe_mean(extract(left_strides, "vgrf_avg")),
            "avg_vgrf_peak_bw": safe_mean(extract(left_strides, "vgrf_peak")),
            "avg_loading_rate": safe_mean(extract(left_strides, "loading_rate")),
        },
        "right_summary": {
            "avg_gct_ms": safe_mean(right_gct),
            "std_gct_ms": safe_std(right_gct),
            "avg_stride_len_m": safe_mean(right_stride),
            "avg_fsa_deg": safe_mean(right_fsa),
            "std_fsa_deg": safe_std(right_fsa),
            "avg_vgrf_bw": safe_mean(extract(right_strides, "vgrf_avg")),
            "avg_vgrf_peak_bw": safe_mean(extract(right_strides, "vgrf_peak")),
            "avg_loading_rate": safe_mean(extract(right_strides, "loading_rate")),
        },
        "bilateral": bilateral,
        "speed_zones": speed_zones,
        "fatigue": fatigue,
        "time_series": time_series,
    }


SPEED_ZONE_BOUNDS = [
    ("recovery", 0, 2.5),
    ("easy", 2.5, 3.5),
    ("moderate", 3.5, 4.5),
    ("tempo", 4.5, 5.5),
    ("fast", 5.5, 7.0),
    ("sprint", 7.0, 100),
]


def build_speed_zones(strides: list[dict]) -> list[dict]:
    """Bin strides into speed zones and compute per-zone metrics."""
    zones = []
    for zone_name, lo, hi in SPEED_ZONE_BOUNDS:
        zone_strides = [
            s for s in strides
            if s.get("speed_mps") is not None and lo <= s["speed_mps"] < hi
        ]
        if not zone_strides:
            continue
        zones.append({
            "zone": zone_name,
            "count": len(zone_strides),
            "speed_range": [lo, hi],
            "avg_speed": safe_mean([s["speed_mps"] for s in zone_strides]),
            "avg_gct_ms": safe_mean([s.get("gct_ms") for s in zone_strides if s.get("gct_ms")]),
            "avg_fsa_deg": safe_mean([s.get("fsa_deg") for s in zone_strides if s.get("fsa_deg") is not None]),
            "avg_vgrf_bw": safe_mean([s.get("vgrf_avg") for s in zone_strides if s.get("vgrf_avg")]),
            "avg_vgrf_peak_bw": safe_mean([s.get("vgrf_peak") for s in zone_strides if s.get("vgrf_peak")]),
            "avg_stride_len_m": safe_mean([s.get("stride_len_m") for s in zone_strides if s.get("stride_len_m")]),
            "avg_cadence": safe_mean([s.get("cadence") for s in zone_strides if s.get("cadence")]),
            "avg_loading_rate": safe_mean([s.get("loading_rate") for s in zone_strides if s.get("loading_rate")]),
        })
    return zones


def build_fatigue_analysis(left_strides: list[dict], right_strides: list[dict]) -> dict | None:
    """Compare first quarter vs last quarter to detect fatigue drift."""
    all_strides = left_strides + right_strides
    if len(all_strides) < 20:
        return None

    sorted_all = sorted(all_strides, key=lambda s: parse_timestamp_for_sort(s.get("timestamp")))
    q_len = len(sorted_all) // 4
    if q_len < 5:
        return None

    first_q = sorted_all[:q_len]
    last_q = sorted_all[-q_len:]

    def drift(metric):
        first_vals = [s.get(metric) for s in first_q if s.get(metric) is not None]
        last_vals = [s.get(metric) for s in last_q if s.get(metric) is not None]
        first_m = safe_mean(first_vals)
        last_m = safe_mean(last_vals)
        if first_m is None or last_m is None or first_m == 0:
            return None
        return {
            "first_q": first_m,
            "last_q": last_m,
            "change": round(last_m - first_m, 3),
            "pct_change": round((last_m - first_m) / abs(first_m) * 100, 1),
        }

    def side_drift(strides, metric):
        sorted_s = sorted(strides, key=lambda s: parse_timestamp_for_sort(s.get("timestamp")))
        ql = len(sorted_s) // 4
        if ql < 3:
            return None
        first_vals = [s.get(metric) for s in sorted_s[:ql] if s.get(metric) is not None]
        last_vals = [s.get(metric) for s in sorted_s[-ql:] if s.get(metric) is not None]
        fm = safe_mean(first_vals)
        lm = safe_mean(last_vals)
        if fm is None or lm is None or fm == 0:
            return None
        return {
            "first_q": fm,
            "last_q": lm,
            "change": round(lm - fm, 3),
            "pct_change": round((lm - fm) / abs(fm) * 100, 1),
        }

    result = {
        "gct_ms": drift("gct_ms"),
        "vgrf_bw": drift("vgrf_avg"),
        "speed_mps": drift("speed_mps"),
        "cadence": drift("cadence"),
        "stride_len_m": drift("stride_len_m"),
    }

    if left_strides and right_strides:
        result["left_gct"] = side_drift(left_strides, "gct_ms")
        result["right_gct"] = side_drift(right_strides, "gct_ms")
        result["left_vgrf"] = side_drift(left_strides, "vgrf_avg")
        result["right_vgrf"] = side_drift(right_strides, "vgrf_avg")

        l_first = safe_mean([s.get("gct_ms") for s in sorted(left_strides, key=lambda s: parse_timestamp_for_sort(s.get("timestamp")))[:max(1, len(left_strides)//4)] if s.get("gct_ms")])
        r_first = safe_mean([s.get("gct_ms") for s in sorted(right_strides, key=lambda s: parse_timestamp_for_sort(s.get("timestamp")))[:max(1, len(right_strides)//4)] if s.get("gct_ms")])
        l_last = safe_mean([s.get("gct_ms") for s in sorted(left_strides, key=lambda s: parse_timestamp_for_sort(s.get("timestamp")))[-max(1, len(left_strides)//4):] if s.get("gct_ms")])
        r_last = safe_mean([s.get("gct_ms") for s in sorted(right_strides, key=lambda s: parse_timestamp_for_sort(s.get("timestamp")))[-max(1, len(right_strides)//4):] if s.get("gct_ms")])

        if all(v is not None for v in [l_first, r_first, l_last, r_last]):
            result["asymmetry_drift"] = {
                "gct_first_q": round(l_first - r_first, 1),
                "gct_last_q": round(l_last - r_last, 1),
            }

    return result


def build_bilateral_table(left_strides: list[dict], right_strides: list[dict]) -> list[dict]:
    """Build detailed L/R comparison table with std devs and assessment."""
    if not left_strides or not right_strides:
        return []

    def extract(strides, key):
        return [s.get(key) for s in strides if s.get(key) is not None]

    metrics = [
        ("Ground Contact Time", "gct_ms", "ms", 10),
        ("Foot Strike Angle", "fsa_deg", "°", 3),
        ("vGRF Average", "vgrf_avg", "BW", 0.1),
        ("vGRF Peak", "vgrf_peak", "BW", 0.15),
        ("Stride Length", "stride_len_m", "m", 0.05),
        ("Loading Rate", "loading_rate", "BW/s", 5),
    ]

    rows = []
    for label, key, unit, warn_threshold in metrics:
        lv = extract(left_strides, key)
        rv = extract(right_strides, key)
        if not lv or not rv:
            continue
        lm = safe_mean(lv)
        rm = safe_mean(rv)
        ls = safe_std(lv)
        rs = safe_std(rv)
        diff = round(lm - rm, 3) if lm and rm else None
        assessment = "—"
        if diff is not None:
            ad = abs(diff)
            if ad < warn_threshold * 0.5:
                assessment = "Excellent"
            elif ad < warn_threshold:
                assessment = "Normal"
            else:
                assessment = "Monitor"

        rows.append({
            "label": label,
            "unit": unit,
            "left_mean": lm,
            "left_std": ls,
            "right_mean": rm,
            "right_std": rs,
            "diff": diff,
            "assessment": assessment,
        })
    return rows


def parse_timestamp_for_sort(ts) -> float:
    """Convert various timestamp formats to a sortable float."""
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
        dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
        return dt.timestamp()
    except (ValueError, TypeError):
        return 0.0


def build_time_series(strides: list[dict]) -> dict:
    """Build downsampled time series for charting (max ~200 points)."""
    if not strides:
        return {"speed": [], "gct": [], "cadence": [], "vgrf": []}

    sorted_strides = sorted(
        strides,
        key=lambda s: parse_timestamp_for_sort(s.get("timestamp")),
    )

    step = max(1, len(sorted_strides) // 200)
    sampled = sorted_strides[::step]

    return {
        "speed": [round(s["speed_mps"], 3) for s in sampled if s.get("speed_mps")],
        "gct": [round(s["gct_ms"], 1) for s in sampled if s.get("gct_ms")],
        "cadence": [round(s["cadence"], 1) for s in sampled if s.get("cadence")],
        "vgrf": [round(s["vgrf_avg"], 3) for s in sampled if s.get("vgrf_avg")],
    }


def main():
    athletes_config = json.loads((DATA_DIR / "athletes.json").read_text())
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    summary_athletes = []

    for athlete in athletes_config["athletes"]:
        name = athlete["name"]
        folder = athlete["folder"]
        athlete_id = athlete["id"]
        data_source = athlete["data_source"]

        athlete_dir = DATA_DIR / "athletes" / folder
        print(f"Processing {name} ({data_source})...")

        if data_source == "nucleus":
            sessions = process_nucleus_athlete(athlete_dir)
        elif data_source == "garmin":
            sessions = process_garmin_athlete(athlete_dir)
        else:
            print(f"  Unknown data source: {data_source}")
            continue

        sessions.sort(key=lambda s: s["date"])
        print(f"  Found {len(sessions)} sessions, {sum(s['n_strides'] for s in sessions)} total strides")

        athlete_output = {
            "id": athlete_id,
            "name": name,
            "sport": athlete.get("sport", "running"),
            "data_source": data_source,
            "sessions": sessions,
            "session_count": len(sessions),
            "total_strides": sum(s["n_strides"] for s in sessions),
            "date_range": {
                "first": sessions[0]["date"] if sessions else None,
                "last": sessions[-1]["date"] if sessions else None,
            },
        }

        output_file = OUTPUT_DIR / f"{athlete_id}.json"
        output_file.write_text(json.dumps(athlete_output, indent=2))
        print(f"  Wrote {output_file.name}")

        summary_athletes.append({
            "id": athlete_id,
            "name": name,
            "sport": athlete.get("sport", "running"),
            "session_count": len(sessions),
            "total_strides": sum(s["n_strides"] for s in sessions),
            "date_range": athlete_output["date_range"],
            "latest_metrics": sessions[-1]["metrics"] if sessions else None,
            "latest_asymmetry": sessions[-1]["asymmetry"] if sessions else None,
        })

    summary = {
        "generated_at": datetime.now().isoformat(),
        "athletes": summary_athletes,
    }
    summary_file = OUTPUT_DIR / "summary.json"
    summary_file.write_text(json.dumps(summary, indent=2))
    print(f"\nWrote {summary_file.name} with {len(summary_athletes)} athletes")


if __name__ == "__main__":
    main()
