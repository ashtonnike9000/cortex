"""
Cortex Insight Engine — rule-based, LLM-swappable.

To swap in LLM: replace generate_insights() body with an API call
that sends the same data and returns list[dict] with same schema:
  { category, severity, title, text }
"""
from __future__ import annotations


def generate_insights(sessions: list[dict], aggregate: dict) -> list[dict]:
    """Generate contextual insights from an athlete's data."""
    insights = []
    insights.extend(_asymmetry_insights(sessions, aggregate))
    insights.extend(_fatigue_insights(sessions, aggregate))
    insights.extend(_speed_mechanics_insights(aggregate))
    insights.extend(_trend_insights(sessions))
    insights.extend(_bilateral_insights(aggregate))
    insights.extend(_foot_strike_insights(aggregate))
    insights.sort(key=lambda i: {"action": 0, "notable": 1, "info": 2}.get(i["severity"], 3))
    return insights


def _asymmetry_insights(sessions, agg):
    out = []
    gct_a = agg.get("asymmetry", {}).get("gct_ms")
    if gct_a is not None:
        abs_a = abs(gct_a)
        side = "left" if gct_a > 0 else "right"
        if abs_a < 5:
            out.append({"category": "asymmetry", "severity": "info",
                         "title": f"Excellent bilateral symmetry",
                         "text": f"GCT asymmetry of {abs_a:.1f}ms across all runs is well below the 8-10ms threshold. Training load distributes evenly across both legs."})
        elif abs_a < 10:
            out.append({"category": "asymmetry", "severity": "info",
                         "title": f"Good bilateral balance",
                         "text": f"GCT asymmetry of {abs_a:.1f}ms ({side} foot longer contact) is within normal range. No intervention needed."})
        elif abs_a < 15:
            out.append({"category": "asymmetry", "severity": "notable",
                         "title": f"Elevated GCT asymmetry — {abs_a:.1f}ms",
                         "text": f"The {side} foot consistently spends {abs_a:.1f}ms longer on the ground. This may indicate a compensation pattern worth monitoring across sessions."})
        else:
            out.append({"category": "asymmetry", "severity": "action",
                         "title": f"Significant asymmetry detected — {abs_a:.1f}ms",
                         "text": f"GCT asymmetry of {abs_a:.1f}ms ({side} side) exceeds the 15ms threshold. This level of bilateral difference may increase overuse injury risk on the compensating leg. Consider targeted strength or mobility work."})

    # Asymmetry consistency across sessions
    asym_vals = [s.get("asymmetry", {}).get("gct_ms") for s in sessions if s.get("asymmetry", {}).get("gct_ms") is not None]
    if len(asym_vals) >= 3:
        mean_a = sum(abs(v) for v in asym_vals) / len(asym_vals)
        spread = max(abs(v) for v in asym_vals) - min(abs(v) for v in asym_vals)
        if spread > 10:
            out.append({"category": "asymmetry", "severity": "notable",
                         "title": "Variable asymmetry across sessions",
                         "text": f"GCT asymmetry ranges from {min(abs(v) for v in asym_vals):.1f}ms to {max(abs(v) for v in asym_vals):.1f}ms across sessions. This variability may correlate with fatigue, surface, or footwear changes."})
    return out


def _fatigue_insights(sessions, agg):
    out = []
    fat = agg.get("fatigue")
    if not fat:
        return out

    gct_d = fat.get("gct_ms")
    if gct_d and gct_d.get("pct_change") is not None:
        pct = gct_d["pct_change"]
        if abs(pct) < 3:
            out.append({"category": "fatigue", "severity": "info",
                         "title": "Mechanically resilient under load",
                         "text": f"GCT drifted only {pct:+.1f}% from start to finish across all data. Strong neuromuscular endurance."})
        elif abs(pct) >= 5:
            direction = "increasing" if pct > 0 else "decreasing"
            out.append({"category": "fatigue", "severity": "notable",
                         "title": f"GCT drift of {pct:+.1f}% detected",
                         "text": f"Ground contact time is {direction} from {gct_d['first_q']:.0f}ms to {gct_d['last_q']:.0f}ms through sessions. This signals neuromuscular fatigue — the body compensates by spending more time on the ground as it tires."})

    ad = fat.get("asymmetry_drift")
    if ad:
        first, last = abs(ad["gct_first_q"]), abs(ad["gct_last_q"])
        if last > first + 3:
            out.append({"category": "fatigue", "severity": "notable",
                         "title": "Asymmetry increases under fatigue",
                         "text": f"GCT asymmetry grows from {first:.1f}ms when fresh to {last:.1f}ms when fatigued. The weaker side degrades faster — a targeted training opportunity."})
    return out


