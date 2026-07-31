# Mutually Assured Representation

Interactive visualization tool to identify US states with equal and opposite gerrymandering that could form interstate de-escalation pacts.

## Tech Stack

- React 18 + TypeScript
- Vite for bundling
- D3.js for map visualization
- TopoJSON for US state boundaries

## Project Structure

There is no `public/` directory — every asset is imported, so Vite hashes it and fails the build if
it goes missing.

```
src/
├── App.tsx                  # Root component, manages state and layout
├── App.css                  # All styles
├── main.tsx                 # Entry point
├── components/              # All UI
│   ├── HeroMap.tsx          # D3-based interactive US map — clouds, pact badges and arcs
│   ├── StateTooltip.tsx     # Hover tooltip, driven by HeroMap
│   ├── BipartiteMatchGraph.tsx  # Two re-sorting columns of state boxes
│   ├── StatBar.tsx          # House balance + national rep. gap (sticky, above the map)
│   └── AnimatedCount.tsx    # Count-up number, used by StatBar and the match graph
├── data/                    # Data plus the math over it; nothing generated
│   ├── cook2026DistrictPVI.tsv  # 2026 Cook PVI, all 435 districts
│   ├── districtLeans.ts     # Parses that file into per-state + national seat counts
│   ├── stateData.ts         # 50 states: Cook PVI, seat count, map-drawing authority
│   └── computeRepresentationGap.ts # Per-state gaps, pact math, national total
├── map/                     # Map geometry and its assets
│   ├── useTopoData.ts       # Fetches the topology (null until it lands)
│   ├── fipsMapping.ts       # FIPS code → state abbreviation, for the TopoJSON
│   ├── us-states-10m.json   # TopoJSON state boundaries — imported `?url`, never inlined
│   └── mushroom-cloud.png   # Cloud icon sized by representation gap
└── types.ts                 # TypeScript interfaces
```

`HeroMap` and `StateTooltip` are the only consumers of `src/map/`, but they live with the other
components rather than beside the geometry they draw.

The topology is imported as `./us-states-10m.json?url` — a plain JSON import would inline all 112 KB
into the JS bundle, which is what `?url` plus the runtime fetch exists to avoid. Keep the suffix.

## Key Concepts

- **Partisan Lean**: State's statewide Cook PVI, signed positive for D.
- **Representation Gap**: A state's enacted R seats (districts whose own Cook PVI leans R) minus the
  proportional ideal implied by its statewide PVI, `round(districts × (50 − statePVI) / 100)`.
  Positive = R overrepresented, negative = D overrepresented. Both sides come from Cook PVI, so
  they're measured on the same scale.
- **Pacts**: A pact between two oppositely-gerrymandered states unwinds the **lesser** of their two
  gaps in *both* states, so its national effect is `2 × min(|gapA|, |gapB|)`. Whatever gap survives
  stays on the map. Because each side returns the same number of seats, a pact never changes the
  national party balance — only the gap closes.
- **MAR Matching**: The user pairs states manually. Clicking a state re-ranks the opposite
  column by closest representation gap, breaking ties on closest delegation size. Columns are split
  by the state's own partisan lean, because the signatory is the state government, not the
  congressional delegation. A state whose map favors the party it doesn't lean toward (Nevada is
  R+1 but D-gerrymandered) therefore sits in the column opposite its gerrymander; `pactSeatsReturned`
  returns 0 for such a pairing rather than letting both partners hand seats to the same party.

## Commands

```bash
npm run dev      # Start dev server
npm run build    # Type-check and build for production
npm run preview  # Preview production build
```

## Data Sources

Everything partisan comes from Cook PVI. See the root `README.md` for the full breakdown — it is the
only README in the repo; don't add per-folder ones.

- **District leans**: [2026 Cook PVI](https://www.cookpolitical.com/cook-pvi/2026-partisan-voting-index/district-map-and-list)
  → `data/cook2026DistrictPVI.tsv` (tab-separated with a header row; the app reads the `2026 PVI`
  column and skips the header).
- **State leans**: statewide Cook PVI, stored as `partisanLean` in `data/stateData.ts`.
  Redistricting doesn't move a statewide PVI, so the 2026 release left these unchanged.

Both files are hand-edited; the `stateData.csv` → `stateData.ts` generation step and the PlanScore
verification script are gone.

`stateData.ts` also carries map-drawing fields with no runtime reader yet — `districts2032`,
`stateControl`, `redistrictingAuthority`, `governorCanVeto`, `hasBallotInitiative`. Keep them: a pact
has to survive whoever holds the pen. `efficiencyGap` is deliberately *not* among them, since it came
from the PlanScore methodology the representation gap replaced.

The DRA and ALARM alternate maps were removed: the proportional ideal is now derived from each state's
own PVI, so there is no hypothetical map to compare against. Cook's site blocks scripted fetches, so
refreshing district data means pasting a new export into `data/cook2026DistrictPVI.tsv` by hand,
keeping the header row and column order.
