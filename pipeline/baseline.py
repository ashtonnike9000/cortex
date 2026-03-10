"""
Cortex Baseline Engine.

Computes per-athlete, per-speed-zone personal baselines from all historical
strides.  For each session, detects deviations from the athlete's own norms
at the same pace — the only comparison that matters.

Output shapes:
  baseline = {
    "zones": { "easy": { "gct_ms": {"mean": ..., "std": ...}, ... }, ... },
    "overall": { "gct_ms": {"mean": ..., "std": ...}, ... },
  }
  session_deviations = [
    { "session_date": ..., "zone": ..., "metric": ..., "value": ...,
      "baseline_mean": ..., "baseline_std": ..., "z_score": ...,
      "deviation": "high" | "low", "severity": "normal" | "watch" | "alert" }
  ]
  status = { "level": "on_track" | "watch" | "check_in", "headline": "...", "details": [...] }
"""
from __future__ import annotations

SPEED_ZONE_BOUNDS = [
    ("recovery", 0, 2.5), ("easy", 2.5, 3.5), ("moderate", 3.5, 4.5),
    ("tempo", 4.5, 5.5), ("fast", 5.5, 7.0), ("sprint", 7.0, 100),
]

TRACKED_METRICS = [
    ("gct_ms", "GCT", "ms"),
    ("stride_len_m", "Stride Length", "m"),
    ("cadence", "Cadence", "spm"),
    ("vgrf_avg", "vGRF", "BW"),
    ("vgrf_peak", "Peak vGRF", "BW"),
    ("fsa_deg", "FSA", "°"),
    ("loading_rate", "Loading Rate", "BW/s"),
]


def _clean(values):
    import math
    return [v for v in values if v is not None and not (isinstance(v, float) and math.isnan(v))]


def _stats(values):
    c = _clean(values)
    if not c:
        return None
    n = len(c)
    mean = sum(c) / n
    if n < 2:
        return {"mean": round(mean, 3), "std": None, "n": n}
    std = (sum((x - mean) ** 2 for x in c) / (n - 1)) ** 0.5
    return {"mean": round(mean, 3), "std": round(std, 3), "n": n}


def speed_zone_for(speed):
    if speed is None:
        return None
    for name, lo, hi in SPEED_ZONE_BOUNDS:
        if lo <= speed < hi:
            return name
    return None


def compute_baseline(all_left: list[dict], all_right: list[dict]) -> dict:
    """Compute per-zone + overall baseline from all raw strides."""
    all_strides = all_left + all_right
    if not all_strides:
        return {"zones": {}, "overall": {}}

    by_zone: dict[str, list] = {}
    for s in all_strides:
        z = speed_zone_for(s.get("speed_mps"))
        if z:
            by_zone.setdefault(z, []).append(s)

    zones = {}
    for zname, strides in by_zone.items():
        zone_bl = {}
        for key, label, unit in TRACKED_METRICS:
            vals = [s.get(key) for s in strides if s.get(key) is not None]
            st = _stats(vals)
            if st:
                zone_bl[key] = st
        if zone_bl:
            zone_bl["_count"] = len(strides)
            zones[zname] = zone_bl

    # Asymmetry baseline per zone
    for zname in list(zones.keys()):
        left_z = [s for s in by_zone.get(zname, []) if s.get("foot") == "left"]
        right_z = [s for s in by_zone.get(zname, []) if s.get("foot") == "right"]
        if left_z and right_z:
            l_gct = _clean([s.get("gct_ms") for s in left_z])
            r_gct = _clean([s.get("gct_ms") for s in right_z])
            if l_gct and r_gct:
                asym = sum(l_gct) / len(l_gct) - sum(r_gct) / len(r_gct)
                asym_vals = []
                # Per-stride asymmetry approximation is noisy; use session-level
                zones[zname]["gct_asymmetry_ms"] = {"mean": round(asym, 3), "std": None, "n": min(len(l_gct), len(r_gct))}

    overall = {}
    for key, label, unit in TRACKED_METRICS:
        vals = [s.get(key) for s in all_strides if s.get(key) is not None]
        st = _stats(vals)
        if st:
            overall[key] = st
    overall["_count"] = len(all_strides)

    return {"zones": zones, "overall": overall}