def _speed_mechanics_insights(agg):
    out = []
    zones = agg.get("speed_zones", [])
    if len(zones) < 2:
        return out

    slowest = zones[0]
    fastest = zones[-1]
    if slowest.get("avg_gct_ms") and fastest.get("avg_gct_ms"):
        gct_drop = slowest["avg_gct_ms"] - fastest["avg_gct_ms"]
        out.append({"category": "speed", "severity": "info",
                     "title": f"GCT drops {gct_drop:.0f}ms from {slowest['zone']} to {fastest['zone']}",
                     "text": f"At {slowest['zone']} pace, GCT averages {slowest['avg_gct_ms']:.0f}ms. At {fastest['zone']} pace, it tightens to {fastest['avg_gct_ms']:.0f}ms. This {gct_drop:.0f}ms reduction reflects the body's mechanical scaling with speed demands."})

    if slowest.get("avg_vgrf_bw") and fastest.get("avg_vgrf_bw"):
        vgrf_gain = fastest["avg_vgrf_bw"] - slowest["avg_vgrf_bw"]
        if vgrf_gain > 0:
            out.append({"category": "speed", "severity": "info",
                         "title": f"Force output increases {vgrf_gain:.2f} BW with speed",
                         "text": f"vGRF rises from {slowest['avg_vgrf_bw']:.2f} BW at {slowest['zone']} pace to {fastest['avg_vgrf_bw']:.2f} BW at {fastest['zone']} pace. Higher forces at speed are normal — the key is whether this scales efficiently."})
    return out


def _trend_insights(sessions):
    out = []
    if len(sessions) < 3:
        return out

    speeds = [(s["date"], s["metrics"].get("avg_speed_mps")) for s in sessions if s["metrics"].get("avg_speed_mps")]
    if len(speeds) >= 3:
        first_half = [v for _, v in speeds[:len(speeds)//2]]
        second_half = [v for _, v in speeds[len(speeds)//2:]]
        f_avg = sum(first_half) / len(first_half) if first_half else 0
        s_avg = sum(second_half) / len(second_half) if second_half else 0
        if f_avg > 0:
            pct = (s_avg - f_avg) / f_avg * 100
            if pct > 5:
                out.append({"category": "trends", "severity": "info",
                             "title": f"Speed trending up {pct:.1f}%",
                             "text": f"Average session speed has increased from {f_avg:.2f} to {s_avg:.2f} m/s across recent sessions."})
            elif pct < -5:
                out.append({"category": "trends", "severity": "notable",
                             "title": f"Speed trending down {abs(pct):.1f}%",
                             "text": f"Average session speed has decreased from {f_avg:.2f} to {s_avg:.2f} m/s. This could reflect different session types, accumulated fatigue, or a deliberate training phase."})

    gcts = [s["metrics"].get("avg_gct_ms") for s in sessions if s["metrics"].get("avg_gct_ms")]
    if len(gcts) >= 3:
        if gcts[-1] < gcts[0] * 0.95:
            out.append({"category": "trends", "severity": "info",
                         "title": "Ground contact time improving",
                         "text": f"GCT has decreased from {gcts[0]:.0f}ms to {gcts[-1]:.0f}ms over the recorded period — a sign of improving mechanical efficiency or increased speed."})
    return out


def _bilateral_insights(agg):
    out = []
    bi = agg.get("bilateral", [])
    monitors = [r for r in bi if r.get("assessment") == "Monitor"]
    excellents = [r for r in bi if r.get("assessment") == "Excellent"]

    if len(excellents) == len(bi) and len(bi) > 0:
        out.append({"category": "biomechanics", "severity": "info",
                     "title": "All bilateral metrics in excellent range",
                     "text": "Every measured metric shows strong left-right symmetry. This is the foundation of efficient, injury-resistant running."})
    elif monitors:
        labels = ", ".join(r["label"] for r in monitors)
        out.append({"category": "biomechanics", "severity": "notable",
                     "title": f"Bilateral imbalance in {labels}",
                     "text": f"The following metrics show meaningful left-right differences that exceed normal thresholds: {labels}. Targeted mobility or strength work on the weaker side may help."})
    return out


def _foot_strike_insights(agg):
    out = []
    fsa = agg.get("metrics", {}).get("avg_fsa_deg")
    if fsa is None:
        return out
    if fsa < 0:
        pattern = "forefoot"
    elif fsa < 8:
        pattern = "midfoot"
    else:
        pattern = "rearfoot"
    out.append({"category": "biomechanics", "severity": "info",
                 "title": f"Primary foot strike: {pattern} ({fsa:.1f}°)",
                 "text": f"Average foot strike angle of {fsa:.1f}° indicates a {pattern} landing pattern. {'This is typical of faster, more experienced runners.' if fsa < 8 else 'A rearfoot strike is common and not inherently problematic — it depends on the individual.'}"})
    return out
