import type { Ingredient } from "./types";

export const defaultIngredients: Ingredient[] = [
  {
    id: "maltodextrin",
    name: "Maltodextrin",
    kind: "powder",
    servingG: 30,
    carbsPerServingG: 30,
    carbFractions: { maltodextrin: 1 },
    sodiumMgPerServing: 0
  },
  {
    id: "fructose",
    name: "Fructose",
    kind: "powder",
    servingG: 20,
    carbsPerServingG: 20,
    carbFractions: { fructose: 1 },
    sodiumMgPerServing: 0
  },
  {
    id: "table-sugar",
    name: "Table sugar / sucrose",
    kind: "powder",
    servingG: 30,
    carbsPerServingG: 30,
    carbFractions: { sucrose: 1 },
    sodiumMgPerServing: 0
  },
  {
    id: "glucose",
    name: "Dextrose / glucose",
    kind: "powder",
    servingG: 30,
    carbsPerServingG: 30,
    carbFractions: { glucose: 1 },
    sodiumMgPerServing: 0
  },
  {
    id: "table-salt",
    name: "Table salt",
    kind: "salt",
    servingG: 1,
    carbsPerServingG: 0,
    carbFractions: {},
    sodiumMgPerServing: 393
  },
  {
    id: "sodium-citrate",
    name: "Sodium citrate",
    kind: "salt",
    servingG: 1,
    carbsPerServingG: 0,
    carbFractions: {},
    sodiumMgPerServing: 234
  },
  {
    id: "standard-gel",
    name: "Standard gel",
    kind: "gel",
    servingG: 40,
    carbsPerServingG: 25,
    carbFractions: { mixed: 1 },
    sodiumMgPerServing: 50
  },
  {
    id: "maurten-gel-100",
    name: "Maurten Gel 100",
    kind: "gel",
    servingG: 40,
    carbsPerServingG: 25,
    carbFractions: { mixed: 1 },
    sodiumMgPerServing: 34
  },
  {
    id: "caffeine-gel",
    name: "Caffeine gel",
    kind: "gel",
    servingG: 40,
    carbsPerServingG: 25,
    carbFractions: { mixed: 1 },
    sodiumMgPerServing: 50,
    caffeineMgPerServing: 50
  },
  {
    id: "energy-chews",
    name: "Energy chews",
    kind: "food",
    servingG: 45,
    carbsPerServingG: 30,
    carbFractions: { mixed: 1 },
    sodiumMgPerServing: 70
  },
  {
    id: "drink-mix",
    name: "Commercial drink mix",
    kind: "drink_mix",
    servingG: 40,
    carbsPerServingG: 35,
    carbFractions: { mixed: 1 },
    sodiumMgPerServing: 300
  },
  {
    id: "banana",
    name: "Banana",
    kind: "food",
    servingG: 120,
    carbsPerServingG: 27,
    carbFractions: { mixed: 1 },
    sodiumMgPerServing: 1
  }
];
