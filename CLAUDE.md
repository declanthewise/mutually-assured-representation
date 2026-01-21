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
├── App.tsx              # Root component, manages state and layout
├── App.css              # All styles
├── main.tsx             # Entry point
├── components/
│   ├── USMap.tsx        # D3-based interactive US map
│   ├── MatchPanel.tsx   # Sidebar showing MAR partners
│   ├── StateTable.tsx   # Sortable data table view
│   ├── StateTooltip.tsx # Hover tooltip on map
│   └── Legend.tsx       # Efficiency gap color legend
├── data/
│   └── stateData.ts     # All 50 states' metrics
├── types/
│   └── index.ts         # TypeScript interfaces
└── utils/
    └── findMatches.ts   # MAR matching algorithm
scripts/
└── calculate-metrics.cjs  # Verify efficiency gap & partisan lean calculations
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

## Data Source

Raw election data from [PlanScore](https://github.com/PlanScore/National-EG-Map). The `planscore-raw-data.tsv` file contains district-level results used to calculate efficiency gap and partisan lean.
