"use client";

import { Bike, Clock, Droplet, FlaskConical, Flame, Save, ShieldAlert, Thermometer, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createRecommendation } from "@/lib/fueling-core";
import type { Ingredient, Recommendation, SessionInput } from "@/lib/types";
import { deletePreset, listPresets, savePreset, type PlannerPreset } from "@/lib/preset-db";
import { Badge, Button, Card, Field } from "./ui";

const defaultInput: SessionInput = {
  sport: "bike",
  mode: "training",
  durationMin: 180,
  intensity: "tempo",
  temperatureC: 20,
  bottles: { count: 2, volumeMl: 750 },
  gutTolerance: "normal",
  availableIngredientIds: ["maltodextrin", "fructose", "table-salt", "maurten-gel-100", "standard-gel"],
  preferredFuel: "gels",
  selectedFuelId: "maurten-gel-100",
  includeCaffeineStrategy: false,
  useHomemadeDrink: false,
  addSodiumSupplement: false
};

function toNumber(value: FormDataEntryValue | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function warningTone(level: string) {
  if (level === "danger") return "danger";
  if (level === "caution") return "warn";
  return "neutral";
}

export function FuelingPlanner({ ingredients }: { ingredients: Ingredient[] }) {
  const [input, setInput] = useState<SessionInput>(defaultInput);
  const [activeTab, setActiveTab] = useState<"plan" | "mix" | "schedule" | "timeline" | "playbook">("plan");
  const [presets, setPresets] = useState<PlannerPreset[]>([]);
  const [presetName, setPresetName] = useState("Long ride");

  const recommendation: Recommendation = useMemo(() => createRecommendation(input, ingredients), [input, ingredients]);

  useEffect(() => {
    listPresets().then(setPresets).catch(() => setPresets([]));
  }, []);

  function updateFromForm(formData: FormData) {
    const availableIngredientIds = ingredients
      .filter((ingredient) => formData.get(`ingredient-${ingredient.id}`) === "on")
      .map((ingredient) => ingredient.id);

    setInput({
      sport: String(formData.get("sport")) as SessionInput["sport"],
      mode: String(formData.get("mode")) as SessionInput["mode"],
      durationMin: toNumber(formData.get("durationMin"), defaultInput.durationMin),
      intensity: String(formData.get("intensity")) as SessionInput["intensity"],
      temperatureC: toNumber(formData.get("temperatureC"), 20),
      bottles: {
        count: toNumber(formData.get("bottleCount"), 2),
        volumeMl: toNumber(formData.get("bottleVolume"), 750)
      },
      gutTolerance: String(formData.get("gutTolerance")) as SessionInput["gutTolerance"],
      availableIngredientIds,
      customCarbTargetGph: formData.get("customCarbTargetGph") ? toNumber(formData.get("customCarbTargetGph"), 0) : undefined,
      preferredFuel: String(formData.get("preferredFuel")) as SessionInput["preferredFuel"],
      selectedFuelId: String(formData.get("selectedFuelId") || ""),
      includeCaffeineStrategy: formData.get("includeCaffeineStrategy") === "on",
      useHomemadeDrink: formData.get("useHomemadeDrink") === "on",
      addSodiumSupplement: formData.get("addSodiumSupplement") === "on",
      sweatRateLph: formData.get("sweatRateLph") ? toNumber(formData.get("sweatRateLph"), 0.8) : undefined,
      sweatSodiumMgL: formData.get("sweatSodiumMgL") ? toNumber(formData.get("sweatSodiumMgL"), 800) : undefined
    });
  }

  async function handleSavePreset() {
    const saved = await savePreset(presetName || "Fueling preset", input);
    setPresets([saved, ...presets]);
  }

  async function handleDeletePreset(id: string) {
    await deletePreset(id);
    setPresets(presets.filter((preset) => preset.id !== id));
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Evidence-informed endurance planning</p>
          <h1>Fueling Planner</h1>
          <p className="lede">
            Build bottle mixes, hourly targets, and intake timing from sport, duration, intensity,
            heat, GI tolerance, and what is actually in your kitchen.
          </p>
        </div>
        <div className="hero-metrics" aria-label="Current recommendation summary">
          <span><Flame size={18} /> {recommendation.targets.carbsGph} g/h carbs</span>
          <span><Droplet size={18} /> {recommendation.targets.fluidMlph} ml/h fluid</span>
          <span><ShieldAlert size={18} /> {recommendation.targets.sodiumMgph} mg/h sodium</span>
        </div>
      </section>

      <section className="planner-grid">
        <Card className="input-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Quick input</p>
              <h2>Session</h2>
            </div>
            <Bike size={22} />
          </div>

          <form key={JSON.stringify(input)} action={updateFromForm} className="form-grid">
            <Field label="Sport">
              <select name="sport" defaultValue={input.sport}>
                <option value="bike">Bike</option>
                <option value="run">Run</option>
                <option value="triathlon">Triathlon</option>
                <option value="other">Other endurance</option>
              </select>
            </Field>
            <Field label="Mode">
              <select name="mode" defaultValue={input.mode}>
                <option value="training">Training</option>
                <option value="race">Race</option>
              </select>
            </Field>
            <Field label="Duration min">
              <input name="durationMin" type="number" min="15" max="1440" defaultValue={input.durationMin} />
            </Field>
            <Field label="Intensity">
              <select name="intensity" defaultValue={input.intensity}>
                <option value="easy">Easy</option>
                <option value="steady">Steady</option>
                <option value="tempo">Tempo</option>
                <option value="threshold">Threshold</option>
                <option value="race">Race effort</option>
              </select>
            </Field>
            <Field label="Temperature C">
              <input name="temperatureC" type="number" min="-20" max="55" defaultValue={input.temperatureC} />
            </Field>
            <Field label="GI tolerance">
              <select name="gutTolerance" defaultValue={input.gutTolerance}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="trained">Trained</option>
              </select>
            </Field>
            <Field label="Custom carbs g/h">
              <input
                name="customCarbTargetGph"
                type="number"
                min="0"
                max="130"
                placeholder="Leave blank"
                defaultValue={input.customCarbTargetGph ?? ""}
              />
            </Field>
            <Field label="Preferred fuel">
              <select name="preferredFuel" defaultValue={input.preferredFuel ?? "gels"}>
                <option value="gels">Gels</option>
                <option value="drink">Drink</option>
                <option value="mixed">Mixed</option>
                <option value="chews">Chews / bars</option>
              </select>
            </Field>
            <Field label="Fuel product">
              <select name="selectedFuelId" defaultValue={input.selectedFuelId ?? "standard-gel"}>
                {ingredients
                  .filter((ingredient) => ingredient.carbsPerServingG > 0)
                  .map((ingredient) => (
                    <option key={ingredient.id} value={ingredient.id}>
                      {ingredient.name} ({ingredient.carbsPerServingG} g C / {ingredient.sodiumMgPerServing} mg Na)
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Bottles">
              <input name="bottleCount" type="number" min="0" max="12" defaultValue={input.bottles.count} />
            </Field>
            <Field label="Bottle ml">
              <input name="bottleVolume" type="number" min="100" max="2000" defaultValue={input.bottles.volumeMl} />
            </Field>
            <Field label="Sweat L/h">
              <input name="sweatRateLph" type="number" min="0.1" max="4" step="0.1" placeholder="optional" />
            </Field>
            <Field label="Sweat sodium mg/L">
              <input name="sweatSodiumMgL" type="number" min="100" max="2500" placeholder="optional" />
            </Field>

            <div className="strategy-list">
              <label className="toggle-row">
                <span>Include caffeine strategy</span>
                <input name="includeCaffeineStrategy" type="checkbox" defaultChecked={input.includeCaffeineStrategy} />
              </label>
              <label className="toggle-row">
                <span>Use homemade sports drink</span>
                <input name="useHomemadeDrink" type="checkbox" defaultChecked={input.useHomemadeDrink} />
              </label>
              <label className="toggle-row">
                <span>Add sodium supplement</span>
                <input name="addSodiumSupplement" type="checkbox" defaultChecked={input.addSodiumSupplement} />
              </label>
            </div>

            <div className="ingredient-list">
              <p className="field-title">Available ingredients</p>
              {ingredients.map((ingredient) => (
                <label key={ingredient.id} className="check-row">
                  <input
                    name={`ingredient-${ingredient.id}`}
                    type="checkbox"
                    defaultChecked={input.availableIngredientIds.includes(ingredient.id)}
                  />
                  <span>{ingredient.name}</span>
                </label>
              ))}
            </div>

            <Button className="full-width" type="submit">
              <FlaskConical size={18} /> Generate plan
            </Button>
          </form>
        </Card>

        <section className="results-panel">
          <Card>
            <div className="section-heading">
              <div>
                <p className="eyebrow">Targets</p>
                <h2>Per hour</h2>
              </div>
              <Thermometer size={22} />
            </div>
            <div className="target-grid">
              <div><strong>{recommendation.targets.carbsGph} g</strong><span>Carbs</span></div>
              <div><strong>{recommendation.targets.fluidMlph} ml</strong><span>Fluid</span></div>
              <div><strong>{recommendation.targets.sodiumMgph} mg</strong><span>Sodium</span></div>
              <div><strong>{recommendation.targets.glucoseFructoseRatio}</strong><span>Glucose:fructose</span></div>
            </div>
            {recommendation.externalFuelPlan && (
              <div className="external-banner">
                <strong>{recommendation.externalFuelPlan.servingsNeeded}x {recommendation.externalFuelPlan.productName}</strong>
                <span>
                  covers {recommendation.externalFuelPlan.totalCarbsG} g external carbs
                  {recommendation.externalFuelPlan.waterPerServingMl
                    ? ` + ${recommendation.externalFuelPlan.waterPerServingMl} ml water each`
                    : ""}
                </span>
              </div>
            )}
          </Card>

          <Card>
            <div className="tabs" role="tablist" aria-label="Recommendation views">
              {(["plan", "mix", "schedule", "timeline", "playbook"] as const).map((tab) => (
                <button
                  key={tab}
                  className={activeTab === tab ? "tab active" : "tab"}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === "plan" && (
              <div className="stack">
                <div className="summary-row">
                  <span>Total carbs</span>
                  <strong>{recommendation.summary.totalCarbsG} g</strong>
                </div>
                <div className="summary-row">
                  <span>Total fluid</span>
                  <strong>{recommendation.summary.totalFluidMl} ml</strong>
                </div>
                <div className="summary-row">
                  <span>External carbs</span>
                  <strong>{recommendation.summary.externalCarbsG} g</strong>
                </div>
                {recommendation.externalFuelPlan && (
                  <>
                    <div className="summary-row">
                      <span>Extra servings</span>
                      <strong>{recommendation.externalFuelPlan.servingsNeeded}x</strong>
                    </div>
                    <div className="summary-row">
                      <span>Extra sodium</span>
                      <strong>{recommendation.externalFuelPlan.totalSodiumMg} mg</strong>
                    </div>
                  </>
                )}
                <div className="warning-list">
                  {recommendation.warnings.map((warning) => (
                    <div className="warning" key={warning.code}>
                      <Badge tone={warningTone(warning.level)}>{warning.level}</Badge>
                      <span>{warning.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "schedule" && (
              <div className="schedule-wrap">
                <div className="visual-timeline" aria-label="Visual fueling timeline">
                  <div className="timeline-line" />
                  {recommendation.fuelingSchedule
                    .filter((item) => item.deliveredCarbsG > 0 || item.minute === -1)
                    .map((item, index) => (
                      <span
                        key={`${item.timeLabel}-${index}`}
                        className={item.minute < 0 ? "timeline-dot pre" : "timeline-dot"}
                        style={{ left: `${item.minute < 0 ? 2 : Math.min(98, Math.max(2, (item.minute / input.durationMin) * 100))}%` }}
                        title={item.fuelSuggestion}
                      >
                        <Flame size={13} />
                      </span>
                    ))}
                </div>
                <div className="schedule-table">
                  <div className="schedule-head">
                    <span>Time</span>
                    <span>Fuel suggestion</span>
                    <span>Carbs</span>
                    <span>Fluid</span>
                    <span>Sodium</span>
                  </div>
                  {recommendation.fuelingSchedule
                    .filter((item) => item.deliveredCarbsG > 0)
                    .map((item, index) => (
                      <div className="schedule-row" key={`${item.timeLabel}-${index}`}>
                        <span>{item.timeLabel}</span>
                        <strong>{item.fuelSuggestion}</strong>
                        <span>{item.deliveredCarbsG} g</span>
                        <span>{item.fluidMl} ml</span>
                        <span>{item.sodiumMg} mg</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {activeTab === "mix" && (
              <div className="bottle-list">
                {recommendation.bottles.map((bottle) => (
                  <article className="bottle" key={bottle.bottleNumber}>
                    <div className="bottle-head">
                      <strong>Flasche {bottle.bottleNumber}</strong>
                      <Badge tone={bottle.concentrationPercent > 8 ? "warn" : "good"}>{bottle.concentrationPercent}%</Badge>
                    </div>
                    <p>{bottle.carbsG} g carbs, {bottle.sodiumMg} mg sodium, fill to {bottle.volumeMl} ml.</p>
                    <ul>
                      {bottle.ingredients.map((ingredient) => (
                        <li key={ingredient.ingredientId}>
                          {ingredient.grams} g {ingredient.name} ({ingredient.servingEquivalent} servings)
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            )}

            {activeTab === "timeline" && (
              <ol className="timeline">
                {recommendation.timeline.map((item, index) => (
                  <li key={`${item.minute}-${item.kind}-${index}`}>
                    <span className="time"><Clock size={14} /> {item.minute} min</span>
                    <div>
                      <strong>{item.label}</strong>
                      <p>{item.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}

            {activeTab === "playbook" && (
              <div className="playbook">
                {recommendation.playbook.map((note, index) => (
                  <div className="playbook-item" key={note}>
                    <Badge tone={index === 0 ? "good" : "neutral"}>{index + 1}</Badge>
                    <p>{note}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <div className="section-heading">
              <div>
                <p className="eyebrow">Local-first</p>
                <h2>Presets</h2>
              </div>
              <Save size={22} />
            </div>
            <div className="preset-form">
              <input value={presetName} onChange={(event) => setPresetName(event.target.value)} aria-label="Preset name" />
              <Button type="button" onClick={handleSavePreset}>Save</Button>
            </div>
            <div className="preset-list">
              {presets.map((preset) => (
                <div className="preset" key={preset.id}>
                  <button type="button" onClick={() => setInput(preset.input)}>{preset.name}</button>
                  <button type="button" aria-label={`Delete ${preset.name}`} onClick={() => handleDeletePreset(preset.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {presets.length === 0 && <p className="muted">No saved presets yet.</p>}
            </div>
          </Card>
        </section>
      </section>
    </main>
  );
}