def compute_session_deviations(session: dict, baseline: dict) -> list[dict]:
    """Compare a session's per-zone metrics against the athlete's baseline."""
    deviations = []
    session_zones = session.get("speed_zones", [])

    for sz in session_zones:
        zone_name = sz.get("zone")
        bl_zone = baseline.get("zones", {}).get(zone_name)
        if not bl_zone:
            continue

        metric_map = {
            "avg_gct_ms": "gct_ms",
            "avg_fsa_deg": "fsa_deg",
            "avg_vgrf_bw": "vgrf_avg",
            "avg_vgrf_peak_bw": "vgrf_peak",
            "avg_stride_len_m": "stride_len_m",
            "avg_cadence": "cadence",
        }

        for session_key, bl_key in metric_map.items():
            val = sz.get(session_key)
            bl = bl_zone.get(bl_key)
            if val is None or bl is None:
                continue
            mean = bl["mean"]
            std = bl.get("std")
            if mean is None:
                continue

            diff = val - mean
            z_score = None
            if std and std > 0:
                z_score = round(diff / std, 2)

            if z_score is not None and abs(z_score) < 1.0:
                continue

            label = next((l for k, l, _ in TRACKED_METRICS if k == bl_key), bl_key)
            unit = next((u for k, _, u in TRACKED_METRICS if k == bl_key), "")
            severity = "normal"
            if z_score is not None:
                if abs(z_score) >= 2.0:
                    severity = "alert"
                elif abs(z_score) >= 1.5:
                    severity = "watch"

            if severity == "normal":
                continue

            deviations.append({
                "zone": zone_name,
                "metric": bl_key,
                "metric_label": label,
                "unit": unit,
                "value": round(val, 3),
                "baseline_mean": mean,
                "baseline_std": std,
                "diff": round(diff, 3),
                "z_score": z_score,
                "deviation": "high" if diff > 0 else "low",
                "severity": severity,
            })

    # Also check overall session metrics against overall baseline
    sm = session.get("metrics", {})
    bl_overall = baseline.get("overall", {})
    overall_map = {
        "avg_gct_ms": "gct_ms", "avg_vgrf_peak_bw": "vgrf_peak",
        "avg_stride_len_m": "stride_len_m", "avg_fsa_deg": "fsa_deg",
    }
    for sk, bk in overall_map.items():
        val = sm.get(sk)
        bl = bl_overall.get(bk)
        if val is None or bl is None:
            continue
        mean, std = bl["mean"], bl.get("std")
        if mean is None or std is None or std == 0:
            continue
        z = round((val - mean) / std, 2)
        if abs(z) < 1.5:
            continue
        label = next((l for k, l, _ in TRACKED_METRICS if k == bk), bk)
        unit = next((u for k, _, u in TRACKED_METRICS if k == bk), "")
        severity = "alert" if abs(z) >= 2.0 else "watch"
        deviations.append({
            "zone": "overall",
            "metric": bk, "metric_label": label, "unit": unit,
            "value": round(val, 3), "baseline_mean": mean,
            "baseline_std": std, "diff": round(val - mean, 3),
            "z_score": z, "deviation": "high" if val > mean else "low",
            "severity": severity,
        })

    # Asymmetry deviation
    asym = session.get("asymmetry", {}).get("gct_ms")
    if asym is not None:
        # Check against each zone's asymmetry baseline
        bl_asym_overall = bl_overall.get("gct_ms")
        if bl_asym_overall and bl_asym_overall.get("std") and bl_asym_overall["std"] > 0:
            pass  # We focus on zone-level for now

    deviations.sort(key=lambda d: abs(d.get("z_score") or 0), reverse=True)
    return deviations


def compute_status(sessions: list[dict], baseline: dict, all_deviations: dict) -> dict:
    """Generate overall athlete status from recent deviations and trends."""
    if not sessions:
        return {"level": "on_track", "headline": "No data yet", "details": []}

    recent = sessions[-3:] if len(sessions) >= 3 else sessions
    recent_dates = [s["date"] for s in recent]

    alerts = []
    watches = []
    for date in recent_dates:
        devs = all_deviations.get(date, [])
        for d in devs:
            if d["severity"] == "alert":
                alerts.append(d)
            elif d["severity"] == "watch":
                watches.append(d)

    details = []

    if alerts:
        level = "check_in"
        top = alerts[0]
        headline = f"{top['metric_label']} is {abs(top['diff']):.1f}{top['unit']} {'above' if top['deviation'] == 'high' else 'below'} your baseline at {top['zone']} pace"
        for a in alerts[:3]:
            details.append(
                f"{a['metric_label']} at {a['zone']} pace: {a['value']:.1f}{a['unit']} "
                f"(baseline {a['baseline_mean']:.1f}{a['unit']}, "
                f"{'↑' if a['deviation'] == 'high' else '↓'}{abs(a['diff']):.1f})"
            )
    elif watches:
        level = "watch"
        top = watches[0]
        headline = f"{top['metric_label']} drifting from baseline at {top['zone']} pace — worth monitoring"
        for w in watches[:3]:
            details.append(
                f"{w['metric_label']} at {w['zone']} pace: {w['value']:.1f}{w['unit']} "
                f"(baseline {w['baseline_mean']:.1f}{w['unit']})"
            )
    else:
        level = "on_track"
        headline = "All mechanics within your personal baseline"
        # Add positive detail
        if sessions:
            last = sessions[-1]
            m = last.get("metrics", {})
            if m.get("avg_gct_ms"):
                details.append(f"Latest GCT: {m['avg_gct_ms']:.0f}ms — consistent with your norm")

    # Trend context
    if len(sessions) >= 3:
        recent_gct = [s["metrics"].get("avg_gct_ms") for s in sessions[-5:] if s["metrics"].get("avg_gct_ms")]
        if len(recent_gct) >= 3:
            trend_dir = recent_gct[-1] - recent_gct[0]
            if abs(trend_dir) > 5:
                dir_word = "increasing" if trend_dir > 0 else "decreasing"
                details.append(f"GCT trend: {dir_word} {abs(trend_dir):.0f}ms over last {len(recent_gct)} sessions")

    return {"level": level, "headline": headline, "details": details}


