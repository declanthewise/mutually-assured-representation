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
│   ├── HeroMap.tsx          # D3-based interactive US map — clouds, pact badges and arcs
│   ├── BipartiteMatchGraph.tsx  # Two re-sorting columns of state boxes
│   ├── RatingsBar.tsx       # Seat count bar chart (sticky, above the map)
│   ├── StateTooltip.tsx     # Hover tooltip on map
│   └── AnimatedCount.tsx    # Shared count-up number
├── data/
│   ├── stateData/           # State-level data
│   │   ├── stateData.ts     # All 50 states' metrics
│   │   ├── stateData.csv    # Raw state data
│   │   ├── districtGroups.ts    # Groups states by district count
│   │   └── csv-to-statedata.cjs # Script: CSV → stateData.ts
│   └── districtData/        # District-level lean data
│       ├── safeSeats.ts     # Shared types + safe-seat categorization
│       ├── alternateMapLeans.ts  # Indirection: swap active alternate map here
│       ├── enacted/         # Current enacted maps
│       ├── compact/         # ALARM compact maps
│       ├── competitive/     # DRA most-competitive maps
│       └── proportional/    # DRA most-proportional maps [ACTIVE alternate]
├── types/
│   └── index.ts             # TypeScript interfaces
└── utils/
    ├── minoritySeatGain.ts  # Seats the alternate map returns to the minority party
    ├── computeRepresentationGap.ts # Per-state and national representation gap
    └── computeTruceAdjustment.ts   # Truce seat adjustment
```

## Key Concepts

- **Efficiency Gap**: Measures wasted votes. Positive = R advantage, negative = D advantage.
- **Partisan Lean**: State's overall partisan lean from presidential vote share.
- **Representation Gap**: Seats the enacted map denies the minority party, versus the alternate map.
- **MAR Matching**: The user pairs states manually. Clicking a state re-ranks the opposite
  column by closest representation gap, breaking ties on closest delegation size.

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

To switch the active alternate map, change one import line in `src/data/districtData/alternateMapLeans.ts`.
