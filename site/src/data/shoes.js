/**
 * Nike Running Shoe Knowledge Base
 *
 * Sources: nike.com, roadtrailrun.com, runnersworld.com, runrepeat.com
 * Data will be enriched with mechanical test data, lab performance data, etc.
 * as it becomes available.
 */

export const SHOE_CATEGORIES = {
  everyday: {
    label: "Everyday",
    description: "Daily trainers built for comfort and versatility",
    lines: ["pegasus", "structure", "vomero"],
  },
  racing: {
    label: "Road Racing",
    description: "Competition shoes engineered for maximum speed",
    lines: ["alphafly", "vaporfly", "streakfly"],
  },
};

export const SHOE_TIERS = {
  icon: { label: "Icon", description: "The essential — proven, reliable, accessible" },
  plus: { label: "Plus", description: "Performance upgrade — more responsive foam and tech" },
  premium: { label: "Premium", description: "The pinnacle — best materials and innovation" },
};

export const SHOES = {
  // ===== PEGASUS LINE =====
  pegasus_42: {
    id: "pegasus_42",
    name: "Pegasus 42",
    line: "pegasus",
    tier: "icon",
    category: "everyday",
    weight_g: 283,
    stack_heel_mm: 37,
    stack_forefoot_mm: 27,
    drop_mm: 10,
    foam: "ReactX",
    foam_type: "TPE (non-supercritical)",
    plate: null,
    air_unit: "Full-length curved Air Zoom",
    energy_return_pct: null,
    price_usd: 140,
    intended_use: "Daily trainer, easy to moderate runs",
    best_for: ["daily training", "easy runs", "beginner friendly"],
    key_tech: ["ReactX foam", "Full-length Air Zoom unit", "15% more energy return vs Peg 41"],
    expected_impact: {
      gct: "neutral",
      cadence: "neutral",
      stride: "neutral",
      speed: "neutral",
      cushioning: "moderate",
      stability: "neutral",
      responsiveness: "moderate",
    },
    notes: "The gold standard daily trainer. Balanced ride, moderate cushioning. Not designed for speed but reliable for any distance.",
  },
  pegasus_41: {
    id: "pegasus_41",
    name: "Pegasus 41",
    line: "pegasus",
    tier: "icon",
    category: "everyday",
    weight_g: 281,
    stack_heel_mm: 37,
    stack_forefoot_mm: 27,
    drop_mm: 10,
    foam: "ReactX",
    foam_type: "TPE (non-supercritical)",
    plate: null,
    air_unit: "Dual Air Zoom (heel + forefoot)",
    energy_return_pct: null,
    price_usd: 130,
    intended_use: "Daily trainer",
    best_for: ["daily training", "easy runs"],
    key_tech: ["ReactX foam", "Dual Air Zoom units"],
    expected_impact: {
      gct: "neutral",
      cadence: "neutral",
      stride: "neutral",
      speed: "neutral",
      cushioning: "moderate",
      stability: "neutral",
      responsiveness: "moderate",
    },
    notes: "Previous generation Pegasus. Similar platform to 42 but with dual Air units instead of full-length.",
  },
  pegasus_plus: {
    id: "pegasus_plus",
    name: "Pegasus Plus",
    line: "pegasus",
    tier: "plus",
    category: "everyday",
    weight_g: 295,
    stack_heel_mm: 40,
    stack_forefoot_mm: 30,
    drop_mm: 10,
    foam: "ZoomX + ReactX",
    foam_type: "PEBA + TPE dual density",
    plate: null,
    air_unit: null,
    energy_return_pct: null,
    price_usd: 170,
    intended_use: "Uptempo daily trainer, tempo runs",
    best_for: ["daily training", "tempo runs", "longer easy runs"],
    key_tech: ["ZoomX top layer", "ReactX base", "Higher stack"],
    expected_impact: {
      gct: "slight decrease",
      cadence: "neutral",
      stride: "slight increase",
      speed: "slight increase",
      cushioning: "high",
      stability: "neutral",
      responsiveness: "high",
    },
    notes: "Upgraded Pegasus with ZoomX on top of ReactX. More bounce and energy return than the Icon, bridging daily trainer and performance.",
  },
  pegasus_premium: {
    id: "pegasus_premium",
    name: "Pegasus Premium",
    line: "pegasus",
    tier: "premium",
    category: "everyday",
    weight_g: 308,
    stack_heel_mm: 46,
    stack_forefoot_mm: 36,
    drop_mm: 10,
    foam: "ZoomX + Air Zoom plate + ReactX",
    foam_type: "PEBA + Air + TPE triple stack",
    plate: "Air Zoom plate (not carbon)",
    air_unit: "Full-length Air Zoom plate",
    energy_return_pct: null,
    price_usd: 210,
    intended_use: "Premium daily trainer, long runs, tempo",
    best_for: ["long runs", "tempo runs", "race day training"],
    key_tech: ["Triple-stack midsole", "ZoomX foam (20mm)", "Full Air Zoom plate", "ReactX base"],
    expected_impact: {
      gct: "decrease",
      cadence: "neutral to slight increase",
      stride: "increase",
      speed: "moderate increase",
      cushioning: "very high",
      stability: "neutral",
      responsiveness: "very high",
    },
    notes: "The most advanced daily trainer. Triple-stack midsole gives race-shoe-like energy return in a training silhouette. High stack but well-cushioned.",
  },

  // ===== STRUCTURE LINE =====
  structure_26: {
    id: "structure_26",
    name: "Structure 26",
    line: "structure",
    tier: "icon",
    category: "everyday",
    weight_g: 321,
    stack_heel_mm: 36,
    stack_forefoot_mm: 26,
    drop_mm: 10,
    foam: "ReactX",
    foam_type: "TPE",
    plate: null,
    air_unit: null,
    energy_return_pct: null,
    price_usd: 145,
    intended_use: "Stability daily trainer",
    best_for: ["overpronators", "daily training", "stability"],
    key_tech: ["ReactX foam", "Midfoot support system", "High-abrasion heel rubber"],
    expected_impact: {
      gct: "neutral",
      cadence: "neutral",
      stride: "neutral",
      speed: "neutral",
      cushioning: "moderate",
      stability: "high",
      responsiveness: "moderate",
    },
    notes: "Stability-focused trainer. The midfoot support system wraps around the arch and heel to control pronation. Heavier but more supportive.",
  },
  structure_plus: {
    id: "structure_plus",
    name: "Structure Plus",
    line: "structure",
    tier: "plus",
    category: "everyday",
    weight_g: 310,
    stack_heel_mm: 40,
    stack_forefoot_mm: 30,
    drop_mm: 10,
    foam: "ZoomX + ReactX",
    foam_type: "PEBA + TPE dual density",
    plate: null,
    air_unit: null,
    energy_return_pct: null,
    price_usd: 175,
    intended_use: "Performance stability trainer",
    best_for: ["overpronators", "tempo runs", "longer runs"],
    key_tech: ["ZoomX top layer", "Stability frame", "Enhanced midfoot support"],
    expected_impact: {
      gct: "slight decrease",
      cadence: "neutral",
      stride: "slight increase",
      speed: "slight increase",
      cushioning: "high",
      stability: "very high",
      responsiveness: "high",
    },
    notes: "ZoomX-enhanced stability shoe. More responsive than the Icon while maintaining pronation control. Good for runners who need support at faster paces.",
  },

  // ===== VOMERO LINE =====
  vomero_18: {
    id: "vomero_18",
    name: "Vomero 18",
    line: "vomero",
    tier: "icon",
    category: "everyday",
    weight_g: 298,
    stack_heel_mm: 40,
    stack_forefoot_mm: 30,
    drop_mm: 10,
    foam: "ZoomX (top) + ReactX (base)",
    foam_type: "PEBA + TPE",
    plate: null,
    air_unit: null,
    energy_return_pct: null,
    price_usd: 150,
    intended_use: "Max cushion daily trainer, long runs",
    best_for: ["long runs", "recovery runs", "high mileage"],
    key_tech: ["ZoomX top layer (13-15mm)", "ReactX base", "High stack for plush ride"],
    expected_impact: {
      gct: "slight increase",
      cadence: "neutral",
      stride: "neutral",
      speed: "neutral",
      cushioning: "very high",
      stability: "neutral",
      responsiveness: "moderate",
    },
    notes: "Max cushion trainer with ZoomX for a soft, plush ride. Excellent for recovery and long easy runs. Not optimized for speed.",
  },
  vomero_plus: {
    id: "vomero_plus",
    name: "Vomero Plus",
    line: "vomero",
    tier: "plus",
    category: "everyday",
    weight_g: 290,
    stack_heel_mm: 42,
    stack_forefoot_mm: 32,
    drop_mm: 10,
    foam: "Full ZoomX",
    foam_type: "PEBA (full midsole)",
    plate: null,
    air_unit: null,
    energy_return_pct: null,
    price_usd: 180,
    intended_use: "Performance max cushion, long runs at pace",
    best_for: ["long runs", "tempo long runs", "high mileage"],
    key_tech: ["Full ZoomX midsole", "Lighter than Vomero 18", "Maximum energy return"],
    expected_impact: {
      gct: "slight decrease",
      cadence: "neutral",
      stride: "slight increase",
      speed: "slight increase",
      cushioning: "very high",
      stability: "neutral",
      responsiveness: "high",
    },
    notes: "Full ZoomX version of the Vomero. Lighter than the 18 with more energy return. The max-cushion shoe for runners who also want performance.",
  },
  vomero_premium: {
    id: "vomero_premium",
    name: "Vomero Premium",
    line: "vomero",
    tier: "premium",
    category: "everyday",
    weight_g: 305,
    stack_heel_mm: 45,
    stack_forefoot_mm: 35,
    drop_mm: 10,
    foam: "ZoomX + Air Zoom unit",
    foam_type: "PEBA + Air",
    plate: "Air Zoom plate",
    air_unit: "Full-length Air Zoom",
    energy_return_pct: null,
    price_usd: 220,
    intended_use: "Premium max cushion, race-day comfort",
    best_for: ["marathon", "ultra long runs", "premium experience"],
    key_tech: ["ZoomX + Air Zoom plate", "Highest stack in everyday line", "Premium upper"],
    expected_impact: {
      gct: "decrease",
      cadence: "neutral",
      stride: "increase",
      speed: "moderate increase",
      cushioning: "maximum",
      stability: "neutral",
      responsiveness: "very high",
    },
    notes: "The ultimate cushioned experience. Air Zoom plate adds propulsion to the plush ZoomX. Some runners use this for marathons.",
  },

  // ===== ALPHAFLY LINE =====
  alphafly_3: {
    id: "alphafly_3",
    name: "Alphafly 3",
    line: "alphafly",
    tier: null,
    category: "racing",
    weight_g: 210,
    stack_heel_mm: 40,
    stack_forefoot_mm: 32,
    drop_mm: 8,
    foam: "ZoomX",
    foam_type: "PEBA (supercritical)",
    plate: "Full-length carbon fiber Flyplate",
    air_unit: "Dual Air Zoom pods (forefoot)",
    energy_return_pct: null,
    price_usd: 285,
    intended_use: "Marathon racing",
    best_for: ["marathon", "half marathon", "race day"],
    key_tech: ["ZoomX foam", "Carbon fiber Flyplate", "Dual Air Zoom pods", "Atomknit upper"],
    expected_impact: {
      gct: "significant decrease",
      cadence: "slight increase",
      stride: "significant increase",
      speed: "significant increase",
      cushioning: "high",
      stability: "low (requires strong form)",
      responsiveness: "maximum",
    },
    notes: "Nike's premier marathon racer. The carbon plate + Air Zoom pods create a propulsive rocker effect. Maximum energy return at the cost of stability. Requires good running form to benefit fully.",
  },
  alphafly_2: {
    id: "alphafly_2",
    name: "Alphafly 2",
    line: "alphafly",
    tier: null,
    category: "racing",
    weight_g: 228,
    stack_heel_mm: 40,
    stack_forefoot_mm: 32,
    drop_mm: 8,
    foam: "ZoomX",
    foam_type: "PEBA",
    plate: "Full-length carbon fiber plate",
    air_unit: "Dual Air Zoom pods (forefoot)",
    energy_return_pct: null,
    price_usd: 275,
    intended_use: "Marathon racing",
    best_for: ["marathon", "half marathon"],
    key_tech: ["ZoomX foam", "Carbon fiber plate", "Dual Air Zoom pods"],
    expected_impact: {
      gct: "significant decrease",
      cadence: "slight increase",
      stride: "significant increase",
      speed: "significant increase",
      cushioning: "high",
      stability: "low",
      responsiveness: "maximum",
    },
    notes: "Previous generation marathon racer. Slightly heavier than AF3 but same fundamental tech stack.",
  },

  // ===== VAPORFLY LINE =====
  vaporfly_4: {
    id: "vaporfly_4",
    name: "Vaporfly 4",
    line: "vaporfly",
    tier: null,
    category: "racing",
    weight_g: 190,
    stack_heel_mm: 35,
    stack_forefoot_mm: 29,
    drop_mm: 6,
    foam: "ZoomX",
    foam_type: "PEBA",
    plate: "Full-length carbon fiber Flyplate",
    air_unit: null,
    energy_return_pct: null,
    price_usd: 260,
    intended_use: "5K to half marathon racing",
    best_for: ["5K", "10K", "half marathon", "race day"],
    key_tech: ["ZoomX foam", "Carbon fiber Flyplate (higher angle)", "13% lighter than VF3", "Waffle outsole"],
    expected_impact: {
      gct: "significant decrease",
      cadence: "moderate increase",
      stride: "increase",
      speed: "significant increase",
      cushioning: "moderate",
      stability: "low",
      responsiveness: "maximum",
    },
    notes: "The versatile carbon racer. Lighter and lower than Alphafly, optimized for 5K to half marathon. The carbon plate provides propulsion while the lower stack gives better ground feel.",
  },
  vaporfly_3: {
    id: "vaporfly_3",
    name: "Vaporfly 3",
    line: "vaporfly",
    tier: null,
    category: "racing",
    weight_g: 184,
    stack_heel_mm: 40,
    stack_forefoot_mm: 32,
    drop_mm: 8,
    foam: "ZoomX",
    foam_type: "PEBA",
    plate: "Full-length carbon fiber plate",
    air_unit: null,
    energy_return_pct: null,
    price_usd: 250,
    intended_use: "5K to marathon racing",
    best_for: ["5K", "10K", "half marathon", "marathon"],
    key_tech: ["ZoomX foam", "Carbon fiber plate", "Flyknit upper"],
    expected_impact: {
      gct: "significant decrease",
      cadence: "moderate increase",
      stride: "increase",
      speed: "significant increase",
      cushioning: "moderate-high",
      stability: "low",
      responsiveness: "maximum",
    },
    notes: "Previous generation carbon racer. Higher stack than VF4, taller Flyknit upper. Still a top-tier race shoe.",
  },

  // ===== STREAKFLY LINE =====
  streakfly_2: {
    id: "streakfly_2",
    name: "Streakfly 2",
    line: "streakfly",
    tier: null,
    category: "racing",
    weight_g: 128,
    stack_heel_mm: 27,
    stack_forefoot_mm: 23,
    drop_mm: 4,
    foam: "ZoomX",
    foam_type: "PEBA",
    plate: "Full-length carbon fiber Flyplate",
    air_unit: null,
    energy_return_pct: null,
    price_usd: 185,
    intended_use: "5K racing, short distance speed",
    best_for: ["5K", "3K", "mile", "track races"],
    key_tech: ["Ultra-lightweight (128g)", "ZoomX foam", "Carbon Flyplate", "4mm drop"],
    expected_impact: {
      gct: "significant decrease",
      cadence: "significant increase",
      stride: "moderate increase",
      speed: "significant increase",
      cushioning: "low",
      stability: "very low",
      responsiveness: "maximum",
    },
    notes: "The lightest carbon-plated road racer. Built for 5K and under. Minimal cushioning, maximum propulsion. Low drop promotes forefoot striking. Not for longer distances or casual runners.",
  },
  streakfly_1: {
    id: "streakfly_1",
    name: "Streakfly",
    line: "streakfly",
    tier: null,
    category: "racing",
    weight_g: 170,
    stack_heel_mm: 32,
    stack_forefoot_mm: 26,
    drop_mm: 6,
    foam: "ZoomX",
    foam_type: "PEBA",
    plate: null,
    air_unit: null,
    energy_return_pct: null,
    price_usd: 160,
    intended_use: "5K-10K racing",
    best_for: ["5K", "10K"],
    key_tech: ["ZoomX foam", "Ultra-lightweight", "No plate (original)"],
    expected_impact: {
      gct: "decrease",
      cadence: "increase",
      stride: "slight increase",
      speed: "increase",
      cushioning: "low",
      stability: "low",
      responsiveness: "high",
    },
    notes: "Original Streakfly without carbon plate. Still very lightweight for short-distance racing.",
  },
};

