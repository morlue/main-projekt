# Fueling Hydration Planner

Mobile-first web app for evidence-informed endurance fueling and hydration plans.

## What it does

- derives hourly carbohydrate, fluid, sodium, and glucose/fructose targets
- combines available ingredients into bottle mixes
- flags GI, sodium, concentration, and race-day risks
- builds a drink/carb/bottle-empty timeline
- stores session presets locally in IndexedDB

## Run

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Test

```bash
npm test
```

## Core files

- `src/lib/fueling-core.ts`: deterministic recommendation engine
- `src/lib/types.ts`: public data model
- `src/lib/ingredients.ts`: default ingredient catalog
- `src/app/api/recommendation/route.ts`: recommendation API
- `src/components/FuelingPlanner.tsx`: mobile-first planner UI
