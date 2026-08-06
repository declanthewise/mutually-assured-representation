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
│   ├── stateData.ts         # 50 states: 2025 Cook PVI, seat count, map-drawing authority
│   └── computeRepresentationGap.ts # Per-state gaps, pact math, national total
├── map/                     # Map geometry and its assets
│   ├── useTopoData.ts       # Fetches the topology (null until it lands)
│   ├── fipsMapping.ts       # FIPS code → state abbreviation, for the TopoJSON
│   ├── us-states-10m.json   # TopoJSON state boundaries — imported `?url`, never inlined
│   └── mushroom-cloud.png   # Cloud icon sized by representation gap
├── colors.ts                # The whole palette; every component imports from here
└── types.ts                 # TypeScript interfaces

scripts/                     # Dev tooling. Type-checked by `npm run build`, never bundled
└── checkBranchControl.ts    # Reports where Open States disagrees with stateData; never writes
```

`HeroMap` and `StateTooltip` are the only consumers of `src/map/`, but they live with the other
components rather than beside the geometry they draw.

The topology is imported as `./us-states-10m.json?url` — a plain JSON import would inline all 112 KB
into the JS bundle, which is what `?url` plus the runtime fetch exists to avoid. Keep the suffix.

## Key Concepts

- **Color coding**: Gold (`GAP_GOLD`) always means representation gap, forest green (`FAIR_GREEN`)
  always means fair representation — a state at its proportional share, the seats inside that share,
  and the pacts that get there (matched borders, arcs, badges). Red/blue stay reserved for party.
  All of it lives in `src/colors.ts`; don't hardcode a hex in a component. The two lean gradients in
  `App.css` are the exception CSS forces.
- **Partisan Lean**: State's 2025 statewide Cook PVI, signed positive for D.
- **Representation Gap**: A state's enacted R seats (districts whose own Cook PVI leans R) minus the
  proportional ideal implied by its statewide PVI, `round(districts × (50 − statePVI) / 100)`.
  Positive = R overrepresented, negative = D overrepresented. Both sides come from Cook PVI, so
  they're measured on the same scale.
- **Pacts**: A pact between two oppositely-gerrymandered states unwinds the **lesser** of their two
  gaps in *both* states, so its national effect is `2 × min(|gapA|, |gapB|)`. Whatever gap survives
  stays on the map. Because each side returns the same number of seats, a pact never changes the
  national party balance — only the gap closes.
- **MAR Matching**: The user pairs states manually. Clicking a state pins it to the head of its own
  column and re-ranks *both* columns around it: closest delegation size, then closest proportional
  minority share (the box's top row), then alphabetical. The representation gap is deliberately not
  a ranking key — a state can redraw its way out of its gap but not out of its size or its lean, so
  the durable pact is between alike states and matched gaps are a benefit of that rather than the
  thing being sorted on. Columns are split
  by the state's own partisan lean, because the signatory is the state government, not the
  congressional delegation. A state whose map favors the party it doesn't lean toward (Nevada is
  R+1 but D-gerrymandered) therefore sits in the column opposite its gerrymander; `pactSeatsReturned`
  returns 0 for such a pairing rather than letting both partners hand seats to the same party.
  A PVI of exactly EVEN has no side, so those states are placed by who holds their branches —
  the same signatory logic, read off the government instead of a rounded margin. That's Michigan
  (D governor, D senate, R house → left) and Wisconsin (D governor, R senate, R house → right).
  D has to win the branches outright, so an even split stays right. One predicate, `leansDemocratic()`
  in `BipartiteMatchGraph.tsx`, decides both the column and which party the box's minority rows
  count — they must not disagree.

## Commands

```bash
npm run dev            # Start dev server
npm run build          # Type-check (src + scripts) and build for production
npm run preview        # Preview production build
npm run check:control  # Report where branch control has drifted from Open States
```

`check:control` reports and exits 1; it never edits `stateData.ts`. A seat count can't see a
coalition (Alaska), a nonpartisan chamber (Nebraska), or a chamber organized on a plurality (Maine),
so those three are carried as named blind spots and control is corrected by hand. It can't see
governors at all. There was a `generate-data` script pointing at a `scripts/csv-to-statedata.cjs`
that no longer exists; it's gone now.

## Data Sources

Everything partisan comes from Cook PVI. See the root `README.md` for the full breakdown — it is the
only README in the repo; don't add per-folder ones.

- **District leans**: [2026 Cook PVI](https://www.cookpolitical.com/cook-pvi/2026-partisan-voting-index/district-map-and-list)
  → `data/cook2026DistrictPVI.tsv` (tab-separated with a header row; the app reads the `2026 PVI`
  column and skips the header).
- **State leans**: 2025 statewide Cook PVI, stored as `partisanLean` in `data/stateData.ts`.
  Redistricting doesn't move a statewide PVI, so the 2026 release left these unchanged — pairing
  2025 state figures with 2026 district figures is sound. The footer credits them as such.

Both files are hand-edited; the `stateData.csv` → `stateData.ts` generation step and the PlanScore
verification script are gone.

`stateData.ts` also carries map-drawing fields. `governorParty`, `senateParty` and `houseParty` are
read at runtime, as the control pyramid on each match-graph box — governor on top, the two chambers
below, one course for Nebraska's unicameral. They replaced a single `stateControl` verdict, which
threw away the useful half: *which* branch is the holdout. A trifecta is just all three agreeing, and
`'split'` on a chamber means nobody commands it (Minnesota's tied House, Alaska's coalitions).

`independentCommission` and `governorCanVeto` pick which mark the box gets, via `markFor()` — the
pyramid must not claim power the branches don't have. A **gray circle** means an independent
commission holds the pen, so no branch decides; that's true of six states (AZ, CO, ID, MI, MT, WA)
and the flag is deliberately strict. Politician commissions (HI, NJ, VA), advisory commissions (AK,
IA, ME, MD, NM, RI, UT) and New York's overridable one are all `false`, because elected officials
still decide. New York is the useful test: its governor can veto the map, and a commission that
really held the pen would leave nothing to veto.

An **inverted pyramid** means only that the governor has no veto — CT and NC by joint resolution,
HI/NJ/VA because a commission draws and the governor isn't in the process. Everyone else gets the
upright pyramid. Both fields track the map in force for 2026, not the state's standing rule:
California is `false` right now because Prop 50 suspended its commission through 2030.

`districts2032` and `hasBallotInitiative` have no reader yet — keep them: a pact has to survive
whoever holds the pen. `efficiencyGap` is deliberately *not* among them, since it came from the
PlanScore methodology the representation gap replaced.

Branch control moves with elections, so it dates in a way the PVI figures don't. See "Data Sources"
in the root `README.md` for where it comes from and how to re-check it.

The DRA and ALARM alternate maps were removed: the proportional ideal is now derived from each state's
own PVI, so there is no hypothetical map to compare against. Cook's site blocks scripted fetches, so
refreshing district data means pasting a new export into `data/cook2026DistrictPVI.tsv` by hand,
keeping the header row and column order.
