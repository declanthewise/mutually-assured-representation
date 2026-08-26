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
│   ├── BipartiteMatchGraph.tsx  # Two re-sorting columns of state boxes; draws either era
│   ├── ResultsPanel.tsx     # What the pacts returned, once Finish replaces the board
│   ├── StatBar.tsx          # House balance + national rep. gap (sticky, above the map)
│   └── AnimatedCount.tsx    # Count-up number, used by StatBar and the match graph
├── data/                    # Data plus the math over it; nothing generated
│   ├── cook2026DistrictPVI.tsv  # 2026 Cook PVI, all 435 districts
│   ├── districtLeans.ts     # Parses that file into per-state + national seat counts
│   ├── stateData.ts         # 50 states: 2025 Cook PVI, seat count, map-drawing authority
│   ├── computeRepresentationGap.ts # Per-state gaps, pact math, national total
│   ├── plan2032.ts          # The post-census board: fair splits, columns, pact math
│   └── checkBranchControl.ts  # Dev tool beside the data it checks — see Commands
├── map/                     # Map geometry and its assets
│   ├── useTopoData.ts       # Fetches the topology (null until it lands)
│   ├── fipsMapping.ts       # FIPS code → state abbreviation, for the TopoJSON
│   ├── us-states-10m.json   # TopoJSON state boundaries — imported `?url`, never inlined
│   └── mushroom-cloud.png   # Cloud icon sized by representation gap
├── branding/                # Assets nothing in `src/` imports — the browser and the crawler read them
│   ├── favicon.png          # 64px cloud, cropped to its own edges — linked from index.html
│   ├── apple-touch-icon.png # The same crop at 180px
│   └── og-card.png          # 1200×630 share card — see below
├── colors.ts                # The whole palette; every component imports from here
└── types.ts                 # TypeScript interfaces
```

`checkBranchControl.ts` is the one file in `src/` the app never imports — it's a dev tool, so it
stays out of the bundle while `tsc -b` still type-checks it against the data it reads. It lives
beside `stateData.ts` rather than in a `scripts/` directory because it exists to check that file,
and the two should move together.

`HeroMap` and `StateTooltip` are the only consumers of `src/map/`, but they live with the other
components rather than beside the geometry they draw.

The topology is imported as `./us-states-10m.json?url` — a plain JSON import would inline all 112 KB
into the JS bundle, which is what `?url` plus the runtime fetch exists to avoid. Keep the suffix.

`src/branding/` is the head of the document rather than the body. The two icons are ordinary hashed
assets: `index.html` links them by source path and Vite rewrites a `link` `href` like any other.
The share card can't be, because Vite never rewrites a `meta` tag's `content`, and `og:image` has to
be an absolute URL written before the hash exists — a crawler reads the HTML off a host the app can't
ask about. So `index.html` writes the production URL out in full and the `ogCard` plugin in
`vite.config.ts` emits the card at that fixed path, `/og-card.png`. The plugin reads the file with
`readFileSync`, so a missing card still fails the build — which is the whole point of having no
`public/` directory. Changing the domain means editing the two absolute URLs in `index.html`.

The card is a screenshot of the app itself: run `npm run preview`, capture the landing view in
headless Chrome, crop it to the map's own ink, and set that beside the title in a 1200×630 frame.
The map takes whatever width the title leaves rather than a measured one, so it can't overflow the
frame and lose Maine off the right edge. Reshoot it when the map or the title changes, since a stale
card is a promise the page no longer keeps.

There is no `description` or `og:description`, by choice: the card and the title say it, and a
paragraph under them says it again. The absence is the design, not an oversight — don't add one back.

## Key Concepts

- **Color coding**: Deep orange (`GAP_ORANGE`, sampled off the mushroom cloud's column) always means
  representation gap, black (`FAIR_BLACK`) always means fair representation — a state at its
  proportional share, the seats inside that share, and the pacts that get there (matched borders, the
  match graph's pact links). Black is also the interface's emphasis color, so the graph's hovered and
  selected boxes outline in the same black a sealed pact does. Red/blue stay reserved for party —
  which is why the map's pact badges are party-colored and not black: a badge names the party the
  pact hands seats back to, so it is a party fact, not a fairness one. The arc between them is the
  fairness half of that pair, in `FAIR_BLACK`, and so is the ring around each badge it joins — one
  continuous mark laid over the states, saying what the two party-colored badges were got by. All of
  it lives in `src/colors.ts` (the map's structural strokes, still white, excepted); don't
  hardcode a hex in a component. The two lean gradients in `App.css` are the exception CSS forces.
- **Partisan Lean**: State's 2025 statewide Cook PVI, signed positive for D.
- **Representation Gap**: How far the **squeezed party** falls short of the districts the state's own
  Cook PVI says it should hold. Everything is whole districts.
  `fairSplit()` gives the ideal: `districts × (50 − statePVI) / 100`, with the whole part allocated to
  R and **the last district rounded** to whichever party holds the larger claim on it. Rounding is a
  knife edge, but it's the knife edge a real negotiation falls off — the party that wins the argument
  over a state's last district is the one with the majority of it. So the fair map names an owner for
  every district and has no undecided category of its own. Computed in integer arithmetic
  (`districts × (50 − lean)`, remainder in hundredths) so a remainder of exactly 50 can't land on the
  wrong side of the comparison — which is **Michigan**, the one state rounding can't settle: 13
  districts at EVEN is exactly 6.50, so the two parties' claims on the last one are identical. It falls
  to whoever holds the state government, the party that would actually be signing.
  `holdsDemocraticBranches()` in `stateData.ts` reads that — two branches to one, so Michigan's last
  district is D and its fair map is 6R 7D against an enacted 6R 5D and 2 undecided: a gap of 2.
  The gap is then `max(R short, D short)`, signed positive when D is the short one (R overrepresented).
  A district inside `EVEN_BAND` (`|PVI| <= 1`, in `districtLeans.ts`) is **not** counted for either
  party and **not** taken out of the delegation the ideal divides, so it surfaces as the squeezed party
  being one district short — which is what it is. Virginia should have 5R, has 4R drawn and one
  district left undecided: a gap of 1. The band is a point wide rather than exactly EVEN because that
  is where competitiveness actually sits: Cook rates 7 districts EVEN, the band takes 17 across 12
  states, and of the 10 it adds, 4 are rated Toss Up, 3 Lean, 3 Likely and none Solid. It also matches
  how districts behave — see the comment on `EVEN_BAND` for the flip rates, and note the ratings are
  only a sanity check on where the line goes, never an input, since they fold in incumbency and this is
  an argument about districts.
  The two shortfalls sum to the state's undecided districts, so a state holding one can read short on
  **both** sides at once. The larger is the gap: it's the side that has to be made whole. A tie needs an
  even number of undecided districts splitting evenly, and falls to D through the `>=` in the
  comparison — today that's Arizona and Pennsylvania, each one short either way.
  Gaps and pacts are whole numbers throughout. There is no half-seat arithmetic anywhere; it was tried
  and pulled out, because it put fractions into the gap, the badges, the national total and the counts
  a pact leaves behind.
  **The state boxes don't mention undecided districts at all.** They are a national fact and the stat
  bar is the only place they appear. That was tried the other way — `1E 4R` beside the count, an `even`
  field on `FairSplit`, and a pact that spent surplus undecided districts against each other — and
  pulled back out for being three ideas where the argument wants one. The gap absorbs them instead,
  which is what a real pact would do with them anyway.
  National baseline gap: **104**. Nine states carry none: the six single-district states, plus ME, MN
  and NE.
- **Pacts**: A pact converts the same number of districts in both partners, so its national effect is
  `2 × returned`. Whatever gap survives stays on the map.
  **The House balance must not move** — that is the argument the whole tool makes, and it is what keeps
  the trade symmetric: one state draws a D district R, the other draws an R district D, and both
  columns end where they started. So `pactSeatsReturned()` pays out only between states gerrymandered
  in opposite directions, and only up to the lesser of the two gaps. `ResultsPanel.tsx` can therefore
  say the margin is unchanged without qualification.
- **MAR Matching**: The user pairs states manually. Clicking a state pins it to the head of its own
  column and re-ranks *both* columns around it: closest delegation size, then closest proportional
  minority share (the box's top row), then closest representation gap, then alphabetical. The durable
  terms lead: a state can redraw its way out of its gap but not out of its size or its lean, so size
  and share rank first and the gap only settles states already alike in both. Where it does settle
  them it settles them usefully, since the pact spends the lesser of the two gaps and the
  nearest-sized gap leaves fewest seats on the table. It's compared by magnitude — the sign is
  already spent on the columns — and read off the baseline, not the residual, like the split below.
  Size is compared as a ratio rather than a seat difference — delegations run 2 to 52, so one seat is
  half a state at the bottom and rounding at the top. That differs from a nominal difference only
  where candidates straddle the anchor, and over the 44 matchable states it moves one column head:
  Texas leads with California rather than New York, which also stops the marquee pair from
  disagreeing about each other (California already led with Texas).
  With nothing selected the columns fall back to `bySize`: biggest delegation, then biggest gap, then
  alphabetical. That one is weight rather than closeness, since there's no anchor to be near.
  The gap's other job is the split itself: the side a state sits on is the
  direction of its *baseline* gap, D-drawn left and R-drawn right, so every pairing across the gutter
  has seats to trade. Statewide lean is a close proxy — 43 of the 44 multi-district states sit on the
  side their own PVI names — and reading the gap instead only moves Nevada, which is R+1 with a
  D-drawn map and belongs with the states it can actually disarm. The gap must be the baseline and
  not the residual, or sealing a pact would move its own partners' columns.
  Three states carry no gap and so no side (ME, MN, NE); they fall back to lean, which settles all
  three. A third test, on who holds the branches, sits below that for a state that is gap 0 *and* lean
  EVEN — the signatory read off the government instead of a rounded margin, with D having to win the
  branches outright so an even split stays right. Nothing reaches it today: Michigan is EVEN but has a
  gap of 2, so the gap places it. Keep it; the data moves, and `fairSplit()` now asks the same question
  of the same states through the same predicate.
  One predicate, `isDemocraticSide()` in
  `BipartiteMatchGraph.tsx`, decides both the column and which party the box's minority rows count —
  they must not disagree.

- **The 2032 board**: a second board on the same graph, reached by "Try 2032" beside Retry on the
  2026 results. It asks the same question of the apportionment the 2030 census is projected to leave
  — Brennan Center figures, already in `stateData.ts` as `districts2032` and summing to 435. All of
  its math is in `data/plan2032.ts`.
  **There is no representation gap on it, and there must not be.** A gap measures an enacted map
  against the ideal, and after a census there is no enacted map — the 2026 district leans describe
  districts that will not exist, so nothing in `plan2032.ts` reads `districtLeans.ts`. What survives
  reapportionment is the state's own PVI and its new seat count, which is all `fairSplitOf()` needs;
  `fairSplit()` is now a thin call to it against `districts2022`.
  Columns split on **statewide lean alone** — there is no gerrymander yet to point either way, so
  lean is the whole test rather than the 2026 board's fallback. Michigan and Wisconsin are EVEN and
  fall to `holdsDemocraticBranches()`, which settles both (MI left, WI right). Single-district states
  stay out, which now drops **Rhode Island**: 43 matchable states against 2026's 44.
  A pact returns `min(fairMinorityA, fairMinorityB)` to *each* partner, capped by the lesser side for
  the same reason the 2026 pact is — the House balance must not move. The national pool is **182**.
  Ranking drops the gap key and stops at size then minority share; that loses nothing, since on this
  board the share *is* what a pact spends.
  The box shows two rows, not three: what the fair map owes, and what a pact has committed (0 until
  one is signed). Every figure on it is minority-party districts, so **no orange appears on the 2032
  board at all** — orange is the gap, and there is none. The swelled row is sized 10/26 rather than
  the gap row's 11/28 because its count carries a party letter the gap's doesn't; at 11/28 "18D"
  overlaps the label. See the comment on `PLEDGE_SWELL_LABEL_SIZE`.
  The two boards keep **separate pact lists** in `App.tsx`. The stat bar and the hero map read
  enacted maps, so both go on reporting the 2026 run while the 2032 board is up; neither answers to
  it. Retry clears both and returns to the opening screen.

## Commands

```bash
npm run dev            # Start dev server
npm run build          # Type-check and build for production
npm run preview        # Preview production build
npm run check:control  # Report where branch control has drifted from Open States
```

`check:control` reports and exits 1; it never edits `stateData.ts`. A seat count can't see a
coalition (Alaska), a nonpartisan chamber (Nebraska), or a chamber organized on a plurality (Maine),
so those three are carried as named blind spots and control is corrected by hand. It can't see
governors at all. There was a `generate-data` script pointing at a `scripts/csv-to-statedata.cjs`
that no longer exists; it's gone now, and with it the `scripts/` directory.

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

Every state shows a pyramid, and every pyramid stands upright. It used to invert where
`governorCanVeto` was false — the governor having no veto over the congressional map, CT and NC by
joint resolution and nine more because a commission draws and the governor isn't in the process —
but that asked one small shape to carry two unrelated facts, so the mark now says only who holds
each branch.

`districts2032` is read by the 2032 board (see below). `governorCanVeto`, `independentCommission`
and `hasBallotInitiative` have no reader — keep them: a pact
has to survive whoever holds the pen, and a ballot initiative is a route around a hostile
legislature. `independentCommission` is deliberately strict, true only where a commission holds the
pen outright (AZ, CO, ID, MI, MT, WA); politician and advisory commissions and New York's overridable
one are all `false`, because elected officials still decide. It tracks the map in force for 2026, not
the standing rule — California is `false` because Prop 50 suspended its commission through 2030.
`efficiencyGap` is deliberately *not* among these, since it came from the PlanScore methodology the
representation gap replaced.

Branch control moves with elections, so it dates in a way the PVI figures don't. See "Data Sources"
in the root `README.md` for where it comes from and how to re-check it.

The DRA and ALARM alternate maps were removed: the proportional ideal is now derived from each state's
own PVI, so there is no hypothetical map to compare against. Cook's site blocks scripted fetches, so
refreshing district data means pasting a new export into `data/cook2026DistrictPVI.tsv` by hand,
keeping the header row and column order.
