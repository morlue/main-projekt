import { describe, expect, it } from "vitest";
import { createRecommendation, deriveTargets } from "./fueling-core";
import type { SessionInput } from "./types";

const baseInput: SessionInput = {
  sport: "bike",
  mode: "training",
  durationMin: 180,
  intensity: "tempo",
  temperatureC: 20,
  bottles: { count: 2, volumeMl: 750 },
  gutTolerance: "normal",
  availableIngredientIds: ["maltodextrin", "fructose", "table-salt", "standard-gel"]
};

describe("fueling target derivation", () => {
  it("sets a lower carbohydrate target for a 90-minute easy run than a long race ride", () => {
    const run = deriveTargets({
      ...baseInput,
      sport: "run",
      durationMin: 90,
      intensity: "easy",
      mode: "training"
    });
    const ride = deriveTargets({
      ...baseInput,
      sport: "bike",
      durationMin: 240,
      intensity: "race",
      mode: "race",
      gutTolerance: "trained"
    });

    expect(run.carbsGph).toBeLessThan(ride.carbsGph);
    expect(run.carbsGph).toBeLessThanOrEqual(35);
    expect(ride.carbsGph).toBeGreaterThanOrEqual(90);
  });

  it("keeps a three-hour bike race with normal tolerance in the 60-90 g/h band", () => {
    const targets = deriveTargets({
      ...baseInput,
      durationMin: 180,
      mode: "race",
      intensity: "race"
    });

    expect(targets.carbsGph).toBeGreaterThanOrEqual(60);
    expect(targets.carbsGph).toBeLessThanOrEqual(90);
  });

  it("reduces targets for low GI tolerance and adds gut training warning", () => {
    const recommendation = createRecommendation({
      ...baseInput,
      gutTolerance: "low",
      mode: "race",
      intensity: "race",
      durationMin: 240
    });

    expect(recommendation.targets.carbsGph).toBeLessThan(90);
    expect(recommendation.warnings.some((warning) => warning.code === "gut_training")).toBe(true);
  });
});

describe("fueling solver", () => {
  it("uses maltodextrin, fructose, and salt when available", () => {
    const recommendation = createRecommendation(baseInput);
    const ingredientIds = recommendation.bottles.flatMap((bottle) =>
      bottle.ingredients.map((ingredient) => ingredient.ingredientId)
    );

    expect(ingredientIds).toContain("maltodextrin");
    expect(ingredientIds).toContain("fructose");
    expect(ingredientIds).toContain("table-salt");
  });

  it("warns when bottle capacity cannot carry all carbohydrate", () => {
    const recommendation = createRecommendation({
      ...baseInput,
      durationMin: 300,
      mode: "race",
      intensity: "race",
      bottles: { count: 1, volumeMl: 500 }
    });

    expect(recommendation.summary.externalCarbsG).toBeGreaterThan(0);
    expect(recommendation.warnings.some((warning) => warning.code === "external_carbs_needed")).toBe(true);
  });

  it("treats sucrose as a usable mixed carbohydrate source", () => {
    const recommendation = createRecommendation({
      ...baseInput,
      availableIngredientIds: ["table-sugar", "table-salt"],
      durationMin: 120
    });

    expect(recommendation.bottles[0].ingredients.some((ingredient) => ingredient.ingredientId === "table-sugar")).toBe(true);
  });
});
