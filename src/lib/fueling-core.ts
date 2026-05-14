import { defaultIngredients } from "./ingredients";
import type {
  BottleIngredient,
  BottleMix,
  ExternalFuelPlan,
  FuelingScheduleItem,
  Ingredient,
  Recommendation,
  SessionInput,
  Targets,
  TimelineItem,
  Warning
} from "./types";

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const roundTo = (value: number, step: number) => Math.round(value / step) * step;

function intensityScore(intensity: SessionInput["intensity"]) {
  return { easy: 0, steady: 1, tempo: 2, threshold: 3, race: 4 }[intensity];
}

export function deriveTargets(input: SessionInput): Targets {
  const hours = input.durationMin / 60;
  const score = intensityScore(input.intensity);
  const isBikeLike = input.sport === "bike" || input.sport === "triathlon";
  const isRun = input.sport === "run";
  const raceBoost = input.mode === "race" ? 8 : 0;

  let carbs = 0;
  if (input.durationMin < 60) {
    carbs = score >= 3 ? 15 : 0;
  } else if (input.durationMin <= 150) {
    carbs = 30 + score * 7 + raceBoost;
  } else {
    carbs = 58 + score * 8 + raceBoost;
  }

  if (isBikeLike) carbs += input.durationMin > 150 ? 8 : 4;
  if (isRun) carbs -= input.durationMin > 150 ? 10 : 5;
  if (input.gutTolerance === "low") carbs -= 15;
  if (input.gutTolerance === "trained") carbs += isBikeLike && input.mode === "race" ? 15 : 8;
  if (input.mode === "training" && score <= 1 && hours < 2) carbs -= 10;

  const maxCarbs =
    input.gutTolerance === "low" ? 75 : input.gutTolerance === "trained" && isBikeLike && input.mode === "race" ? 115 : 90;
  if (typeof input.customCarbTargetGph === "number") {
    carbs = input.customCarbTargetGph;
  }
  carbs = clamp(roundTo(carbs, 5), input.durationMin < 60 ? 0 : 20, maxCarbs);

  const hot = (input.temperatureC ?? 18) >= 26;
  const warm = (input.temperatureC ?? 18) >= 20;
  let fluid = input.sweatRateLph ? input.sweatRateLph * 1000 * 0.75 : hot ? 750 : warm ? 620 : 500;
  if (isRun) fluid -= 80;
  if (isBikeLike) fluid += 80;
  fluid = clamp(roundTo(fluid, 25), 350, hot ? 1000 : 850);

  let sodium = hot ? 600 : warm ? 450 : 350;
  if (input.sweatRateLph && input.sweatSodiumMgL) {
    sodium = input.sweatRateLph * input.sweatSodiumMgL * 0.55;
  } else if (input.sweatRateLph && input.sweatRateLph > 1.1) {
    sodium += 150;
  }
  if (hours >= 3) sodium += 100;
  sodium = clamp(roundTo(sodium, 25), 200, hot ? 1000 : 750);

  return {
    carbsGph: carbs,
    fluidMlph: fluid,
    sodiumMgph: sodium,
    glucoseFructoseRatio: carbs >= 60 ? "1:0.8" : "flexible"
  };
}

export function rankIngredients(ingredients: Ingredient[]) {
  const score = (ingredient: Ingredient) => {
    if (ingredient.id === "maltodextrin") return 100;
    if (ingredient.id === "fructose") return 95;
    if (ingredient.id === "table-sugar") return 88;
    if (ingredient.id === "glucose") return 82;
    if (ingredient.kind === "salt") return 78;
    if (ingredient.kind === "drink_mix") return 65;
    if (ingredient.kind === "gel") return 55;
    return 35;
  };

  return [...ingredients].sort((a, b) => score(b) - score(a));
}

function carbsPerGram(ingredient: Ingredient) {
  return ingredient.carbsPerServingG / ingredient.servingG;
}

function sodiumPerGram(ingredient: Ingredient) {
  return ingredient.sodiumMgPerServing / ingredient.servingG;
}

function getCarbIngredient(ingredients: Ingredient[], id: string, fallbackKind?: Ingredient["kind"]) {
  return ingredients.find((item) => item.id === id) ?? ingredients.find((item) => fallbackKind && item.kind === fallbackKind);
}

