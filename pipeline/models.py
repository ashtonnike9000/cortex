"""
Predictive models for running performance.

Race Time Prediction
====================
Uses a multi-factor approach combining observed pace data with biomechanical
fatigue modeling:

1. **Best sustained pace** — Fastest average speed across mile splits that
   were sustained for at least 1 mile. This is the athlete's demonstrated
   "ceiling" speed.

2. **Riegel fatigue exponent** — Classic model: T2 = T1 × (D2/D1)^b.
   Standard b = 1.06 for recreational runners. We adjust b based on the
   athlete's observed fatigue rate (if they fatigue faster, b increases).

3. **Biomechanical efficiency score** — Derived from GCT, cadence, and
   stride length relationships. More efficient runners sustain pace better
   at longer distances.

4. **Fatigue resistance** — Measured from per-mile metric degradation.
   Athletes whose GCT increases less and stride shortens less over distance
   get better long-distance predictions.

Fatigue Analysis
================
Per-mile degradation curves for key metrics:
- GCT drift rate (ms/mile)
- Cadence decay rate (spm/mile)
- Stride length shortening (m/mile)
- vGRF peak drift (BW/mile)
- Fatigue onset point (mile at which degradation exceeds 2% from initial)
- Fatigue resistance score (0-100, higher = more fatigue-resistant)
"""

from __future__ import annotations
import math

MILE_M = 1609.344

RACE_DISTANCES = {
    "5K":   {"distance_m": 5000,   "distance_mi": 3.107},
    "10K":  {"distance_m": 10000,  "distance_mi": 6.214},
    "Half": {"distance_m": 21097.5, "distance_mi": 13.109},
}


def safe_mean(vals):
    clean = [v for v in vals if v is not None]
    return sum(clean) / len(clean) if clean else None


def _linear_slope(xs, ys):
    """Simple OLS slope for small arrays."""
    n = len(xs)
    if n < 2:
        return 0
    mx = sum(xs) / n
    my = sum(ys) / n
    num = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    den = sum((x - mx) ** 2 for x in xs)
    return num / den if den != 0 else 0


# ---------------------------------------------------------------------------
# Enhanced fatigue analysis
# ---------------------------------------------------------------------------

def compute_fatigue_profile(sessions: list[dict]) -> dict:
    """Build per-mile degradation curves from all sessions with mile splits."""
    sessions_with_splits = [s for s in sessions if s.get("mile_splits") and len(s["mile_splits"]) >= 2]
    if not sessions_with_splits:
        return {"has_data": False}

    metrics = ["avg_gct_ms", "avg_cadence_spm", "avg_stride_len_m",
               "avg_vgrf_peak_bw", "avg_speed_mps", "avg_loading_rate"]

    all_curves = {}
    for mk in metrics:
        per_mile_vals = {}
        for sess in sessions_with_splits:
            for split in sess["mile_splits"]:
                if split["distance_m"] < 1400:
                    continue
                mi = split["mile"]
                val = split["metrics"].get(mk)
                if val is not None:
                    per_mile_vals.setdefault(mi, []).append(val)

        if not per_mile_vals:
            continue

        mile_avgs = {mi: safe_mean(vals) for mi, vals in sorted(per_mile_vals.items())}
        miles = sorted(mile_avgs.keys())
        values = [mile_avgs[m] for m in miles]

        if len(miles) < 2:
            continue

        slope = _linear_slope(miles, values)
        initial = values[0] if values else 0
        pct_drift_per_mile = round((slope / initial * 100), 3) if initial else 0

        onset_mile = None
        threshold = abs(initial * 0.02)
        for mi, val in zip(miles, values):
            if abs(val - initial) > threshold:
                onset_mile = mi
                break

        all_curves[mk] = {
            "initial": round(initial, 3),
            "slope_per_mile": round(slope, 4),
            "pct_drift_per_mile": pct_drift_per_mile,
            "onset_mile": onset_mile,
            "mile_values": {str(m): round(mile_avgs[m], 3) for m in miles},
        }

    gct_drift = abs(all_curves.get("avg_gct_ms", {}).get("pct_drift_per_mile", 0))
    stride_drift = abs(all_curves.get("avg_stride_len_m", {}).get("pct_drift_per_mile", 0))
    cadence_drift = abs(all_curves.get("avg_cadence_spm", {}).get("pct_drift_per_mile", 0))
    speed_drift = abs(all_curves.get("avg_speed_mps", {}).get("pct_drift_per_mile", 0))

    composite_drift = (gct_drift * 0.3 + stride_drift * 0.25 +
                       cadence_drift * 0.2 + speed_drift * 0.25)
    resistance_score = max(0, min(100, round(100 - composite_drift * 15)))

    max_miles = max(
        (len(s.get("mile_splits", [])) for s in sessions_with_splits),
        default=0
    )

    return {
        "has_data": True,
        "n_sessions_analyzed": len(sessions_with_splits),
        "max_miles_observed": max_miles,
        "curves": all_curves,
        "resistance_score": resistance_score,
        "composite_drift_pct_per_mile": round(composite_drift, 3),
        "summary": _fatigue_summary(resistance_score, all_curves),
    }