def compute_trend_narratives(sessions: list[dict], baseline: dict) -> list[dict]:
    """Generate pace-normalized trend narratives comparing recent vs baseline."""
    narratives = []
    if len(sessions) < 3:
        return narratives

    recent = sessions[-3:]
    earlier = sessions[:-3] if len(sessions) > 3 else sessions[:1]

    # Pace-normalized comparisons per zone
    zones_present = set()
    for s in sessions:
        for sz in s.get("speed_zones", []):
            zones_present.add(sz["zone"])

    for zone_name in zones_present:
        bl = baseline.get("zones", {}).get(zone_name, {})
        if not bl:
            continue

        for key, label, unit in [("gct_ms", "GCT", "ms"), ("stride_len_m", "Stride Length", "m"), ("vgrf_peak", "Peak vGRF", "BW")]:
            bl_stat = bl.get(key)
            if not bl_stat or bl_stat.get("n", 0) < 10:
                continue

            recent_vals = []
            for s in recent:
                for sz in s.get("speed_zones", []):
                    if sz["zone"] == zone_name:
                        mapped = {"gct_ms": "avg_gct_ms", "stride_len_m": "avg_stride_len_m", "vgrf_peak": "avg_vgrf_peak_bw"}
                        v = sz.get(mapped.get(key))
                        if v is not None:
                            recent_vals.append(v)

            if not recent_vals:
                continue

            recent_avg = sum(recent_vals) / len(recent_vals)
            diff = recent_avg - bl_stat["mean"]
            pct = diff / bl_stat["mean"] * 100 if bl_stat["mean"] != 0 else 0

            if abs(pct) < 2:
                direction = "stable"
                color = "green"
            elif pct > 0:
                direction = "increasing" if key != "gct_ms" else "increasing"
                color = "amber" if key == "gct_ms" and pct > 3 else "green" if key == "stride_len_m" else "neutral"
            else:
                direction = "decreasing"
                color = "green" if key == "gct_ms" and pct < -3 else "neutral"

            if abs(pct) < 1.5:
                continue

            narratives.append({
                "zone": zone_name,
                "metric": key,
                "metric_label": label,
                "unit": unit,
                "recent_avg": round(recent_avg, 2),
                "baseline_mean": bl_stat["mean"],
                "diff": round(diff, 2),
                "pct_change": round(pct, 1),
                "direction": direction,
                "color": color,
                "text": _trend_narrative_text(zone_name, label, unit, recent_avg, bl_stat["mean"], diff, pct, direction, key),
            })

    narratives.sort(key=lambda n: abs(n.get("pct_change", 0)), reverse=True)
    return narratives


def _trend_narrative_text(zone, label, unit, recent, baseline, diff, pct, direction, key):
    sign = "+" if diff > 0 else ""
    zone_label = f"at {zone} pace"

    if key == "gct_ms":
        if direction == "stable":
            return f"{label} {zone_label} is holding steady at {recent:.0f}{unit} (baseline: {baseline:.0f}{unit}). Your ground contact mechanics are consistent — no drift detected."
        elif diff > 0:
            return f"{label} {zone_label} has increased to {recent:.0f}{unit} from your baseline of {baseline:.0f}{unit} ({sign}{diff:.0f}{unit}, {sign}{pct:.1f}%). At the same pace, longer ground contact suggests the neuromuscular system is working harder to maintain speed. This could reflect accumulated fatigue, insufficient recovery, or a temporary adaptation."
        else:
            return f"{label} {zone_label} has improved to {recent:.0f}{unit} from your baseline of {baseline:.0f}{unit} ({sign}{diff:.0f}{unit}, {pct:.1f}%). At the same pace, shorter ground contact means more efficient force application — a genuine mechanical improvement."

    elif key == "stride_len_m":
        if direction == "stable":
            return f"{label} {zone_label} is steady at {recent:.2f}{unit} (baseline: {baseline:.2f}{unit})."
        else:
            return f"{label} {zone_label} is {direction} to {recent:.2f}{unit} from baseline {baseline:.2f}{unit} ({sign}{diff:.3f}{unit}, {sign}{pct:.1f}%). {'Longer strides at the same pace can indicate improved power or flexibility.' if diff > 0 else 'Shorter strides may reflect fatigue or a deliberate change in running form.'}"

    else:
        if direction == "stable":
            return f"{label} {zone_label} is stable at {recent:.2f}{unit} (baseline: {baseline:.2f}{unit})."
        else:
            return f"{label} {zone_label} is {direction} to {recent:.2f}{unit} from baseline {baseline:.2f}{unit} ({sign}{diff:.2f}{unit}, {sign}{pct:.1f}%)."