function ingredientLine(ingredient: Ingredient, grams: number): BottleIngredient {
  return {
    ingredientId: ingredient.id,
    name: ingredient.name,
    grams: Math.max(0, Math.round(grams * 10) / 10),
    servingEquivalent: Math.round((grams / ingredient.servingG) * 10) / 10
  };
}

export function solveMix(input: SessionInput, targets: Targets, ingredients: Ingredient[] = defaultIngredients): BottleMix[] {
  const available = rankIngredients(
    ingredients.filter((ingredient) => input.availableIngredientIds.includes(ingredient.id))
  );
  const totalBottleVolume = input.bottles.count * input.bottles.volumeMl;
  const sessionHours = input.durationMin / 60;
  const totalCarbsTarget = targets.carbsGph * sessionHours;
  const totalSodiumTarget = targets.sodiumMgph * sessionHours;
  const bottleFluidCoverage = Math.min(totalBottleVolume, targets.fluidMlph * sessionHours);
  const bottleCarbCapacityAtEightPct = bottleFluidCoverage * 0.08;
  const plannedBottleCarbs = Math.min(totalCarbsTarget, bottleCarbCapacityAtEightPct);
  const plannedBottleSodium = Math.min(totalSodiumTarget, targets.sodiumMgph * (bottleFluidCoverage / targets.fluidMlph));

  const maltodextrin = getCarbIngredient(available, "maltodextrin", "powder");
  const fructose = getCarbIngredient(available, "fructose");
  const sugar = getCarbIngredient(available, "table-sugar");
  const drinkMix = getCarbIngredient(available, "drink-mix", "drink_mix");
  const salt = available.find((item) => item.kind === "salt");

  return Array.from({ length: input.bottles.count }, (_, index) => {
    const bottleShare = input.bottles.count > 0 ? 1 / input.bottles.count : 0;
    const bottleCarbs = plannedBottleCarbs * bottleShare;
    const bottleSodium = plannedBottleSodium * bottleShare;
    const lines: BottleIngredient[] = [];
    const notes: string[] = [];

    if (maltodextrin && fructose && bottleCarbs > 0) {
      const glucosePart = bottleCarbs * (1 / 1.8);
      const fructosePart = bottleCarbs * (0.8 / 1.8);
      lines.push(ingredientLine(maltodextrin, glucosePart / carbsPerGram(maltodextrin)));
      lines.push(ingredientLine(fructose, fructosePart / carbsPerGram(fructose)));
    } else if (sugar && maltodextrin && bottleCarbs > 0) {
      const sugarCarbs = bottleCarbs * 0.55;
      const maltCarbs = bottleCarbs - sugarCarbs;
      lines.push(ingredientLine(sugar, sugarCarbs / carbsPerGram(sugar)));
      lines.push(ingredientLine(maltodextrin, maltCarbs / carbsPerGram(maltodextrin)));
      notes.push("Sucrose contributes both glucose and fructose.");
    } else if (drinkMix && bottleCarbs > 0) {
      lines.push(ingredientLine(drinkMix, bottleCarbs / carbsPerGram(drinkMix)));
    } else if (sugar && bottleCarbs > 0) {
      lines.push(ingredientLine(sugar, bottleCarbs / carbsPerGram(sugar)));
    } else if (maltodextrin && bottleCarbs > 0) {
      lines.push(ingredientLine(maltodextrin, bottleCarbs / carbsPerGram(maltodextrin)));
      notes.push("Single-source glucose fuel: keep hourly intake conservative.");
    }

    if (salt && bottleSodium > 0) {
      lines.push(ingredientLine(salt, bottleSodium / sodiumPerGram(salt)));
    }

    const lineCarbs = lines.reduce((sum, line) => {
      const source = ingredients.find((item) => item.id === line.ingredientId);
      return sum + (source ? line.grams * carbsPerGram(source) : 0);
    }, 0);
    const lineSodium = lines.reduce((sum, line) => {
      const source = ingredients.find((item) => item.id === line.ingredientId);
      return sum + (source ? line.grams * sodiumPerGram(source) : 0);
    }, 0);

    return {
      bottleNumber: index + 1,
      volumeMl: input.bottles.volumeMl,
      concentrationPercent: Math.round((lineCarbs / input.bottles.volumeMl) * 1000) / 10,
      carbsG: Math.round(lineCarbs),
      sodiumMg: Math.round(lineSodium),
      ingredients: lines,
      notes
    };
  });
}

