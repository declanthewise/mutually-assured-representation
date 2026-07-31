# Mutually Assured Representation

An interactive map for finding US states with equal and opposite gerrymanders — pairs that could
disarm together without either party surrendering a seat.

Mid-decade redistricting turned 2026 into an arms race: ten states redrew their lines, and the median
House seat moved two points redder. Unilateral reform is a losing move, because the state that draws
a fair map hands seats to the other side. A pact isn't. If California gives back nine seats and Texas
gives back nine, the national party balance doesn't move at all — only the distortion does.

## The numbers

- **National representation gap: 99 of 435 seats.** The sum of every state's distance from
  proportional.
- **House balance: R+22** (225 R-leaning districts, 203 D-leaning, 7 even). This never moves when a
  pact is signed, which is the entire argument.

## How the math works

**Representation gap** — for each state, compare the seats the enacted map actually allocates to each
party against the seats a proportional split of that state's own partisan lean would give:

```
ideal R seats   = round(districts × (50 − statePVI) / 100)
enacted R seats = districts whose own Cook PVI leans R
gap             = enacted − ideal
```

Positive means Republicans are overrepresented, negative means Democrats are. Both figures come from
Cook PVI, so they sit on the same scale.

**Pacts** — a pact between two oppositely-gerrymandered states unwinds the *lesser* of their two gaps
in **both** states, so its national effect is `2 × min(|gapA|, |gapB|)`. The smaller partner sets the
price: a state with a 3-seat gap can only buy 3 seats of disarmament from a partner with 9, and the
remaining 6 stays on the map. Because each side gives up the same number, no pact changes the
national party balance.

Columns in the matching view are split by each state's **own partisan lean**, not by which way its
map is drawn — the signatory is the state government, not the congressional delegation. Nevada is the
only state where the two disagree (R+1, but D-gerrymandered by one seat); pairing it with a
Democratic-leaning state returns zero seats rather than letting both partners hand seats to the same
party.

## Running it

```bash
npm install
npm run dev      # dev server on :5173
npm run build    # type-check and build for production
npm run preview  # preview the production build
```

## Data

Everything partisan comes from Cook PVI. State and district figures share one definition, which is
what makes the representation gap well defined — there is no second methodology in the repo.

```
src/data/
├── cook2026DistrictPVI.tsv         # 2026 Cook PVI, all 435 districts
├── districtLeans.ts                # Parses that file into per-state seat counts
├── stateData.ts                    # 50 states: Cook PVI, seat count, map-drawing authority
└── computeRepresentationGap.ts     # Per-state gaps, pact math, national total
```

Both sources are read at runtime. There are no build scripts and no generated files — edit them
directly. Map *rendering* inputs are separate: the TopoJSON boundaries and the mushroom-cloud image
sit in `src/map/`, imported so Vite emits them as hashed files rather than inlining them into the
bundle.

### stateData.ts

Two fields drive the representation gap:

- `partisanLean` — the **statewide Cook PVI**, signed so positive is D. Redistricting doesn't move a
  statewide PVI (it's the state's own presidential vote versus the nation's), so the 2026 release
  left these unchanged from 2025.
- `districts2022` — seat count under the 2022 apportionment.

The rest describe **who controls map-drawing**, and are deliberately kept despite having no runtime
reader yet: `districts2032`, `stateControl`, `redistrictingAuthority`, `governorCanVeto`,
`hasBallotInitiative`. A pact has to survive whoever holds the pen, so pact-feasibility work will
want them.

`efficiencyGap` is the one field not kept — it came from PlanScore 2024 election results, a
methodology the representation gap no longer uses, and keeping it would put a second definition of
partisan fairness back in the repo. It's in git history.

### cook2026DistrictPVI.tsv

Tab-separated with a header row, matching Cook's own column names:

```
Dist | Incumbent | Incumbent Party | 2025 PVI | 2026 PVI | 2026 Rank
```

Only the **2026 PVI** column is read. The 2025 column is kept for reference: it shows which ten states
(AL, CA, FL, LA, MO, NC, OH, TN, TX, UT) redrew their lines mid-decade for 2026.

Cook's site blocks scripted fetches, so refreshing this means pasting a new export in by hand. Keep
the header row and the column order.

Source: [2026 Cook PVI district list](https://www.cookpolitical.com/cook-pvi/2026-partisan-voting-index/district-map-and-list).

### How it flows into the app

1. `districtLeans.ts` parses the district list into per-state `SafeSeatCounts`, plus
   `nationalSeatTotals` for the House balance stat.
2. `computeRepresentationGap.ts` compares each state's enacted R seats against the proportional
   ideal implied by its statewide PVI. The difference is that state's representation gap.
3. Pacts subtract the lesser of the two partners' gaps from both, via `computeResidualGaps()`.

### Methodology notes

Cook PVI is a 75/25 weighted average of the 2020 and 2024 **presidential** results, expressed as a
deviation from the national average. Because the state and district figures share that definition, the
proportional ideal and the enacted allocation sit on the same scale.

Two rounding choices are worth knowing:

- The ideal R seat count is `round(districts × (50 − statePVI) / 100)`, so a state's gap is always a
  whole number of seats.
- Districts rated exactly `EVEN` (7 nationally) count for neither party. They're genuinely
  competitive, so the map hasn't allocated them to anyone.

One known limitation: proportionality from statewide PVI ignores political geography. Democratic
voters are concentrated in cities, so a state can land far from its PVI-proportional ideal without
anyone drawing a deliberate gerrymander. California's D+16 gap under the post–Prop 50 map is the
extreme case.

## Credits

By Declan Fitzsimons. District and state partisan leans from the
[Cook Political Report](https://www.cookpolitical.com/cook-pvi).