export const NINE_BOX = {
  rows: [
    { line: "pegasus", label: "Pegasus" },
    { line: "structure", label: "Structure" },
    { line: "vomero", label: "Vomero" },
  ],
  cols: [
    { tier: "icon", label: "Icon" },
    { tier: "plus", label: "Plus" },
    { tier: "premium", label: "Premium" },
  ],
  mapping: {
    "pegasus-icon": "pegasus_42",
    "pegasus-plus": "pegasus_plus",
    "pegasus-premium": "pegasus_premium",
    "structure-icon": "structure_26",
    "structure-plus": "structure_plus",
    "structure-premium": null,
    "vomero-icon": "vomero_18",
    "vomero-plus": "vomero_plus",
    "vomero-premium": "vomero_premium",
  },
};

export const RACING_LINE = [
  { id: "alphafly_3", label: "Alphafly 3" },
  { id: "alphafly_2", label: "Alphafly 2" },
  { id: "vaporfly_4", label: "Vaporfly 4" },
  { id: "vaporfly_3", label: "Vaporfly 3" },
  { id: "streakfly_2", label: "Streakfly 2" },
  { id: "streakfly_1", label: "Streakfly" },
];

/**
 * Generate shoe comparison analysis for a given athlete's metrics.
 */
export function analyzeShoeImpact(athleteMetrics, shoe) {
  if (!athleteMetrics || !shoe) return null;

  const analysis = {
    shoe: shoe.name,
    predictions: {},
    summary: [],
  };

  const avgSpeed = athleteMetrics.avg_speed_mps;
  const avgGCT = athleteMetrics.avg_gct_ms;
  const avgCadence = athleteMetrics.avg_cadence_spm;
  const avgStride = athleteMetrics.avg_stride_len_m;

  if (!avgSpeed) return null;

  const hasPlate = !!shoe.plate?.includes("carbon");
  const isZoomX = shoe.foam?.includes("ZoomX");
  const weight = shoe.weight_g || 280;
  const drop = shoe.drop_mm || 10;
  const stack = shoe.stack_forefoot_mm || 30;

  // Weight-based speed adjustment (~1% per 100g difference from 280g baseline)
  const weightDelta = (280 - weight) / 280;
  let speedAdj = 1.0 + weightDelta * 0.01;

  // Carbon plate effect: ~4% running economy improvement (studies show 2-6%)
  if (hasPlate) speedAdj += 0.035;

  // ZoomX foam: ~1-2% energy return benefit over ReactX
  if (isZoomX) speedAdj += 0.012;

  // High stack: slight GCT reduction from foam compression time
  const gctAdj = stack > 35 ? -3 : stack < 25 ? 2 : 0;

  // Low drop: tends to increase cadence, shorten stride slightly
  const cadenceAdj = drop < 6 ? 4 : drop < 8 ? 2 : 0;

  const predictedSpeed = avgSpeed * speedAdj;
  const predictedGCT = avgGCT ? avgGCT + gctAdj : null;
  const predictedCadence = avgCadence ? avgCadence + cadenceAdj : null;

  analysis.predictions = {
    speed_mps: Math.round(predictedSpeed * 1000) / 1000,
    speed_change_pct: Math.round((speedAdj - 1) * 10000) / 100,
    gct_ms: predictedGCT ? Math.round(predictedGCT) : null,
    gct_change_ms: gctAdj,
    cadence_spm: predictedCadence ? Math.round(predictedCadence) : null,
    cadence_change_spm: cadenceAdj,
  };

  if (hasPlate) {
    analysis.summary.push(`Carbon plate provides ~3.5% running economy boost, translating to ${(avgSpeed * 0.035).toFixed(2)} m/s potential gain.`);
  }
  if (isZoomX) {
    analysis.summary.push("ZoomX (PEBA) foam delivers higher energy return than ReactX, reducing metabolic cost.");
  }
  if (weight < 200) {
    analysis.summary.push(`At ${weight}g, this is a lightweight shoe — reduced rotational inertia benefits turnover.`);
  }
  if (drop < 6) {
    analysis.summary.push(`Low ${drop}mm drop promotes forefoot/midfoot striking, which may increase cadence by ~${cadenceAdj} spm.`);
  }
  if (stack > 40) {
    analysis.summary.push("High stack height provides maximum cushioning but may reduce ground feel.");
  }

  return analysis;
}

