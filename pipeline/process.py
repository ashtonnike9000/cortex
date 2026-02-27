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


# ---------------------------------------------------------------------------
# CSV readers — return (sessions, all_left, all_right)
# ---------------------------------------------------------------------------

def process_nucleus(athlete_dir: Path):
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
            (left if foot == "left" else right).extend(recs)
        if not left and not right:
            continue
        sessions.append(build_session(parse_session_date(date_dir.name), date_dir.name, left, right))
        all_left.extend(left)
        all_right.extend(right)
    return sessions, all_left, all_right


def process_garmin(athlete_dir: Path):
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
                left.append(r)
        for _, row in right_df.iterrows():
            r = row.to_dict()
            if pd.notna(r.get("gct_ms")) and r.get("gct_ms", 0) > 0:
                r["foot"] = "right"
                right.append(r)
        if not left and not right:
            continue
        sessions.append(build_session(parse_garmin_date(f.name), f.stem, left, right))
        all_left.extend(left)
        all_right.extend(right)
    return sessions, all_left, all_right


# ---------------------------------------------------------------------------
# Session builder
# ---------------------------------------------------------------------------

def build_session(date: str, label: str, left: list, right: list) -> dict:
    all_s = left + right
    speed_zones = build_speed_zones(all_s)
    fatigue = build_fatigue(left, right)
    bilateral = build_bilateral(left, right)
    ts = build_time_series(all_s)

    l_gct, r_gct = extract(left, "gct_ms"), extract(right, "gct_ms")
    l_sl, r_sl = extract(left, "stride_len_m"), extract(right, "stride_len_m")
    l_fsa, r_fsa = extract(left, "fsa_deg"), extract(right, "fsa_deg")

    return {
        "date": date, "label": label,
        "n_strides": len(all_s), "n_left": len(left), "n_right": len(right),
        "metrics": {
            "avg_speed_mps": safe_mean(extract(all_s, "speed_mps")),
            "max_speed_mps": safe_max(extract(all_s, "speed_mps")),
            "avg_gct_ms": safe_mean(extract(all_s, "gct_ms")),
            "std_gct_ms": safe_std(extract(all_s, "gct_ms")),
            "avg_stride_len_m": safe_mean(extract(all_s, "stride_len_m")),
            "avg_cadence_spm": safe_mean(extract(all_s, "cadence")),
            "avg_fsa_deg": safe_mean(extract(all_s, "fsa_deg")),
            "avg_vgrf_bw": safe_mean(extract(all_s, "vgrf_avg")),
            "avg_vgrf_peak_bw": safe_mean(extract(all_s, "vgrf_peak")),
            "avg_loading_rate": safe_mean(extract(all_s, "loading_rate")),
        },
        "asymmetry": {
            "gct_ms": round(safe_mean(l_gct) - safe_mean(r_gct), 3) if l_gct and r_gct else None,
            "stride_len_m": round(safe_mean(l_sl) - safe_mean(r_sl), 3) if l_sl and r_sl else None,
            "fsa_deg": round(safe_mean(l_fsa) - safe_mean(r_fsa), 3) if l_fsa and r_fsa else None,
        },
        "left_summary": _side_summary(left),
        "right_summary": _side_summary(right),
        "bilateral": bilateral, "speed_zones": speed_zones,
        "fatigue": fatigue, "time_series": ts,
    }


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


def build_time_series(strides):
    if not strides:
        return {"speed": [], "gct": [], "cadence": [], "vgrf": []}
    ss = sorted(strides, key=lambda s: ts_sort_key(s.get("timestamp")))
    step = max(1, len(ss) // 200)
    sm = ss[::step]
    return {
        "speed": [round(s["speed_mps"], 3) for s in sm if s.get("speed_mps")],
        "gct": [round(s["gct_ms"], 1) for s in sm if s.get("gct_ms")],
        "cadence": [round(s["cadence"], 1) for s in sm if s.get("cadence")],
        "vgrf": [round(s["vgrf_avg"], 3) for s in sm if s.get("vgrf_avg")],
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    from insights import generate_insights

    athletes_cfg = json.loads((DATA_DIR / "athletes.json").read_text())
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    all_athlete_data = []

    for ath in athletes_cfg["athletes"]:
        name, folder, aid = ath["name"], ath["folder"], ath["id"]
        src = ath["data_source"]
        adir = DATA_DIR / "athletes" / folder
        print(f"Processing {name}...")

        if src == "nucleus":
            sessions, al, ar = process_nucleus(adir)
        elif src == "garmin":
            sessions, al, ar = process_garmin(adir)
        else:
            continue

        sessions.sort(key=lambda s: s["date"])
        total = sum(s["n_strides"] for s in sessions)
        print(f"  {len(sessions)} sessions, {total} strides")

        aggregate = build_session("all", "All Runs", al, ar)
        insights = generate_insights(sessions, aggregate)

        athlete_out = {
            "id": aid, "name": name,
            "sport": ath.get("sport", "running"),
            "sessions": sessions,
            "aggregate": aggregate,
            "insights": insights,
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

    # Cross-athlete summary
    summary = build_cross_athlete_summary(all_athlete_data)
    (OUTPUT_DIR / "summary.json").write_text(json.dumps(summary, indent=2))
    print(f"\nWrote summary.json with {len(all_athlete_data)} athletes")


def build_cross_athlete_summary(athletes):
    """Build fleet-level summary with distributions for the dashboard."""
    rows = []
    all_gct, all_vgrf, all_asym, all_speed = [], [], [], []

    for a in athletes:
        agg = a.get("aggregate", {})
        m = agg.get("metrics", {})
        asym = agg.get("asymmetry", {})
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
            "headline_insight": a.get("insights", [{}])[0].get("title") if a.get("insights") else None,
        }
        rows.append(row)
        if m.get("avg_gct_ms"): all_gct.append(m["avg_gct_ms"])
        if m.get("avg_vgrf_peak_bw"): all_vgrf.append(m["avg_vgrf_peak_bw"])
        if asym.get("gct_ms") is not None: all_asym.append(abs(asym["gct_ms"]))
        if m.get("avg_speed_mps"): all_speed.append(m["avg_speed_mps"])

    return {
        "generated_at": datetime.now().isoformat(),
        "athletes": rows,
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
    }


if __name__ == "__main__":
    main()