def _fatigue_summary(score, curves):
    parts = []
    if score >= 75:
        parts.append(f"Strong fatigue resistance (score: {score}/100). Mechanics hold up well over distance.")
    elif score >= 50:
        parts.append(f"Moderate fatigue resistance (score: {score}/100). Some degradation over distance.")
    else:
        parts.append(f"Notable fatigue pattern (score: {score}/100). Mechanics degrade meaningfully over distance.")

    gct = curves.get("avg_gct_ms", {})
    if gct.get("slope_per_mile") and gct["slope_per_mile"] > 0:
        parts.append(f"GCT increases ~{abs(gct['slope_per_mile']):.1f} ms/mile — "
                     f"{'minimal' if abs(gct['pct_drift_per_mile']) < 1 else 'noticeable'} drift.")
    stride = curves.get("avg_stride_len_m", {})
    if stride.get("slope_per_mile") and stride["slope_per_mile"] < 0:
        parts.append(f"Stride shortens ~{abs(stride['slope_per_mile']*100):.1f} cm/mile.")

    onset = gct.get("onset_mile")
    if onset:
        parts.append(f"Fatigue onset around mile {onset}.")

    return " ".join(parts)


# ---------------------------------------------------------------------------
# Race time prediction
# ---------------------------------------------------------------------------

