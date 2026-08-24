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
│   ├── ResultsPanel.tsx     # What the pacts returned, once Finish replaces the board
│   ├── StatBar.tsx          # House balance + national rep. gap (sticky, above the map)
│   └── AnimatedCount.tsx    # Count-up number, used by StatBar and the match graph
├── data/                    # Data plus the math over it; nothing generated
│   ├── cook2026DistrictPVI.tsv  # 2026 Cook PVI, all 435 districts
│   ├── districtLeans.ts     # Parses that file into per-state + national seat counts
│   ├── stateData.ts         # 50 states: 2025 Cook PVI, seat count, map-drawing authority
│   ├── computeRepresentationGap.ts # Per-state gaps, pact math, national total
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
  `fairSplit()` gives the ideal: `round(districts × (50 − statePVI) / 100)` for R, the rest to D. Where
  that lands exactly on a half the odd district is a **toss-up in the ideal** rather than a rounding —
  Michigan is EVEN with 13 districts, so its fair map is 6R, 6D and one district neither party is
  owed, not the 7R `Math.round` would hand Republicans on its tie-breaking rule. Tested in integer
  arithmetic (`districts × (50 − lean)`, remainder 50 being a true half); Michigan is the only state
  it reaches.
  The gap is then `max(R short, D short)`, signed positive when D is the short one (R overrepresented).
  A district rated exactly EVEN is **not** counted for either party and **not** taken out of the
  delegation the ideal divides, so it surfaces as the squeezed party being one district short — which
  is what it is. Virginia should have 5R, has 4R drawn and one district left undecided: a gap of 1.
  The two shortfalls sum to the enacted EVEN districts beyond the ideal's own, which is why the larger
  is the gap: it's the side that has to be made whole. Where the ideal carries a toss-up too — only
  Michigan — the two cancel and the gap is the difference of the party counts alone.
  Gaps and pacts are whole numbers throughout. There is no half-seat arithmetic anywhere; it was tried
  and pulled out, because it put fractions into the gap, the badges, the national total and the counts
  a pact leaves behind, and the EVEN districts read more clearly listed than divided.
  The box lists the EVEN districts beside the party count rather than folding them in — `1E 4R`, in
  `EVEN_GRAY`, at the same size and weight as the figure because it counts the same thing and only the
  allegiance differs. A pact **spends** the surplus one: drawing that district for the shorted party is
  how the last of the gap closes, so Virginia's `1E 4R` becomes a flat `5R`. It survives a pact that
  only closes part of the gap, where a district already drawn for the other party changes hands
  instead — New Jersey goes `1E 2R` → `1E 3R`.
  National baseline gap: **101**. Four states carry none (ME, MN, NE, PA).
- **Pacts**: A pact converts the same number of districts in both partners, so its national effect is
  `2 × returned`. Whatever gap survives stays on the map.
  **The House balance must not move** — that is the argument the whole tool makes, and it decides
  which districts can trade for which. `pactTrade()` in `computeRepresentationGap.ts` settles two
  trades in one handshake, each capped by the lesser partner:
  - **party districts against party districts** — one state draws a D district R, the other draws an
    R district D, and both columns end where they started;
  - **surplus EVEN districts against surplus EVEN districts** — one state draws its undecided district
    R, the other draws its own D, and again each column gains one.

  An EVEN district can **not** trade against a party district. Drawing an undecided district R adds to
  the R column without taking anything from D, while the partner flipping R→D moves one across: R
  comes out level, D a seat ahead, and the balance has moved. So the trade is refused rather than
  allowed to cost the thing pacts exist to protect. `ResultsPanel.tsx` can therefore say the margin is
  unchanged without qualification.
  A state's gap splits into `partyGapOf()` and `surplusEvenOf()`. Surplus means EVEN districts beyond
  what the fair map asks for — **Michigan's is not surplus**, its fair map calling for a toss-up, so
  Michigan trades on its party gap alone like a state with no EVEN district at all. The other six EVEN
  states carry one surplus apiece.
  Consequence worth knowing: **Arizona is the only surplus-EVEN state on the R-drawn side.** CO, NJ,
  NM, NY and VA are all D-drawn, so every EVEN-for-EVEN trade on the board runs through Arizona, and
  only one of them can have it. CO, NM and VA have a party gap of zero — their whole gap is that one
  undecided district — so Arizona is the only partner that returns them anything at all. Pair them
  with anyone else and the pact pays out zero, which the badges show honestly as `0`.
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
  Four states carry no gap and so no side (ME, MN, NE, PA); they fall back to lean, which settles all
  four. A third test, on who holds the branches, sits below that for a state that is gap 0 *and* lean
  EVEN — the signatory read off the government instead of a rounded margin, with D having to win the
  branches outright so an even split stays right. Nothing reaches it today: it was there for Michigan,
  whose fair map of 6R, 6D and a toss-up against an enacted 7R and 5D leaves its Democrats a district
  short, so the gap places it. Keep it; the data moves.
  One predicate, `isDemocraticSide()` in
  `BipartiteMatchGraph.tsx`, decides both the column and which party the box's minority rows count —
  they must not disagree.

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

`governorCanVeto`, `independentCommission`, `districts2032` and `hasBallotInitiative` have no reader — keep them: a pact
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
