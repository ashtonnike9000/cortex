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