/**
 * Compare two shoes and highlight differences.
 */
export function compareShoes(shoeA, shoeB) {
  if (!shoeA || !shoeB) return null;

  const diffs = [];

  const weightDiff = (shoeA.weight_g || 0) - (shoeB.weight_g || 0);
  if (Math.abs(weightDiff) > 10) {
    const lighter = weightDiff < 0 ? shoeA.name : shoeB.name;
    diffs.push({
      metric: "Weight",
      a: `${shoeA.weight_g}g`,
      b: `${shoeB.weight_g}g`,
      delta: `${Math.abs(weightDiff)}g`,
      advantage: lighter,
      insight: `${lighter} is ${Math.abs(weightDiff)}g lighter — approximately ${(Math.abs(weightDiff) / 280 * 1).toFixed(1)}% speed advantage from weight alone.`,
    });
  }

  const stackDiffHeel = (shoeA.stack_heel_mm || 0) - (shoeB.stack_heel_mm || 0);
  if (Math.abs(stackDiffHeel) > 2) {
    diffs.push({
      metric: "Stack Height",
      a: `${shoeA.stack_heel_mm}/${shoeA.stack_forefoot_mm}mm`,
      b: `${shoeB.stack_heel_mm}/${shoeB.stack_forefoot_mm}mm`,
      delta: `${Math.abs(stackDiffHeel)}mm`,
      insight: "Higher stack = more cushioning but less ground feel. Lower stack = more proprioception and lighter weight.",
    });
  }

  const dropDiff = (shoeA.drop_mm || 0) - (shoeB.drop_mm || 0);
  if (Math.abs(dropDiff) > 2) {
    const lower = dropDiff < 0 ? shoeA.name : shoeB.name;
    diffs.push({
      metric: "Drop",
      a: `${shoeA.drop_mm}mm`,
      b: `${shoeB.drop_mm}mm`,
      delta: `${Math.abs(dropDiff)}mm`,
      insight: `${lower} has ${Math.abs(dropDiff)}mm less drop, encouraging a more midfoot/forefoot strike pattern.`,
    });
  }

  const aHasPlate = !!shoeA.plate?.includes("carbon");
  const bHasPlate = !!shoeB.plate?.includes("carbon");
  if (aHasPlate !== bHasPlate) {
    const plated = aHasPlate ? shoeA.name : shoeB.name;
    diffs.push({
      metric: "Carbon Plate",
      a: aHasPlate ? "Yes" : "No",
      b: bHasPlate ? "Yes" : "No",
      advantage: plated,
      insight: `${plated} has a carbon fiber plate — studies show 2-6% improvement in running economy. This is the single biggest differentiator in modern racing shoes.`,
    });
  }

  return { shoeA: shoeA.name, shoeB: shoeB.name, differences: diffs };
}