export function validatePlan(input: SessionInput, targets: Targets, bottles: BottleMix[]): Warning[] {
  const warnings: Warning[] = [];
  const maxConcentration = Math.max(0, ...bottles.map((bottle) => bottle.concentrationPercent));
  const hours = input.durationMin / 60;
  const bottleFluid = input.bottles.count * input.bottles.volumeMl;
  const targetFluid = targets.fluidMlph * hours;
  const bottleCarbs = bottles.reduce((sum, bottle) => sum + bottle.carbsG, 0);
  const targetCarbs = targets.carbsGph * hours;

  if (maxConcentration > 12) {
    warnings.push({
      level: "danger",
      code: "high_concentration",
      message: "Bottle concentration is above 12%. Treat it as concentrate and chase with water."
    });
  } else if (maxConcentration > 8) {
    warnings.push({
      level: "caution",
      code: "moderate_concentration",
      message: "Bottle concentration is above the usual 6-8% sports drink range."
    });
  }

  if (targets.carbsGph > 90) {
    warnings.push({
      level: input.gutTolerance === "trained" ? "caution" : "danger",
      code: "elite_carb_rate",
      message: "This carbohydrate rate belongs in trained race practice, not a first experiment."
    });
  }

  if (input.gutTolerance === "low" && targets.carbsGph >= 60) {
    warnings.push({
      level: "caution",
      code: "gut_training",
      message: "Low GI tolerance: build intake gradually by 10-15 g/h over repeated sessions."
    });
  }

  if (bottleFluid < targetFluid * 0.75) {
    warnings.push({
      level: "info",
      code: "limited_bottle_fluid",
      message: "Available bottles do not cover the full fluid target. Plan refills or additional water."
    });
  }

  if (bottleCarbs < targetCarbs * 0.85) {
    warnings.push({
      level: "info",
      code: "external_carbs_needed",
      message: "Bottles do not carry all planned carbohydrate. Add gels, chews, or food to the timeline."
    });
  }

  if (input.customCarbTargetGph && input.customCarbTargetGph > 90 && input.gutTolerance !== "trained") {
    warnings.push({
      level: "danger",
      code: "custom_target_high",
      message: "Custom carbohydrate target is very high for untrained gut tolerance."
    });
  }

  if (targets.sodiumMgph < 300 && input.durationMin >= 150) {
    warnings.push({
      level: "caution",
      code: "low_sodium",
      message: "Sodium target is low for a long session. Review sweat rate, heat, and salty-sweat history."
    });
  }

  if (targets.fluidMlph > 900) {
    warnings.push({
      level: "info",
      code: "avoid_overdrinking",
      message: "High fluid target: avoid drinking beyond sweat losses or persistent thirst."
    });
  }

  if (input.mode === "race") {
    warnings.push({
      level: "info",
      code: "race_no_new",
      message: "Race mode: use only products and concentrations tested in training."
    });
  }

  return warnings;
}

