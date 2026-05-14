"use client";

import Dexie, { type Table } from "dexie";
import type { SessionInput } from "./types";

export type PlannerPreset = {
  id: string;
  name: string;
  input: SessionInput;
  createdAt: string;
};

class FuelingPlannerDb extends Dexie {
  presets!: Table<PlannerPreset, string>;

  constructor() {
    super("fueling-planner");
    this.version(1).stores({
      presets: "id, name, createdAt"
    });
  }
}

let db: FuelingPlannerDb | null = null;

function getDb() {
  if (!db) db = new FuelingPlannerDb();
  return db;
}

export async function savePreset(name: string, input: SessionInput) {
  const preset: PlannerPreset = {
    id: crypto.randomUUID(),
    name,
    input,
    createdAt: new Date().toISOString()
  };
  await getDb().presets.put(preset);
  return preset;
}

export async function listPresets() {
  return getDb().presets.orderBy("createdAt").reverse().toArray();
}

export async function deletePreset(id: string) {
  await getDb().presets.delete(id);
}
