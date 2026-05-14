import { z } from "zod";

export const sessionInputSchema = z.object({
  sport: z.enum(["bike", "run", "triathlon", "other"]),
  mode: z.enum(["training", "race"]),
  durationMin: z.number().min(15).max(1440),
  intensity: z.enum(["easy", "steady", "tempo", "threshold", "race"]),
  temperatureC: z.number().min(-20).max(55).optional(),
  bodyMassKg: z.number().min(30).max(200).optional(),
  bottles: z.object({
    count: z.number().int().min(0).max(12),
    volumeMl: z.number().min(100).max(2000)
  }),
  gutTolerance: z.enum(["low", "normal", "trained"]),
  availableIngredientIds: z.array(z.string()).min(0),
  sweatRateLph: z.number().min(0.1).max(4).optional(),
  sweatSodiumMgL: z.number().min(100).max(2500).optional(),
  customCarbTargetGph: z.number().min(0).max(130).optional(),
  preferredFuel: z.enum(["gels", "drink", "mixed", "chews"]).optional(),
  selectedFuelId: z.string().optional(),
  includeCaffeineStrategy: z.boolean().optional(),
  useHomemadeDrink: z.boolean().optional(),
  addSodiumSupplement: z.boolean().optional()
});

export const presetSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(80),
  input: sessionInputSchema
});
