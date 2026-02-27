"""
Cortex Insight Engine — rule-based, LLM-swappable.

To swap in LLM: replace generate_insights() body with an API call
that sends the same data and returns list[dict] with same schema:
  { category, severity, title, text, color? }

Categories: asymmetry, biomechanics, fatigue, speed, trends, coaching
Severities: action, notable, info
Colors (optional): green, amber, red, blue, accent (for UI tinting)
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
    insights.extend(_coaching_recommendations(sessions, aggregate))
    insights.extend(_session_narratives(sessions))
    insights.sort(key=lambda i: {"action": 0, "notable": 1, "info": 2, "narrative": 3}.get(i["severity"], 4))
    return insights


# ---------------------------------------------------------------------------
# Asymmetry
# ---------------------------------------------------------------------------

def _asymmetry_insights(sessions, agg):
    out = []
    gct_a = agg.get("asymmetry", {}).get("gct_ms")
    if gct_a is not None:
        abs_a = abs(gct_a)
        side = "left" if gct_a > 0 else "right"
        other = "right" if gct_a > 0 else "left"
        if abs_a < 5:
            out.append({"category": "asymmetry", "severity": "info", "color": "green",
                         "title": "Excellent bilateral symmetry",
                         "text": f"GCT asymmetry of just {abs_a:.1f}ms across all runs is well below the 8-10ms threshold that sports scientists typically flag. This balanced pattern means training load distributes evenly across both legs, reducing overuse injury risk. This is one of the strongest indicators of healthy, efficient running mechanics."})
        elif abs_a < 10:
            out.append({"category": "asymmetry", "severity": "info",
                         "title": "Good bilateral balance",
                         "text": f"GCT asymmetry of {abs_a:.1f}ms ({side} foot spends slightly longer on the ground) is within the normal range for recreational and competitive runners. The {other} leg transitions through ground contact faster, which is a common and generally benign pattern. No intervention needed — continue monitoring across sessions to establish baseline consistency."})
        elif abs_a < 15:
            out.append({"category": "asymmetry", "severity": "notable", "color": "amber",
                         "title": f"Elevated GCT asymmetry — {abs_a:.1f}ms",
                         "text": f"The {side} foot consistently spends {abs_a:.1f}ms longer on the ground than the {other}. This exceeds the normal 8-10ms range and may indicate a compensation pattern — the body redistributing load to protect or accommodate one side. Worth investigating whether this correlates with a history of injury, muscular imbalance, or footwear asymmetry. Track whether this pattern is stable across sessions or fluctuates with fatigue and intensity."})
        else:
            out.append({"category": "asymmetry", "severity": "action", "color": "red",
                         "title": f"Significant asymmetry detected — {abs_a:.1f}ms",
                         "text": f"GCT asymmetry of {abs_a:.1f}ms ({side} side) exceeds the 15ms threshold. At this level, the bilateral difference is large enough to meaningfully alter how load distributes between legs during running. The {other} leg absorbs proportionally more impact per unit time, which over accumulated mileage increases overuse injury risk. This warrants a physical assessment — consider targeted single-leg strength work, hip mobility screening, and monitoring across different footwear."})

    asym_vals = [s.get("asymmetry", {}).get("gct_ms") for s in sessions if s.get("asymmetry", {}).get("gct_ms") is not None]
    if len(asym_vals) >= 3:
        abs_vals = [abs(v) for v in asym_vals]
        spread = max(abs_vals) - min(abs_vals)
        if spread > 10:
            out.append({"category": "asymmetry", "severity": "notable", "color": "amber",
                         "title": "Variable asymmetry across sessions",
                         "text": f"GCT asymmetry ranges from {min(abs_vals):.1f}ms to {max(abs_vals):.1f}ms across sessions — a {spread:.1f}ms spread. This variability may correlate with session intensity, accumulated fatigue, surface type, or footwear changes. Consistent asymmetry is generally more benign than volatile asymmetry, which can indicate an unstable compensation pattern."})
        elif spread < 4 and len(asym_vals) >= 3:
            out.append({"category": "asymmetry", "severity": "info", "color": "green",
                         "title": "Remarkably consistent bilateral pattern",
                         "text": f"GCT asymmetry stays within a {spread:.1f}ms band across all sessions regardless of intensity or session type. This consistency indicates a stable, well-established movement pattern rather than a fluctuating compensation."})
    return out


# ---------------------------------------------------------------------------
# Fatigue
# ---------------------------------------------------------------------------

def _fatigue_insights(sessions, agg):
    out = []
    fat = agg.get("fatigue")
    if not fat:
        return out

    gct_d = fat.get("gct_ms")
    if gct_d and gct_d.get("pct_change") is not None:
        pct = gct_d["pct_change"]
        if abs(pct) < 3:
            out.append({"category": "fatigue", "severity": "info", "color": "green",
                         "title": "Mechanically resilient under load",
                         "text": f"GCT drifted only {pct:+.1f}% from the first quarter to the last quarter of accumulated data ({gct_d['first_q']:.0f}ms → {gct_d['last_q']:.0f}ms). This indicates strong neuromuscular endurance — the ability to maintain mechanical integrity even as the body accumulates fatigue. Runners with stable GCT under load tend to maintain form in the late stages of races and hard training sessions."})
        elif pct >= 5:
            out.append({"category": "fatigue", "severity": "notable", "color": "amber",
                         "title": f"GCT drift of {pct:+.1f}% — neuromuscular fatigue signature",
                         "text": f"Ground contact time increases from {gct_d['first_q']:.0f}ms to {gct_d['last_q']:.0f}ms as sessions progress. The body compensates for neuromuscular fatigue by spending more time on the ground — the muscles can no longer generate the same force in the same timeframe. This is the biomechanical equivalent of 'slowing down from the legs up.' Targeted eccentric strength work and progressive overload in training may improve mechanical durability."})
        elif pct <= -5:
            out.append({"category": "fatigue", "severity": "info",
                         "title": f"GCT decreasing through sessions ({pct:+.1f}%)",
                         "text": f"Ground contact time drops from {gct_d['first_q']:.0f}ms to {gct_d['last_q']:.0f}ms — a {abs(pct):.1f}% improvement. This likely reflects a warm-up effect: the neuromuscular system becomes more responsive as the body warms up, producing faster ground contacts."})

    ad = fat.get("asymmetry_drift")
    if ad:
        first, last = abs(ad["gct_first_q"]), abs(ad["gct_last_q"])
        if last > first + 3:
            out.append({"category": "fatigue", "severity": "notable", "color": "amber",
                         "title": "Asymmetry increases under fatigue",
                         "text": f"GCT asymmetry grows from {first:.1f}ms when fresh to {last:.1f}ms when fatigued. This is a clinically relevant pattern — it means the weaker or less conditioned leg degrades faster under load, creating a progressively unbalanced gait. This is precisely the kind of fatigue-induced asymmetry that correlates with overuse injuries. The targeted training opportunity: identify the degrading side and build specific endurance and strength for that leg."})
        elif abs(last - first) <= 2:
            out.append({"category": "fatigue", "severity": "info", "color": "green",
                         "title": "Asymmetry stable through fatigue",
                         "text": f"GCT asymmetry shifts only from {first:.1f}ms to {last:.1f}ms between fresh and fatigued states — excellent bilateral resilience. Both legs degrade at approximately the same rate, maintaining the fundamental symmetry of the gait pattern even as the body tires."})
    return out


# ---------------------------------------------------------------------------
# Speed-mechanics coupling
# ---------------------------------------------------------------------------

def _speed_mechanics_insights(agg):
    out = []
    zones = agg.get("speed_zones", [])
    if len(zones) < 2:
        return out

    slowest = zones[0]
    fastest = zones[-1]
    if slowest.get("avg_gct_ms") and fastest.get("avg_gct_ms"):
        gct_drop = slowest["avg_gct_ms"] - fastest["avg_gct_ms"]
        pct_drop = gct_drop / slowest["avg_gct_ms"] * 100 if slowest["avg_gct_ms"] > 0 else 0
        out.append({"category": "speed", "severity": "info",
                     "title": f"GCT drops {gct_drop:.0f}ms across speed zones ({pct_drop:.0f}% reduction)",
                     "text": f"At {slowest['zone']} pace, GCT averages {slowest['avg_gct_ms']:.0f}ms. At {fastest['zone']} pace, it tightens to {fastest['avg_gct_ms']:.0f}ms — a {gct_drop:.0f}ms reduction ({pct_drop:.0f}%). This mechanical scaling reflects how the neuromuscular system adapts to speed demands: faster running requires faster force application, driving the foot off the ground more quickly. The rate and linearity of this reduction reveals individual mechanical efficiency — elite runners typically show smooth, proportional scaling."})

    if slowest.get("avg_vgrf_bw") and fastest.get("avg_vgrf_bw"):
        vgrf_gain = fastest["avg_vgrf_bw"] - slowest["avg_vgrf_bw"]
        if vgrf_gain > 0:
            pct_gain = vgrf_gain / slowest["avg_vgrf_bw"] * 100 if slowest["avg_vgrf_bw"] > 0 else 0
            out.append({"category": "speed", "severity": "info",
                         "title": f"Force output scales {vgrf_gain:.2f} BW with speed (+{pct_gain:.0f}%)",
                         "text": f"Average vGRF rises from {slowest['avg_vgrf_bw']:.2f} BW at {slowest['zone']} pace to {fastest['avg_vgrf_bw']:.2f} BW at {fastest['zone']} pace. Higher ground reaction forces at speed are biomechanically expected — running faster requires applying more force to the ground in less time. The efficiency question is whether force scales proportionally with speed or disproportionately, which affects injury risk at higher intensities."})

    if len(zones) >= 3:
        mid = zones[len(zones) // 2]
        if slowest.get("avg_stride_len_m") and fastest.get("avg_stride_len_m") and slowest.get("avg_cadence") and fastest.get("avg_cadence"):
            stride_gain = fastest["avg_stride_len_m"] - slowest["avg_stride_len_m"]
            cad_gain = (fastest["avg_cadence"] or 0) - (slowest["avg_cadence"] or 0)
            strategy = "stride-length dominant" if stride_gain > 0.3 and cad_gain < 5 else \
                       "cadence dominant" if cad_gain > 5 and stride_gain < 0.3 else "balanced"
            out.append({"category": "speed", "severity": "info",
                         "title": f"Speed strategy: {strategy}",
                         "text": f"From {slowest['zone']} to {fastest['zone']} pace, stride length changes by {stride_gain:+.2f}m and cadence by {cad_gain:+.0f} spm. This reveals a {strategy} speed generation strategy — {'relying primarily on longer strides to increase pace' if 'stride' in strategy else 'relying primarily on faster turnover to increase pace' if 'cadence' in strategy else 'using a mix of longer strides and faster turnover'}. Both strategies are valid; the optimal balance depends on the individual's biomechanics, body proportions, and event distance."})
    return out


# ---------------------------------------------------------------------------
# Trends
# ---------------------------------------------------------------------------

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
                out.append({"category": "trends", "severity": "info", "color": "green",
                             "title": f"Speed trending up {pct:.1f}% across sessions",
                             "text": f"Average session speed has increased from {f_avg:.2f} m/s to {s_avg:.2f} m/s comparing early vs recent sessions. This upward trajectory suggests progressive fitness gains or a shift toward higher-intensity training. Monitor whether the mechanical metrics (GCT, vGRF, asymmetry) remain stable through this speed increase — speed gains that come with degrading mechanics may not be sustainable."})
            elif pct < -5:
                out.append({"category": "trends", "severity": "notable",
                             "title": f"Speed trending down {abs(pct):.1f}%",
                             "text": f"Average session speed has decreased from {f_avg:.2f} to {s_avg:.2f} m/s. This could reflect different session types (more easy runs), accumulated fatigue from a training block, or a deliberate recovery phase. Context matters — if this is intentional base building, the mechanical metrics at these lower speeds may actually be improving."})

    gcts = [s["metrics"].get("avg_gct_ms") for s in sessions if s["metrics"].get("avg_gct_ms")]
    if len(gcts) >= 3:
        if gcts[-1] < gcts[0] * 0.95:
            out.append({"category": "trends", "severity": "info", "color": "green",
                         "title": "Ground contact time improving over time",
                         "text": f"GCT has decreased from {gcts[0]:.0f}ms to {gcts[-1]:.0f}ms over the recorded period. Shorter ground contact time is generally a marker of improved mechanical efficiency or increased running speed. If this improvement is happening at similar paces, it suggests genuine neuromuscular adaptation — the muscles are becoming more efficient at generating force quickly."})
        elif gcts[-1] > gcts[0] * 1.05:
            out.append({"category": "trends", "severity": "notable",
                         "title": "Ground contact time increasing over time",
                         "text": f"GCT has increased from {gcts[0]:.0f}ms to {gcts[-1]:.0f}ms over the recorded period. If this is occurring at similar paces, it may indicate accumulated fatigue, detraining, or the early stages of overreaching. If the increase coincides with lower speeds, it may simply reflect a shift in training focus."})
    return out


# ---------------------------------------------------------------------------
# Bilateral
# ---------------------------------------------------------------------------

def _bilateral_insights(agg):
    out = []
    bi = agg.get("bilateral", [])
    monitors = [r for r in bi if r.get("assessment") == "Monitor"]
    excellents = [r for r in bi if r.get("assessment") == "Excellent"]
    normals = [r for r in bi if r.get("assessment") == "Normal"]

    if len(excellents) == len(bi) and len(bi) > 0:
        out.append({"category": "biomechanics", "severity": "info", "color": "green",
                     "title": "All bilateral metrics in excellent range",
                     "text": "Every measured metric — ground contact time, foot strike angle, vGRF, stride length, and loading rate — shows strong left-right symmetry. This is the foundation of efficient, injury-resistant running. Bilateral symmetry means the body distributes mechanical stress evenly, reducing the cumulative asymmetric loading that drives many running injuries."})
    elif monitors:
        labels = ", ".join(r["label"] for r in monitors)
        diffs = "; ".join(f"{r['label']}: L {r['left_mean']:.1f} vs R {r['right_mean']:.1f} {r['unit']}" for r in monitors if r.get("left_mean") and r.get("right_mean"))
        out.append({"category": "biomechanics", "severity": "notable", "color": "amber",
                     "title": f"Bilateral imbalance: {labels}",
                     "text": f"The following metrics show meaningful left-right differences that exceed normal thresholds: {diffs}. These asymmetries may reflect muscular imbalance, anatomical differences, or compensatory patterns. If consistent across sessions, consider a physical therapy assessment or targeted unilateral strength work. If variable, track whether the asymmetry correlates with fatigue or specific session types."})

    if len(excellents) > 0 and len(monitors) > 0:
        exc_labels = ", ".join(r["label"] for r in excellents)
        mon_labels = ", ".join(r["label"] for r in monitors)
        out.append({"category": "biomechanics", "severity": "info",
                     "title": "Mixed bilateral profile",
                     "text": f"Excellent symmetry in {exc_labels}, but elevated differences in {mon_labels}. This selective asymmetry pattern is common — it often means the asymmetry is task-specific rather than structural. For example, GCT symmetry with stride length asymmetry may reflect a hip mobility difference rather than a neuromuscular deficit."})
    return out


# ---------------------------------------------------------------------------
# Foot strike
# ---------------------------------------------------------------------------

def _foot_strike_insights(agg):
    out = []
    m = agg.get("metrics", {})
    fsa = m.get("avg_fsa_deg")
    if fsa is None:
        return out

    l_fsa = agg.get("left_summary", {}).get("avg_fsa_deg")
    r_fsa = agg.get("right_summary", {}).get("avg_fsa_deg")

    if fsa < 0:
        pattern = "forefoot"
        desc = "This is characteristic of faster, more experienced runners and is associated with higher calf loading but reduced knee stress. It's an efficient pattern for speed but requires adequate calf and Achilles conditioning."
    elif fsa < 8:
        pattern = "midfoot"
        desc = "A midfoot strike is often considered the biomechanical sweet spot — distributing impact forces across the foot rather than concentrating them at the heel or forefoot. It balances efficiency with injury protection."
    else:
        pattern = "rearfoot"
        desc = "A rearfoot strike is the most common pattern among recreational runners. Despite popular belief, it is not inherently injurious — it depends on the individual's anatomy, loading rate, and overall mechanics."

    lr_note = ""
    if l_fsa is not None and r_fsa is not None:
        diff = abs(l_fsa - r_fsa)
        if diff > 3:
            lr_note = f" Notably, there's a {diff:.1f}° difference between feet (L: {l_fsa:.1f}°, R: {r_fsa:.1f}°), suggesting different landing strategies per foot — worth monitoring."
        else:
            lr_note = f" Both feet show similar strike angles (L: {l_fsa:.1f}°, R: {r_fsa:.1f}°), indicating a consistent bilateral landing pattern."

    out.append({"category": "biomechanics", "severity": "info",
                 "title": f"Primary foot strike: {pattern} ({fsa:.1f}°)",
                 "text": f"Average foot strike angle of {fsa:.1f}° indicates a {pattern} landing pattern. {desc}{lr_note}"})

    zones = agg.get("speed_zones", [])
    if len(zones) >= 2:
        slowest_fsa = zones[0].get("avg_fsa_deg")
        fastest_fsa = zones[-1].get("avg_fsa_deg")
        if slowest_fsa is not None and fastest_fsa is not None:
            shift = slowest_fsa - fastest_fsa
            if abs(shift) > 3:
                slow_p = "rearfoot" if slowest_fsa >= 8 else "midfoot" if slowest_fsa >= 0 else "forefoot"
                fast_p = "rearfoot" if fastest_fsa >= 8 else "midfoot" if fastest_fsa >= 0 else "forefoot"
                out.append({"category": "speed", "severity": "info",
                             "title": f"Foot strike shifts from {slow_p} to {fast_p} with speed",
                             "text": f"FSA changes from {slowest_fsa:.1f}° at {zones[0]['zone']} pace to {fastest_fsa:.1f}° at {zones[-1]['zone']} pace — a {shift:.1f}° forward shift. This speed-adaptive strike pattern is biomechanically normal: the body naturally moves toward a more anterior foot contact as speed increases, reducing ground contact time and enabling faster force application."})
    return out


# ---------------------------------------------------------------------------
# Coaching recommendations
# ---------------------------------------------------------------------------

def _coaching_recommendations(sessions, agg):
    out = []
    m = agg.get("metrics", {})
    asym = agg.get("asymmetry", {})
    bi = agg.get("bilateral", [])
    fat = agg.get("fatigue")

    # Strength identification
    gct_a = asym.get("gct_ms")
    if gct_a is not None and abs(gct_a) < 8:
        out.append({"category": "coaching", "severity": "info", "color": "green",
                     "title": "Strength: Bilateral Symmetry",
                     "text": f"GCT asymmetry of {abs(gct_a):.1f}ms is a hallmark of balanced, injury-resistant mechanics. Maintain this — any significant increase (>8ms) in future sessions should trigger investigation. This symmetry is worth protecting through continued balanced training."})

    if fat and fat.get("gct_ms") and abs(fat["gct_ms"].get("pct_change", 999)) < 3:
        out.append({"category": "coaching", "severity": "info", "color": "green",
                     "title": "Strength: Mechanical Durability",
                     "text": "GCT remains stable through fatigue — strong neuromuscular endurance. This means form holds up even in the later stages of runs, which translates to consistent mechanics during races and hard training. This is a trainable quality worth maintaining through progressive long runs."})

    # Monitor items
    monitors = [r for r in bi if r.get("assessment") == "Monitor"]
    if monitors:
        for r in monitors:
            out.append({"category": "coaching", "severity": "notable", "color": "amber",
                         "title": f"Monitor: {r['label']} Asymmetry",
                         "text": f"{r['label']} shows a left-right difference of {abs(r['diff']):.1f} {r['unit']} (L: {r['left_mean']:.1f}, R: {r['right_mean']:.1f}). Track this across sessions — if it's consistent, consider a targeted assessment. If it varies with fatigue or intensity, it may be a fatigue-dependent compensation rather than a structural issue."})

    l_fsa_std = agg.get("left_summary", {}).get("std_fsa_deg")
    r_fsa_std = agg.get("right_summary", {}).get("std_fsa_deg")
    if l_fsa_std is not None and l_fsa_std > 5:
        out.append({"category": "coaching", "severity": "notable",
                     "title": "Monitor: Foot Strike Angle Variability",
                     "text": f"FSA standard deviation of {l_fsa_std:.1f}° indicates variable foot placement. While some variability is adaptive (responding to terrain and speed), high variability may indicate inconsistent mechanics. Tracking whether this tightens with training may indicate improved neuromuscular control."})

    if fat and fat.get("asymmetry_drift"):
        ad = fat["asymmetry_drift"]
        first, last = abs(ad["gct_first_q"]), abs(ad["gct_last_q"])
        if last > first + 3:
            out.append({"category": "coaching", "severity": "notable", "color": "amber",
                         "title": "Monitor: Fatigue-Induced Asymmetry",
                         "text": f"Asymmetry grows from {first:.1f}ms to {last:.1f}ms under fatigue. The weaker side degrades faster — this is a targeted training opportunity. Single-leg strength work, plyometrics, and unilateral stability exercises on the degrading side may improve bilateral resilience under fatigue."})

    # Development opportunities
    zones = agg.get("speed_zones", [])
    if len(zones) >= 2:
        slowest = zones[0]
        fastest = zones[-1]
        if slowest.get("avg_cadence") and fastest.get("avg_cadence"):
            cad_range = (fastest["avg_cadence"] or 0) - (slowest["avg_cadence"] or 0)
            if cad_range < 5 and slowest.get("avg_stride_len_m") and fastest.get("avg_stride_len_m"):
                stride_range = fastest["avg_stride_len_m"] - slowest["avg_stride_len_m"]
                if stride_range > 0.3:
                    out.append({"category": "coaching", "severity": "info",
                                 "title": "Develop: Cadence at Speed",
                                 "text": f"Speed increases are driven primarily by stride length (+{stride_range:.2f}m) with minimal cadence change (+{cad_range:.0f} spm). While this works, developing the ability to also increase cadence at higher speeds provides an additional 'gear' for racing — reducing individual stride stress while maintaining speed."})

    # Next steps
    if len(sessions) <= 5:
        out.append({"category": "coaching", "severity": "info",
                     "title": "Next: Build Longitudinal Baseline",
                     "text": f"With {len(sessions)} sessions of data, the biomechanical profile is emerging but still early. Continue collecting data to establish a robust baseline. As the session count grows, trend detection becomes more reliable and personalized thresholds can replace population averages. Target 10+ sessions for a statistically meaningful profile."})

    out.append({"category": "coaching", "severity": "info",
                 "title": "Next: Shoe Comparison Testing",
                 "text": "A shoe comparison study — running the same route at the same pace in different shoes — would reveal how different footwear interacts with this athlete's specific mechanics. Different shoes can alter GCT, FSA, force distribution, and even asymmetry. The goal isn't finding the 'best' shoe — it's finding the best shoe for this runner's biomechanics."})

    return out


# ---------------------------------------------------------------------------
# Per-session narrative summaries
# ---------------------------------------------------------------------------

def _session_narratives(sessions):
    """Generate a brief narrative for each session for the session overview."""
    out = []
    for s in sessions:
        m = s.get("metrics", {})
        asym = s.get("asymmetry", {})
        n = s.get("n_strides", 0)
        fat = s.get("fatigue")

        parts = []
        if m.get("avg_speed_mps"):
            pace = "easy" if m["avg_speed_mps"] < 3.5 else "moderate" if m["avg_speed_mps"] < 4.5 else "fast"
            parts.append(f"{pace} effort at {m['avg_speed_mps']:.1f} m/s")
        if asym.get("gct_ms") is not None:
            a = abs(asym["gct_ms"])
            qual = "excellent" if a < 5 else "good" if a < 10 else "elevated"
            parts.append(f"{qual} symmetry ({a:.1f}ms)")
        if fat and fat.get("gct_ms") and fat["gct_ms"].get("pct_change") is not None:
            pct = fat["gct_ms"]["pct_change"]
            if abs(pct) >= 3:
                parts.append(f"GCT drift {pct:+.1f}%")

        if parts:
            text = f"{s['date']}: {n} strides — {', '.join(parts)}."
            out.append({"category": "session", "severity": "narrative",
                         "title": f"Session {s['date']}", "text": text,
                         "session_date": s["date"]})
    return out