function formatMinute(minute: number) {
  if (minute < 0) return "Pre-Start";
  const hours = Math.floor(minute / 60);
  const mins = minute % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function productMatchesPreference(product: Ingredient, preference: SessionInput["preferredFuel"]) {
  if (preference === "drink") return product.kind === "drink_mix";
  if (preference === "chews") return product.id === "energy-chews" || product.kind === "food";
  if (preference === "mixed") return product.kind === "gel" || product.kind === "food" || product.kind === "drink_mix";
  return product.kind === "gel";
}

function chooseExternalFuel(input: SessionInput, ingredients: Ingredient[]) {
  const available = ingredients.filter((ingredient) => input.availableIngredientIds.includes(ingredient.id));
  const selected = available.find((ingredient) => ingredient.id === input.selectedFuelId);
  if (selected && selected.carbsPerServingG > 0) return selected;

  const preference = input.preferredFuel ?? "gels";
  return (
    available.find((ingredient) => productMatchesPreference(ingredient, preference) && ingredient.carbsPerServingG > 0) ??
    available.find((ingredient) => ingredient.kind === "gel") ??
    available.find((ingredient) => ingredient.carbsPerServingG > 0)
  );
}

export function buildExternalFuelPlan(
  input: SessionInput,
  ingredients: Ingredient[],
  externalCarbsG: number
): ExternalFuelPlan | undefined {
  if (externalCarbsG <= 0) return undefined;
  const product = chooseExternalFuel(input, ingredients);
  if (!product) {
    return {
      productName: "External fuel",
      servingsNeeded: 0,
      servingCarbsG: 0,
      servingSodiumMg: 0,
      waterPerServingMl: 150,
      totalCarbsG: externalCarbsG,
      totalSodiumMg: 0,
      note: "No external fuel product is selected. Add gels, chews, drink mix, or food to convert this into servings."
    };
  }

  const servingsNeeded = Math.ceil(externalCarbsG / product.carbsPerServingG);
  const waterPerServingMl = product.kind === "gel" || product.kind === "food" ? 150 : 0;
  const totalCaffeineMg = product.caffeineMgPerServing ? product.caffeineMgPerServing * servingsNeeded : undefined;

  return {
    productId: product.id,
    productName: product.name,
    servingsNeeded,
    servingCarbsG: product.carbsPerServingG,
    servingSodiumMg: product.sodiumMgPerServing,
    servingCaffeineMg: product.caffeineMgPerServing,
    waterPerServingMl,
    totalCarbsG: servingsNeeded * product.carbsPerServingG,
    totalSodiumMg: servingsNeeded * product.sodiumMgPerServing,
    totalCaffeineMg,
    note:
      product.kind === "gel"
        ? `Pack ${servingsNeeded} ${product.name}${servingsNeeded === 1 ? "" : "s"} and chase each with about ${waterPerServingMl} ml water.`
        : `Use ${servingsNeeded} serving${servingsNeeded === 1 ? "" : "s"} of ${product.name} outside the bottle mix.`
  };
}

export function buildFuelingSchedule(
  input: SessionInput,
  targets: Targets,
  externalFuelPlan: ExternalFuelPlan | undefined
): FuelingScheduleItem[] {
  const items: FuelingScheduleItem[] = [];
  const drinkInterval = input.sport === "run" ? 15 : 10;
  const sipMl = Math.round((targets.fluidMlph / (60 / drinkInterval)) / 5) * 5;

  for (let minute = drinkInterval; minute <= input.durationMin; minute += drinkInterval) {
    items.push({
      minute,
      timeLabel: formatMinute(minute),
      fuelSuggestion: `Drink about ${sipMl} ml from your planned bottles.`,
      plannedCarbsG: 0,
      fluidMl: sipMl,
      deliveredCarbsG: 0,
      sodiumMg: 0
    });
  }

  if (!externalFuelPlan || externalFuelPlan.servingsNeeded <= 0 || externalFuelPlan.servingCarbsG <= 0) {
    return items.sort((a, b) => a.minute - b.minute);
  }

  const preStart = input.mode === "race" && input.durationMin >= 90 ? 1 : 0;
  const duringServings = Math.max(0, externalFuelPlan.servingsNeeded - preStart);

  if (preStart) {
    items.push({
      minute: -1,
      timeLabel: "Pre-Start",
      fuelSuggestion: `Take 1 ${externalFuelPlan.productName} about 1-5 min before start.`,
      plannedCarbsG: externalFuelPlan.servingCarbsG,
      fluidMl: 0,
      deliveredCarbsG: externalFuelPlan.servingCarbsG,
      sodiumMg: externalFuelPlan.servingSodiumMg
    });
  }

  if (duringServings > 0) {
    const interval = Math.max(15, Math.floor(input.durationMin / duringServings));
    for (let index = 0; index < duringServings; index += 1) {
      const minute = Math.min(input.durationMin - 5, Math.max(15, Math.round((index + 1) * interval)));
      items.push({
        minute,
        timeLabel: formatMinute(minute),
        fuelSuggestion: `Take 1 ${externalFuelPlan.productName}${
          externalFuelPlan.waterPerServingMl ? ` + about ${externalFuelPlan.waterPerServingMl} ml water` : ""
        }.`,
        plannedCarbsG: externalFuelPlan.servingCarbsG,
        fluidMl: externalFuelPlan.waterPerServingMl,
        deliveredCarbsG: externalFuelPlan.servingCarbsG,
        sodiumMg: externalFuelPlan.servingSodiumMg
      });
    }
  }

  return items.sort((a, b) => a.minute - b.minute || b.deliveredCarbsG - a.deliveredCarbsG);
}

export function buildTimeline(input: SessionInput, targets: Targets, bottles: BottleMix[], warnings: Warning[]): TimelineItem[] {
  const items: TimelineItem[] = [];
  const drinkEvery = input.sport === "run" ? 15 : 10;
  const carbEvery = targets.carbsGph >= 75 ? 20 : 30;
  const sipMl = Math.round((targets.fluidMlph / (60 / drinkEvery)) / 5) * 5;
  const carbDose = Math.round((targets.carbsGph / (60 / carbEvery)) / 5) * 5;
  const minutes = input.durationMin;

  items.push({
    minute: 0,
    label: "Start",
    detail: "Begin fueled and euhydrated. Do not front-load the whole bottle.",
    kind: "drink"
  });

  for (let minute = drinkEvery; minute <= minutes; minute += drinkEvery) {
    items.push({
      minute,
      label: "Drink",
      detail: `Take about ${sipMl} ml.`,
      kind: "drink"
    });
  }

  for (let minute = carbEvery; minute <= minutes; minute += carbEvery) {
    items.push({
      minute,
      label: "Carbs",
      detail: `Target about ${carbDose} g carbohydrate in this feeding window.`,
      kind: "carb"
    });
  }

  bottles.forEach((bottle, index) => {
    const emptyAt = Math.round(((index + 1) / bottles.length) * minutes);
    items.push({
      minute: emptyAt,
      label: `Bottle ${bottle.bottleNumber}`,
      detail: `Bottle ${bottle.bottleNumber} should be empty near this point.`,
      kind: "bottle"
    });
  });

  warnings
    .filter((warning) => warning.level !== "info")
    .slice(0, 2)
    .forEach((warning) => {
      items.push({
        minute: 0,
        label: "Check",
        detail: warning.message,
        kind: "warning"
      });
    });

  return items.sort((a, b) => a.minute - b.minute || a.label.localeCompare(b.label));
}

function buildPlaybook(
  input: SessionInput,
  targets: Targets,
  externalFuelPlan: ExternalFuelPlan | undefined,
  bottles: BottleMix[]
) {
  const bottleCarbs = bottles.reduce((sum, bottle) => sum + bottle.carbsG, 0);
  const fluidDeficit = Math.max(0, Math.round(targets.fluidMlph * (input.durationMin / 60) - input.bottles.count * input.bottles.volumeMl));
  const maxConcentration = Math.max(0, ...bottles.map((bottle) => bottle.concentrationPercent));
  const notes = [
    `Bottle mix carries ${bottleCarbs} g carbohydrate; target intake is ${targets.carbsGph} g/h.`,
    `Use a ${targets.glucoseFructoseRatio} glucose:fructose strategy when intake is high.`
  ];

  if (externalFuelPlan) {
    notes.push(externalFuelPlan.note);
    notes.push(`After any pre-start serving, follow the schedule rather than waiting for hunger.`);
  }
  if (fluidDeficit > 0) notes.push(`Plan roughly ${fluidDeficit} ml additional water or refill access.`);
  if (maxConcentration > 8) notes.push(`Highest bottle concentration is ${maxConcentration}%; test this in training before race day.`);
  if (input.addSodiumSupplement) notes.push("Sodium supplement is enabled: monitor taste, thirst, and stomach feel.");
  if (input.includeCaffeineStrategy) notes.push("Caffeine strategy is enabled: keep total caffeine within your tested personal range.");
  if (input.useHomemadeDrink) notes.push("Homemade drink mode: weigh powders and salt; kitchen spoons are too imprecise for sodium.");

  return notes;
}

export function createRecommendation(input: SessionInput, ingredients: Ingredient[] = defaultIngredients): Recommendation {
  const targets = deriveTargets(input);
  const bottles = solveMix(input, targets, ingredients);
  const warnings = validatePlan(input, targets, bottles);
  const timeline = buildTimeline(input, targets, bottles, warnings);
  const hours = input.durationMin / 60;
  const bottleCarbs = bottles.reduce((sum, bottle) => sum + bottle.carbsG, 0);
  const externalCarbsG = Math.max(0, Math.round(targets.carbsGph * hours - bottleCarbs));
  const externalFuelPlan = buildExternalFuelPlan(input, ingredients, externalCarbsG);
  const fuelingSchedule = buildFuelingSchedule(input, targets, externalFuelPlan);
  const playbook = buildPlaybook(input, targets, externalFuelPlan, bottles);

  return {
    targets,
    bottles,
    timeline,
    fuelingSchedule,
    externalFuelPlan,
    playbook,
    warnings,
    summary: {
      totalCarbsG: Math.round(targets.carbsGph * hours),
      totalFluidMl: Math.round(targets.fluidMlph * hours),
      totalSodiumMg: Math.round(targets.sodiumMgph * hours),
      externalCarbsG
    }
  };
}
