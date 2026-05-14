export type Sport = "bike" | "run" | "triathlon" | "other";
export type Mode = "training" | "race";
export type Intensity = "easy" | "steady" | "tempo" | "threshold" | "race";
export type GutTolerance = "low" | "normal" | "trained";
export type FuelPreference = "gels" | "drink" | "mixed" | "chews";

export type CarbKind = "glucose" | "maltodextrin" | "fructose" | "sucrose" | "mixed";
export type IngredientKind = "powder" | "gel" | "drink_mix" | "tablet" | "salt" | "food";

export type Ingredient = {
  id: string;
  name: string;
  kind: IngredientKind;
  servingG: number;
  carbsPerServingG: number;
  carbFractions: Partial<Record<CarbKind, number>>;
  sodiumMgPerServing: number;
  caffeineMgPerServing?: number;
};

export type SessionInput = {
  sport: Sport;
  mode: Mode;
  durationMin: number;
  intensity: Intensity;
  temperatureC?: number;
  bodyMassKg?: number;
  bottles: { count: number; volumeMl: number };
  gutTolerance: GutTolerance;
  availableIngredientIds: string[];
  sweatRateLph?: number;
  sweatSodiumMgL?: number;
  customCarbTargetGph?: number;
  preferredFuel?: FuelPreference;
  selectedFuelId?: string;
  includeCaffeineStrategy?: boolean;
  useHomemadeDrink?: boolean;
  addSodiumSupplement?: boolean;
};

export type Targets = {
  carbsGph: number;
  fluidMlph: number;
  sodiumMgph: number;
  glucoseFructoseRatio: string;
};

export type BottleIngredient = {
  ingredientId: string;
  name: string;
  grams: number;
  servingEquivalent: number;
};

export type BottleMix = {
  bottleNumber: number;
  volumeMl: number;
  concentrationPercent: number;
  carbsG: number;
  sodiumMg: number;
  ingredients: BottleIngredient[];
  notes: string[];
};

export type TimelineItem = {
  minute: number;
  label: string;
  detail: string;
  kind: "drink" | "carb" | "bottle" | "warning" | "gel";
};

export type FuelingScheduleItem = {
  minute: number;
  timeLabel: string;
  fuelSuggestion: string;
  plannedCarbsG: number;
  fluidMl: number;
  deliveredCarbsG: number;
  sodiumMg: number;
};

export type ExternalFuelPlan = {
  productId?: string;
  productName: string;
  servingsNeeded: number;
  servingCarbsG: number;
  servingSodiumMg: number;
  servingCaffeineMg?: number;
  waterPerServingMl: number;
  totalCarbsG: number;
  totalSodiumMg: number;
  totalCaffeineMg?: number;
  note: string;
};

export type Warning = {
  level: "info" | "caution" | "danger";
  code: string;
  message: string;
};

export type Recommendation = {
  targets: Targets;
  bottles: BottleMix[];
  timeline: TimelineItem[];
  fuelingSchedule: FuelingScheduleItem[];
  externalFuelPlan?: ExternalFuelPlan;
  playbook: string[];
  warnings: Warning[];
  summary: {
    totalCarbsG: number;
    totalFluidMl: number;
    totalSodiumMg: number;
    externalCarbsG: number;
  };
};
