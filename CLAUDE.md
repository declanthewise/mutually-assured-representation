# Mutually Assured Representation

Interactive visualization tool to identify US states with equal and opposite gerrymandering that could form interstate de-escalation pacts.

## Tech Stack

- React 18 + TypeScript
- Vite for bundling
- D3.js for map visualization
- TopoJSON for US state boundaries

## Project Structure

```
src/
├── App.tsx                  # Root component, manages state and layout
├── App.css                  # All styles
├── main.tsx                 # Entry point
├── components/
│   ├── HeroMap.tsx          # D3-based interactive US map (main view)
│   ├── ResultMap.tsx        # Map showing truce results
│   ├── BipartiteMatchGraph.tsx  # Match graph visualization
│   ├── RatingsBar.tsx       # Seat count bar chart
│   ├── StateTooltip.tsx     # Hover tooltip on map
│   └── Legend.tsx           # Efficiency gap color legend
├── data/
│   ├── stateData/           # State-level data
│   │   ├── stateData.ts     # All 50 states' metrics
│   │   ├── stateData.csv    # Raw state data
│   │   ├── districtGroups.ts    # Groups states by district count
│   │   └── csv-to-statedata.cjs # Script: CSV → stateData.ts
│   └── districtData/        # District-level PVI data
│       ├── safeSeats.ts     # Shared types + safe-seat categorization
│       ├── alternateMapPVIs.ts  # Indirection: swap active alternate map here
│       ├── enacted/         # Current enacted maps
│       ├── compact/         # ALARM compact maps
│       ├── competitive/     # DRA most-competitive maps
│       └── proportional/    # DRA most-proportional maps [ACTIVE alternate]
├── types/
│   └── index.ts             # TypeScript interfaces
└── utils/
    ├── findMatches.ts       # MAR matching algorithm
    └── computeTruceAdjustment.ts  # Truce seat adjustment
```

## Key Concepts

- **Efficiency Gap**: Measures wasted votes. Positive = R advantage, negative = D advantage.
- **Partisan Lean**: State's overall partisan lean from presidential vote share.
- **MAR Matching**: States match if they have opposite efficiency gaps, similar district counts (±25%), and similar seats impact (±1 seat).

## Commands

```bash
npm run dev      # Start dev server
npm run build    # Type-check and build for production
npm run preview  # Preview production build
```

## Data Sources

Each `districtData/` subfolder contains its data CSV, loader `.ts`, processing script, and raw inputs (if any). Scripts live alongside the data they produce.

- **Enacted**: PlanScore district-level results (`planscore-raw-data.tsv`) → `districtPVI.csv`
- **Compact**: ALARM Project 50-State Simulations → `alarmCompactMaps.csv` (via `fetch-alarm-data.cjs`)
- **Competitive**: DRA most-competitive maps → `draCompetitiveMaps.csv` (via `consolidate-dra-competitive.cjs`)
- **Proportional**: DRA most-proportional maps → `draProportionalMaps.csv` (via `consolidate-dra-proportional.cjs`)

To switch the active alternate map, change one import line in `src/data/districtData/alternateMapPVIs.ts`.