def predict_race_times(sessions: list[dict], fatigue_profile: dict) -> dict:
    """Predict 5K, 10K, and half marathon times from observed data."""
    sessions_with_splits = [s for s in sessions if s.get("mile_splits") and len(s["mile_splits"]) >= 1]
    if not sessions_with_splits:
        return {"has_predictions": False, "reason": "No sessions with mile split data"}

    # Step 1: Find best sustained mile pace
    all_mile_speeds = []
    for sess in sessions_with_splits:
        for split in sess["mile_splits"]:
            if split["distance_m"] >= 1400:
                spd = split["metrics"].get("avg_speed_mps")
                if spd and spd > 1.5:
                    all_mile_speeds.append(spd)

    if not all_mile_speeds:
        return {"has_predictions": False, "reason": "No valid mile split speeds found"}

    best_mile_speed = max(all_mile_speeds)
    top_10_pct = sorted(all_mile_speeds, reverse=True)[:max(1, len(all_mile_speeds) // 10)]
    sustained_speed = safe_mean(top_10_pct)

    # Step 2: Compute Riegel exponent adjustment from fatigue data
    base_exponent = 1.06
    if fatigue_profile.get("has_data"):
        resistance = fatigue_profile.get("resistance_score", 50)
        exponent_adj = (50 - resistance) * 0.001
        adjusted_exponent = base_exponent + exponent_adj
    else:
        adjusted_exponent = base_exponent

    adjusted_exponent = max(1.03, min(1.15, adjusted_exponent))

    # Step 3: Biomechanical efficiency score
    all_sessions_metrics = [s.get("metrics", {}) for s in sessions if s.get("metrics")]
    avg_gct = safe_mean([m.get("avg_gct_ms") for m in all_sessions_metrics])
    avg_cadence = safe_mean([m.get("avg_cadence_spm") for m in all_sessions_metrics])
    avg_stride = safe_mean([m.get("avg_stride_len_m") for m in all_sessions_metrics])
    avg_speed = safe_mean([m.get("avg_speed_mps") for m in all_sessions_metrics])

    efficiency_score = _compute_efficiency(avg_gct, avg_cadence, avg_stride, avg_speed)

    # Step 4: Predict for each distance
    # Reference: 1 mile at sustained_speed
    ref_distance_m = MILE_M
    ref_time_s = ref_distance_m / sustained_speed if sustained_speed > 0 else 600

    predictions = {}
    for name, info in RACE_DISTANCES.items():
        target_m = info["distance_m"]
        target_mi = info["distance_mi"]

        raw_time = ref_time_s * (target_m / ref_distance_m) ** adjusted_exponent
        eff_factor = 1 + (50 - efficiency_score) * 0.002
        predicted_time = raw_time * eff_factor

        predicted_pace_per_mile = predicted_time / target_mi
        predicted_speed = target_m / predicted_time

        predictions[name] = {
            "distance_m": target_m,
            "distance_mi": round(target_mi, 3),
            "predicted_time_s": round(predicted_time, 1),
            "predicted_time_fmt": _fmt_time(predicted_time),
            "predicted_pace_per_mile_s": round(predicted_pace_per_mile, 1),
            "predicted_pace_fmt": _fmt_time(predicted_pace_per_mile),
            "predicted_speed_mps": round(predicted_speed, 3),
        }

    # Build model explanation
    model_inputs = {
        "best_mile_speed_mps": round(best_mile_speed, 3),
        "sustained_top_speed_mps": round(sustained_speed, 3),
        "sustained_pace_fmt": _fmt_time(MILE_M / sustained_speed) if sustained_speed > 0 else "—",
        "riegel_base_exponent": base_exponent,
        "riegel_adjusted_exponent": round(adjusted_exponent, 4),
        "fatigue_resistance_score": fatigue_profile.get("resistance_score"),
        "efficiency_score": round(efficiency_score, 1),
        "avg_gct_ms": round(avg_gct, 1) if avg_gct else None,
        "avg_cadence_spm": round(avg_cadence, 1) if avg_cadence else None,
        "avg_stride_len_m": round(avg_stride, 3) if avg_stride else None,
        "n_mile_splits_analyzed": len(all_mile_speeds),
        "n_sessions_analyzed": len(sessions_with_splits),
    }

    return {
        "has_predictions": True,
        "predictions": predictions,
        "model_inputs": model_inputs,
        "methodology": _methodology_text(model_inputs, predictions),
    }


def _compute_efficiency(gct, cadence, stride, speed):
    """0-100 efficiency score from biomechanics. Higher = more efficient."""
    score = 50.0
    if gct:
        if gct < 250:
            score += 15
        elif gct < 300:
            score += 8
        elif gct > 350:
            score -= 8
    if cadence:
        if cadence > 170:
            score += 10
        elif cadence > 160:
            score += 5
        elif cadence < 150:
            score -= 8
    if stride and speed:
        expected_stride = speed * 0.35 + 0.5
        ratio = stride / expected_stride if expected_stride > 0 else 1
        if 0.95 <= ratio <= 1.1:
            score += 8
        elif ratio > 1.15:
            score -= 5
    return max(0, min(100, score))


def _fmt_time(seconds):
    if seconds is None or seconds <= 0:
        return "—"
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    if h > 0:
        return f"{h}:{m:02d}:{s:02d}"
    return f"{m}:{s:02d}"


def _methodology_text(inputs, predictions):
    lines = []
    lines.append("## How We Predict Race Times")
    lines.append("")
    lines.append("### Step 1: Determine Demonstrated Pace")
    lines.append(f"From {inputs['n_mile_splits_analyzed']} mile splits across "
                 f"{inputs['n_sessions_analyzed']} sessions, we identify the athlete's "
                 f"best sustained pace.")
    lines.append(f"- **Best mile speed:** {inputs['best_mile_speed_mps']:.2f} m/s")
    lines.append(f"- **Top 10% sustained speed:** {inputs['sustained_top_speed_mps']:.2f} m/s "
                 f"({inputs['sustained_pace_fmt']}/mi)")
    lines.append("")
    lines.append("### Step 2: Apply Distance-Fatigue Scaling (Riegel Model)")
    lines.append("The Riegel formula predicts race time at a new distance from a known time:")
    lines.append("")
    lines.append("$$T_2 = T_1 \\times \\left(\\frac{D_2}{D_1}\\right)^b$$")
    lines.append("")
    lines.append(f"Standard exponent *b* = {inputs['riegel_base_exponent']}. We adjust based on "
                 f"the athlete's observed fatigue rate:")
    if inputs.get("fatigue_resistance_score") is not None:
        lines.append(f"- **Fatigue resistance:** {inputs['fatigue_resistance_score']}/100")
    lines.append(f"- **Adjusted exponent:** {inputs['riegel_adjusted_exponent']:.4f}")
    if inputs["riegel_adjusted_exponent"] > inputs["riegel_base_exponent"]:
        lines.append("  (Higher = fatigues faster than average → slower at longer distances)")
    else:
        lines.append("  (Lower = fatigues slower than average → better at longer distances)")
    lines.append("")
    lines.append("### Step 3: Biomechanical Efficiency Adjustment")
    lines.append(f"Efficiency score: **{inputs['efficiency_score']:.0f}/100**, derived from:")
    if inputs.get("avg_gct_ms"):
        lines.append(f"- Ground contact time: {inputs['avg_gct_ms']:.0f} ms")
    if inputs.get("avg_cadence_spm"):
        lines.append(f"- Cadence: {inputs['avg_cadence_spm']:.0f} spm")
    if inputs.get("avg_stride_len_m"):
        lines.append(f"- Stride length: {inputs['avg_stride_len_m']:.3f} m")
    lines.append("")
    lines.append("Runners with higher efficiency lose less speed at longer distances.")
    lines.append("")
    lines.append("### Results")
    for name, pred in predictions.items():
        lines.append(f"- **{name}** ({pred['distance_mi']:.1f} mi): "
                     f"**{pred['predicted_time_fmt']}** at {pred['predicted_pace_fmt']}/mi")
    lines.append("")
    lines.append("### Important Caveats")
    lines.append("- These predictions are estimates based on sensor data from training runs, not races.")
    lines.append("- Race day effort, terrain, temperature, and pacing strategy are not modeled.")
    lines.append("- Predictions improve with more sessions and longer runs.")
    lines.append("- The model assumes the athlete can sustain race-day effort, "
                 "which is typically 5-10% harder than training.")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Confidence assessment
# ---------------------------------------------------------------------------

def assess_confidence(model_inputs: dict, sessions: list[dict]) -> dict:
    """Rate prediction confidence based on data quality and quantity."""
    reasons = []
    score = 100

    n_splits = model_inputs.get("n_mile_splits_analyzed", 0)
    n_sessions = model_inputs.get("n_sessions_analyzed", 0)

    if n_sessions < 3:
        score -= 30
        reasons.append(f"Only {n_sessions} session{'s' if n_sessions != 1 else ''} with mile splits — need 3+ for reliability")
    elif n_sessions < 5:
        score -= 15
        reasons.append(f"{n_sessions} sessions is a modest sample — 5+ sessions would strengthen predictions")

    if n_splits < 5:
        score -= 20
        reasons.append(f"Only {n_splits} total mile splits analyzed — limited data for pace modeling")

    max_dist = max((s.get("distance_mi", 0) for s in sessions), default=0)
    if max_dist < 3.0:
        score -= 25
        reasons.append(f"Longest run is {max_dist:.1f} mi — half marathon predictions are highly speculative without 5+ mi runs")
    elif max_dist < 5.0:
        score -= 10
        reasons.append(f"Longest run is {max_dist:.1f} mi — predictions beyond 10K have extra uncertainty")

    fr = model_inputs.get("fatigue_resistance_score")
    if fr is None:
        score -= 15
        reasons.append("No fatigue data available — using population-average fatigue model")

    # Check for high speed variance (inconsistent effort)
    speeds = []
    for s in sessions:
        m = s.get("metrics", {})
        spd = m.get("avg_speed_mps")
        if spd:
            speeds.append(spd)
    if len(speeds) >= 2:
        avg_spd = sum(speeds) / len(speeds)
        variance = sum((x - avg_spd) ** 2 for x in speeds) / len(speeds)
        cv = (variance ** 0.5) / avg_spd if avg_spd > 0 else 0
        if cv > 0.20:
            score -= 10
            reasons.append(f"High speed variance across sessions (CV={cv:.0%}) — mixed workout types may skew predictions")

    score = max(0, min(100, score))
    if score >= 70:
        level = "good"
        label = "Good"
    elif score >= 40:
        level = "moderate"
        label = "Moderate"
    else:
        level = "low"
        label = "Low"

    return {
        "score": score,
        "level": level,
        "label": label,
        "reasons": reasons,
    }


# ---------------------------------------------------------------------------
# Watch list — actionable insights + data quality alerts
# ---------------------------------------------------------------------------

def build_watch_list(sessions: list[dict], fatigue_profile: dict,
                     baseline: dict | None = None, trends: list | None = None) -> list[dict]:
    """Generate watch list items: things worth paying attention to."""
    items = []

    # --- Data quality flags ---
    total_strides = sum(s.get("n_strides", 0) for s in sessions)
    total_running = sum(s.get("n_running_strides", 0) for s in sessions)
    total_filtered = total_strides - total_running
    if total_strides > 0 and total_filtered / total_strides > 0.3:
        items.append({
            "type": "data_quality",
            "severity": "warn",
            "title": "High non-running data ratio",
            "detail": f"{total_filtered}/{total_strides} strides ({total_filtered/total_strides:.0%}) were filtered as non-running. "
                      "This athlete's sessions may include significant walking, standing, or non-run activity.",
            "action": "Review session data for mixed-activity recordings. Consider separate tracking for run vs. non-run.",
        })

    for s in sessions:
        n = s.get("n_strides", 0)
        nr = s.get("n_running_strides", 0)
        if n > 0 and nr < 10:
            items.append({
                "type": "data_quality",
                "severity": "alert",
                "title": f"Minimal running data on {s.get('date', '?')}",
                "detail": f"Only {nr} of {n} strides classified as running. This session may not be a run.",
                "action": "Consider excluding this session from run analysis.",
            })

    # --- Cadence anomalies ---
    cadences = []
    for s in sessions:
        c = s.get("metrics", {}).get("avg_cadence_spm")
        if c:
            cadences.append((s.get("date", "?"), c))
    for date, cad in cadences:
        if cad < 140:
            items.append({
                "type": "biomechanics",
                "severity": "watch",
                "title": f"Low cadence on {date}",
                "detail": f"Average cadence of {cad:.0f} spm is below typical running range (150-190 spm).",
                "action": "May indicate walking segments mixed in, or an unusually slow/long-stride style.",
            })
        elif cad > 210:
            items.append({
                "type": "biomechanics",
                "severity": "watch",
                "title": f"Very high cadence on {date}",
                "detail": f"Average cadence of {cad:.0f} spm is above typical range. Could be a sprint session or data anomaly.",
                "action": "Verify this is a sprint session. If a regular run, check sensor calibration.",
            })

    # --- GCT asymmetry ---
    for s in sessions:
        asym = s.get("metrics", {}).get("gct_asymmetry_pct")
        if asym is not None and abs(asym) > 8:
            side = "left" if asym > 0 else "right"
            items.append({
                "type": "biomechanics",
                "severity": "watch",
                "title": f"GCT asymmetry on {s.get('date', '?')}",
                "detail": f"{abs(asym):.1f}% longer ground contact on {side} side.",
                "action": "Persistent asymmetry >8% may warrant gait analysis or injury screening.",
            })

    # --- Fatigue onset ---
    if fatigue_profile.get("has_data"):
        resistance = fatigue_profile.get("resistance_score", 50)
        if resistance < 40:
            items.append({
                "type": "performance",
                "severity": "watch",
                "title": "High fatigue rate",
                "detail": f"Fatigue resistance score of {resistance}/100 indicates significant mechanical degradation over distance.",
                "action": "Focus on easy-pace long runs to build endurance. Consider strength work for running economy.",
            })

        gct_onset = fatigue_profile.get("curves", {}).get("avg_gct_ms", {}).get("onset_mile")
        if gct_onset and gct_onset <= 2:
            items.append({
                "type": "performance",
                "severity": "watch",
                "title": f"Early fatigue onset (mile {gct_onset})",
                "detail": "GCT begins degrading within the first 2 miles, suggesting low aerobic base.",
                "action": "Gradual mileage increase and easy-pace runs can push fatigue onset later.",
            })

    # --- Baseline deviations ---
    if baseline and baseline.get("metrics"):
        bm = baseline["metrics"]
        for s in sessions[-3:]:
            sm = s.get("metrics", {})
            b_gct = bm.get("avg_gct_ms")
            s_gct = sm.get("avg_gct_ms")
            if b_gct and s_gct and s_gct > b_gct * 1.10:
                items.append({
                    "type": "trend",
                    "severity": "watch",
                    "title": f"Elevated GCT on {s.get('date', '?')}",
                    "detail": f"GCT of {s_gct:.0f} ms is {((s_gct/b_gct)-1)*100:.0f}% above baseline ({b_gct:.0f} ms).",
                    "action": "Could indicate fatigue accumulation, insufficient recovery, or early overtraining.",
                })

    # --- Trends worth noting ---
    if trends:
        for t in trends:
            narrative = t.get("narrative", "")
            if "declining" in narrative.lower() or "dropping" in narrative.lower():
                items.append({
                    "type": "trend",
                    "severity": "info",
                    "title": t.get("metric", "Trend"),
                    "detail": narrative,
                    "action": "Monitor over next 2-3 sessions to confirm trend.",
                })

    # Deduplicate by title
    seen = set()
    unique = []
    for item in items:
        if item["title"] not in seen:
            seen.add(item["title"])
            unique.append(item)

    # Sort: alert > warn > watch > info
    severity_order = {"alert": 0, "warn": 1, "watch": 2, "info": 3}
    unique.sort(key=lambda x: severity_order.get(x["severity"], 9))

    return unique
