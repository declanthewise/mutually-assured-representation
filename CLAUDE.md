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
│   ├── mapDrawingRules.md   # Why each state's veto/initiative/commission flags read as they do
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
  representation gap, black (`FAIR_BLACK`) always means fair representation — the seats inside a
  state's proportional share, and on the map the arc a pact draws between its two badges. **It is no
  longer on the match graph's pact links**: those are drawn in their own two states' colors, before
  and after, so the link reports what the pact bought rather than asserting that it bought something.
  A pact that disarmed both partners comes to rest on `EVEN_GRAY` the whole way across, which is that
  ramp's own word for a state at its proportional share and says the same thing black would. The one
  black left on the graph is the × and the "Your Pacts" heading, which are interface and not argument.
  Red/blue stay reserved for party — which is why the map's pact badges are party-colored and not black: a
  badge names the party the pact hands seats back to, so it is a party fact, not a fairness one. The
  arc between them is the fairness half of that pair, in `FAIR_BLACK`, and so is the ring around each
  badge it joins — one continuous mark laid over the states, saying what the two party-colored badges
  were got by. All of it lives in `src/colors.ts` (the map's structural strokes, still white,
  excepted); don't hardcode a hex in a component. The two lean gradients in `App.css` are the
  exception CSS forces.
- **The match-graph box's border** says two things at once, on one stroke, and they must stay apart.
  **Color is the state's own condition**: its residual representation gap over what its fair map owes
  the squeezed party — the box's gap row over its top row — down the `UNDERREP_RANGE` ramp, deep blue
  for a map that owes its Republicans districts, deep red the other way, through `EVEN_GRAY` at
  proportional. A fraction because the gap is whole districts and delegations run 2 to 52; the border
  is about how hard the map is wrung, not how many districts that came to, which is what the three
  rows say and what the map's clouds are sized by.
  Against the **debt** and not the delegation, and **plateauing at half of it**: a state that gives
  the squeezed party less than half the districts it is owed is failing that party outright, and every
  state past that line is failing it, so they all read solid and only the states inside it have
  anything left to grade. Measuring against the delegation instead put the big states in the pale end
  — Texas 9 of 38 and California 16 of 52 drew lighter than two-district Iowa — where against the debt
  they are 9 of 17 and 16 of 20 and both solid, which is the point. The ramp is linear up to the
  plateau rather than eased: an S-curve would blur the one place the scale is making a claim. The gap
  never exceeds the debt on either board, so the fraction stays inside ±1 and the clamp is belt and
  braces. Today 33 of the 44 states on the 2026 board are past the line.
  Reading the **residual** is what makes a pact drain its own color — a state the pacts have made
  whole comes to rest on the neutral, one still owing more than half stays solid. It is the only mark
  on a 2032 box with anything to say before a pact, that board's lower two rows being blank by design;
  and on that board every state owes its minority everything and has drawn none of it, so it opens at
  a **flat solid on all 43 boxes** and only acquires shading as it is pacted, where 2026 opens with
  real spread.
  **Weight is the interface's own** — under the pointer, picked up and looking for a partner, or
  holding the board through its linger, 2 units to 3 — and it changes without touching the color, so a
  box can say "you have hold of me" and "I am still four districts short" in the same breath. Black
  used to carry the first and painted over the second, which cost most exactly where the color had
  just changed: a sealed pact went black at the moment its border had news. **The weight goes when the
  box leaves for "Your Pacts"**, not when the pact is made — the linger is the one stretch the pair is
  meant to be watched, which is what it exists for, so the two hold the emphasis right through it and
  give it up on the way down. Parked, they are settled: the only move left is the ×, and the emphasis
  belongs to the boxes still in play. The weight doesn't transition — it answers the pointer, and an
  answer that takes most of a second is no answer — while the color transitions only on a delay that
  holds it to the moment the pact's two halves meet; see the sealing bullet below.
  The lean badge in the header keeps the `LEAN_RANGE` ramp, because a PVI is still a lean. Note the
  two ramps run **opposite**: the gap is signed positive when the Democrats are short, so positive is
  red on the border and blue on the badge. They agree about how nearly every state looks anyway, since
  a state's gerrymander mostly points the way its lean does.
- **The two route marks** sit in the box header between the district count and the control pyramid,
  and say what could change this state's map over the objection of whoever draws it now: two stacked
  boxes with the top one ticked for a citizens' initiative that can reach map-drawing, a head-and-
  shoulders figure for a governor's veto that costs something. Both read `stateData.ts`; both are
  narrow readings, and the narrowing is the point —
  `governorCanVeto` drops the six states that override on a bare majority of the elected members
  (AL, AR, IN, KY, TN, WV) as well as the eleven where the plan never reaches the desk, and
  `hasBallotInitiative` drops MD and NM, which have only the popular referendum, and AK, IL and MS,
  whose initiatives can't get there. 32 and 21 states. All of it is worked out state by state in
  `data/mapDrawingRules.md`.
  They are `ROUTE_GRAY` and **not party-colored**, unlike the pyramid an inch to the right: branch
  control is a party fact, where a veto and an initiative are machinery and would be lying in red or
  blue. Not `EVEN_GRAY` either, which already means "nobody's" twice on the same box.
  **The strip is only as wide as the marks a state actually has**, and a state with neither gives the
  whole of it back to its name. Reserving both slots on every box would line the marks up down a
  column, which is worth something, but it costs 13.7 units of every header to hold space for a mark
  that isn't there, and the states that pay most are the ones with no marks to line up. The veto sits
  nearest the pyramid, because it belongs to the figure at that pyramid's apex, and the initiative
  outside it; with one mark there is no gap to leave, and it takes the place against the pyramid
  whichever one it is. The two are different widths because their shapes are — a figure is round, a
  pair of boxes is narrow — and squaring both would only pad the narrower with air.
  Each mark **depicts its subject rather than its truth**. A tick and a prohibition sign were tried
  and are wrong together, whatever they are apart: side by side they read as one question answered
  yes and no, rather than as two powers a state has or hasn't. Presence already carries the truth,
  which is why a state without one draws nothing.
  **The name budget is per state**, running from 64.3 units for a two-mark state with a wide lean
  badge up to 83 for a state with no marks and a narrow one, and that is why only four names are
  shortened in `HEADER_ABBREVIATIONS`: North Carolina draws neither mark and clears by 3.5 units,
  where against a fixed two-mark strip it was eleven short. Two of the four never render, ND and SD
  being single-district. South Carolina clears by 1.2, so re-measure the moment the marks, the pyramid
  or the badge changes size. The full name stays on the element's `title` and everywhere else — the
  map, the tooltip, the results list — is untouched.
- **Sealing a pact** puts both partners at the head of their columns for the length of the linger and
  closes a link between them. The state clicked first is already there — that is what clicking it did
  — and `headedBy()` pins the partner, which could have come from anywhere down the opposite column.
  Level across the gutter is the only arrangement in which the link is one flat line, and the only one
  that reads as two states meeting. The view follows the **anchor** rather than the active state so
  the pair is actually watched: the sealing click clears the active state, and the whole point of the
  linger is that it be seen.
  The link is drawn as **two halves closing on each other**, each from its own box's edge to the
  middle, which is the picture the board is arguing for. Both are authored with `x1` at their box and
  hidden by a `stroke-dasharray` of their whole length, so running `stroke-dashoffset` to zero walks
  each stroke outward-in without either half knowing which side it is on — a `scaleX` would have
  wanted a transform-origin per side and would have squashed the round caps. `pathLength={1}` makes
  that offset a fraction, so the keyframe needs to know nothing about how wide the gutter is. The
  closing waits out `--row-travel-ms`, so the halves meet between boxes that have arrived rather than
  across a gap two boxes are still sliding into, and then takes `--seal-count-ms`. The box's own
  swells wait out **both** — see `SEAL_LEAD_MS` — so nothing in the box starts until the halves have
  touched.
  **The link is its two states, before and after.** A half closes in the color its box wore walking
  in — that box's own depth on the ramp, not a flat party red or blue — so what reaches over the
  gutter is two gerrymanders and not an idea about them. It holds that color through the close, and the
  colors the pact left behind come up **on the first count**, over exactly its length
  (`--pact-count-ms`, `--seal-count-ms`) — the same beat the two borders fade on and the map's arc
  draws on, because they are all one pact taking effect.
  **Nothing travels.** The change happens along the whole line at once and on both borders with it —
  one change said in four places, not a front moving between them. Only the closing is drawn, and only
  because the two halves reaching each other is the thing being said. Two earlier attempts are worth
  not repeating: a spatial bleed out from the middle, and that bleed carrying on round each border
  from the inner edge. Both were legible but neither was the point, and the second needed a traced
  half-perimeter per column to exist at all.
  **That after-color is what the link keeps** on the way down to "Your Pacts" and for good. So the
  link reads out what the pact bought on each side: a pairing that disarmed both partners rests on
  `EVEN_GRAY` end to end, one that only got halfway leaves color on the side still short. It also
  makes the link continuous with the two borders it joins, since all three are the value the boxes
  settled on.
  It is **four lines and not two** — `.pact-half` in the before color, `.pact-fade` in the after color
  laid over it at the same width and ends — because a stroke carries one color and the change has to
  happen without moving. `.pact-fade` is held clear by `backwards` fill through the delay, so the two
  states have the line to themselves the whole way in, and parked (no animation on either) it is
  simply opaque with the before color hidden under it: no special case for either state.
  **The border's transition is delayed to the same count**, and a transition holds its old value for
  the whole of its delay, so a sealing box keeps the color it walked in with through the boxes' trip
  and the link's closing, and only then fades. Fading it from the click was what made the change
  unreadable: both boxes had settled on their new colors before there was anything on the board to
  explain it. It is scoped to `.state-box.settling` so that a broken pact reverts in a frame.
  `preSealColorOf()` reads the baseline rather than the residual, which is the same thing here — a box
  in a pact is inert, so neither partner can have been in one. It paints both the sealing box's border
  and the half leaving it, which is what makes the two continuous at the moment the half is born.
  **The link is one element across both phases**, keyed by the pair: it closes at the top of the
  board and then rides the same transform down to its place under "Your Pacts" when the linger lapses,
  instead of vanishing there and reappearing here. So `pact-settle-in` moved off `.match-link`, which
  no longer appears out of nowhere, and onto the **×**, which does — that is withheld during the
  linger, because a pact still being made has nothing to take back yet.
  `--row-travel-ms`, `--seal-count-ms` and `--pact-count-ms` are all set on the svg from the constants in
  `BipartiteMatchGraph.tsx`, so neither file keeps its own copy of a figure the other needs, and the
  reduced-motion block can cut all of it at once.
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
  in opposite directions, and only up to the lesser of the two gaps. On the 2026 board `ResultsPanel.tsx`
  can therefore say the margin is unchanged without qualification: whatever gap survives was already
  on the enacted map, so leaving it there moves nothing. **That does not carry to 2032** — there is no
  enacted map, so a surviving gap is drawn by the state's own majority and does move the House. See
  the 2032 board below, where the results headline is one line and makes no margin claim.
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
  **It starts from a clean sheet.** No 2032 map exists and nothing here invents one: the minority
  districts a state holds in 2032 are the ones a pact puts there and nothing else, so its baseline
  gap is its whole fair minority share. **Nothing in the file reads today's map** — the district
  leans in `districtLeans.ts` describe districts that will not exist. Carrying today's gerrymandering
  forward was tried and pulled out: it made the second board a restatement of the first, and the
  argument here is about the districts on the table, not about who is ahead now.
  The ideal is `fairSplitOf()` against `districts2032`; reapportionment moves how many districts a
  state draws, not how it votes, so the statewide PVI carries over untouched. Michigan's tie still
  falls to the branches, on 13 districts there as here.
  National baseline: **182**, against 2026's 104 — every minority district the fair maps owe. Every
  matchable state carries one. A pact returns `min` of the two gaps to *each* partner, capped by the
  lesser side exactly as in 2026 because the House balance must not move, so the best any pairing can
  do is close 154 and leave 28: the left column owes 77 and the 26 states on the right can cover all
  17 on the left.
  Columns split on **statewide lean alone**. Michigan and Wisconsin are EVEN and fall to
  `holdsDemocraticBranches()`, which settles both (MI left, WI right). Nevada is the one state the two
  boards seat differently: left in 2026 on its D-drawn map, right here on its R+1 lean.
  Single-district states stay out, which drops **Rhode Island**: 43 matchable states against 44.
  Ranking is identical on both boards — size ratio, then minority share, then gap, then alphabetical.
  **The box is one three-row equation, and a pact plays out the same way on both boards**: the pact
  row swells to fill the box, counts, folds away, and then the gap row does the same with what that
  left behind. Read in that order they are cause and consequence — what the trade delivered, then what
  it failed to close — which is the sentence the box is making.
  What differs is only what the rows *say*. The 2026 box already holds figures and a pact moves them,
  New York going from 6 of its 11 to 8 and its gap from 5 down to 3. The 2032 box has nothing to
  change: its lower two rows start **blank**, the middle one is always `(Pact)`, there is no 2032 map
  until a pact draws one, so the same two turns write both figures from nothing. 2026 used to swell
  only the gap, on the grounds that its middle row was restating what the gap row already said — but
  that row is the trade itself, where the gap is only what the trade missed, and each deserves its own
  turn.
  **The two swells cannot overlap**, and that is geometry rather than taste: both rows grow toward
  `SWELL_ROW_Y`, the middle of the box, so a fold running into the next rise would put two magnified
  rows on the same line. `SWELL_CYCLE_MS` is one row's whole turn — rise, count, beat, fold — and a
  row's place in the sequence is just an offset into it (`GAP_ROW_OFFSET_MS` for the second), which is
  what lets one clock drive both. `PACT_LINGER_MS` is a lead plus two cycles, holding either board
  still for **5150ms** after each pact.
  **The middle row's label changes with the row.** On the 2026 board it reads `(2026)` until a pact
  makes it `(Pact)`, and that hand-over is a dissolve running over the row's own rise rather than a
  flip on the click. Only the ending crosses: `Minority Districts` is drawn once at full strength, the
  new ending fades up on a `fillOpacity` tspan inside it, and the old one is a second `text` whose
  prefix is a `fill="none"` tspan — painting nothing but advancing the pen, so the two endings land on
  the same x at any size the swell is passing through and nothing has to measure the prefix.
  Crossfading two whole labels was tried and is wrong twice over: the shared prefix goes through both
  layers at part opacity and lightens visibly at the halfway point, and before the fade starts the two
  endings sit stacked and legible as neither. The fade runs off `elapsed` and not off `1 - midSize`,
  because the swell is symmetric and brought the old reading back when the row folded. 2032 has no
  such change — its middle row is `(Pact)` before anybody signs anything.
  `PACT_COUNT_AT_MS` is where the **first** count starts within that, and it is the figure the whole
  app answers a click on. Everything the pact causes happens on it: the two borders and the link
  between them come up in their new colors, and on the map `HeroMap` imports the same constant as its
  `PACT_TRAVEL_DELAY`, so the arc draws and the badges fly on the same beat — and the clouds clear
  *into* that flight rather than ahead of it, starting in time to be half gone when the badges set
  out. Clearing them on the click, which is what they did back when the flight left a quarter-second
  after one, left the map bare and still for a second and a half while the graph brought its boxes
  together: the gap a pact fills should not be seen to go before the pact that fills it has set out.
  Only a cloud a pact is clearing waits, though — one coming *back* on a broken pact has nothing to
  wait for, which is why that delay is a per-datum function of whether the state is matched. The colors are read off
  the residual gap that the *second* count is still to spell out — they come up here anyway, because a
  pact takes effect all at once and this is where it does; the gap row that follows is the accounting,
  not the event. Holding them for it left the board still and colorless through the one beat with
  news. Under reduced motion the map drops the delay outright, since the graph drops its lead there
  and a map still waiting would be the one slow thing on a page asked to hurry.
  **Breaking a pact is not an event and gets no animation.** The × takes both states straight back to
  what they were: the counts are asked for with `duration` 0 and the border transition is scoped to
  `.state-box.settling`, so neither runs when there is no seal. An eased number or a fading border
  there would read as a second thing happening rather than the first being taken back.
  **The lead is everything before the box has anything true to say** — `SEAL_LEAD_MS`, the pair
  reaching the head of its columns and then the link closing between them. A swell that starts on the
  click runs while its own box is still travelling: the figure the click is about, magnified on a box
  sliding under it, and on a long trip up the column half over before the box has stopped. A swell
  that starts on arrival instead talks over the closing, which is the pact being made — the box
  explaining what the trade came to while the two states are still reaching for each other. Nothing
  the box says is true until the halves touch, so nothing it says begins until they do.
  Under reduced motion the lead is zero: a box reaches its row and the link closes inside a
  millisecond, so there is nothing to wait for.
  **The pact row grows less far than the gap row at both ends, and its party letter is why.** The row
  is 128 units, x=6 to x=134, label left and count right. Measured in the app at the weights they are
  set in: "Minority Districts (Pact)" runs 9.67 units per unit of font size against "Representation
  Gap"'s 8.26, and the widest count either row can hold is two digits and a letter — `18D`, the
  largest trade on the 2032 board — at 1.653 per unit against a bare `18`'s 1.024. So the gap row's
  11-and-28 is unavailable here at any pairing. 9 and 19 clear by 9.6, a shade more than the 8.4 the
  gap row lives on; 9 and 20 leaves 8.0, and 9.5 and 19 only 4.8.
  The letter used to be **dropped** on the way up, which bought a label at 10 and a count at 21. That
  was the wrong thing to sell: the letter names the party every figure in the box is about, and a row
  that sheds it mid-swell is answering a question it has stopped asking. Paying for it out of both
  sizes instead costs a point of label and two of count, and the row still magnifies by more than two
  to one. `PARTY_FADE_SWELL` and the separate letter run are gone with it — the figure and its letter
  are one run now, which also retires the per-run baseline problem that had the `R` visibly drooping.
  Blank rather than zero on both rows: zero is a measurement, and a column of `0R` down an untouched
  board would read as forty-three states looked at and found empty. **Each holds its blank until its
  own row starts to rise**, the gap row a whole cycle later than the pact row. A figure that arrives
  before the row has moved is one nothing has drawn attention to — the `0R` a 2032 pact row used to
  show from the click sat there through the boxes' trip and the link's closing, saying a state had
  been measured and found empty when what it was waiting to say is that a pact was about to fill it. The 2032 gap is fed **zero** while unmatched rather than the baseline the
  state owes, so it counts *up* into existence rather than down from a figure the board never showed.
  Both boards run their counts at the same pace (`SEAL_COUNT_MS`, half an ordinary count), since a
  count means the same thing on either and should take the same time to say it.
  **The stat bar runs the opposite way on the two boards**, because the boards start from opposite
  places. 2026 measures enacted maps, so both figures are full at the outset and the pacts work them
  down: 104 of gap draining away, against a House already drawn and a margin of R+24 no pact may
  move. 2032 starts from a clean sheet, so both start at **0 and fill**.
  The margin reads **EVEN** on an empty ring of bare track. A state that signs draws its map, so every
  district in its fair minority's share is decided by doing so: the pact hands `returned` of them to
  the minority, and **whatever it leaves short goes to that state's own majority**, because those
  districts don't stay blank. An evenly matched pact therefore cancels exactly and the centre holds —
  California against Texas is 18 each, and the House stays EVEN. A mismatch does not: California
  against Florida trades 14, and the 4 California still owes its Republicans get drawn Democratic
  instead, so the ring reads 14R/18D and the margin **D+4**. Add New York against Texas and Texas's 8
  unclosed districts go the other way, landing the board at 32R/28D and **R+4**.
  That tilt is the honest reading of an uneven pact and the argument for pairing states of like size:
  the residual isn't a rounding error, it is seats. The `EVEN` label is computed, not hardcoded, so
  the bar reports what the pact math did rather than holding at zero on trust.
  The undrawn remainder is `TRACK_GRAY` and not `EVEN_GRAY`: nobody has decided it either way, where
  an EVEN district is one a map drew and left competitive.
  The gap uses `computeStatedGap2032`, which counts **only the states that have signed** — it is not
  the sum of every state's residual gap. It starts at 0 and climbs, matching the boxes, whose gap rows
  are blank until they have a pact. A bar reading 182 over a board of blank rows would assert the very
  number the board is refusing to. A pact that returns nothing still counts both partners in full:
  they signed, and their map leaves them exactly as short as they started. The results panel is the
  one place the full residual is still used, since its headline measures against the 182 baseline.
  The hero map and the tooltip *do* follow the board. `HeroMap` takes the era and looks its gaps and
  pact payout up in a `BOARDS` record, and the badge's gap travels on the badge datum so a badge is
  colored by the board that drew it. **Both icon scales are derived from the board's own gaps**, by
  `scaleLimits()`, rather than being constants: constants went stale the moment the 2032 board changed
  shape — its largest gap went 14 → 18 against a `MAX_REP_GAP` of 16, and the cloud scale has no
  clamp, so California drew at 148.5 in a scale whose maximum is 140. The badge scale does clamp,
  which made its failure quieter and worse: every 2032 pact from 10 up rendering at one radius. The
  badge domain is the largest *trade* a board can produce — the smaller of its two columns' largest
  gaps, 9 in 2026 and 18 in 2032 — since a pact is capped by its smaller partner.
  **The 2032 results headline is one line and claims nothing about the margin**: "Your three pacts
  created 70 proportional districts." Its second line used to be the 2026 board's margin claim, which
  stopped being true there the moment an unclosed gap started going to the state's own majority — an
  uneven pact moves the House, and the stat bar says so. Rather than qualify it on every uneven run,
  the line goes and the headline says the one thing always true of that board: how many districts the
  pacts drew proportionally that nobody would otherwise have drawn.
  There is no "After the 2030 Census" kicker over it any more, and no era label of any kind on the
  results — the board is reached by a button that says 2032 and the boxes carry the year themselves.
  The two boards keep **separate pact lists** in `App.tsx`, and each has its own residual gaps. Retry
  clears both and returns to the opening screen.

- **Typography**: every block of running text on the page — the opening prose (`.app-intro`), the
  match instructions, the results headline and the pact list under it — is set **identically**:
  Source Sans 3 at `0.94rem`, 1.55 leading, `#444`. Only the alignment differs, the latter three
  being centered, and the pact list keeps its own row rhythm (the padding and the rule between
  items) because that is list structure rather than type. Its longest possible pairing,
  "+10 North Carolina Democrats ↔ +10 Massachusetts Republicans", is 406px at this size against a
  612px measure, so nothing wraps. Every sentence the page
  speaks in its own voice looks the same; the display faces are for the title and the figures.
  The headline used to be Playfair at `min(4.4cqi, 1.5rem)`, sized so its longest line stayed
  unbroken, with `.results-panel` carrying a container context to measure against and a second
  measure for the one-line 2032 variant. **All of that is gone.** At prose size every line the
  headline can produce fits several times over, so the wording can change without re-measuring
  anything — which is what that arithmetic existed to protect.
  `.match-instructions span` is still `display: block`, so the break lands after "column," at every
  width, but it is no longer `nowrap`: at prose size the first clause measures 434px and would put a
  phone into a horizontal scroll. It holds two lines down to 600px, three to 390px and four at 320px,
  with no overflow at any width.

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
`governorCanVeto` was false, which asked one small shape to carry two unrelated facts; that veto now
has a mark of its own beside it, and the pyramid says only who holds each branch.

`districts2032` is read by the 2032 board (see below). `governorCanVeto` and `hasBallotInitiative`
are read as the two **route marks** in the box header — see the Key Concepts entry below.
`independentCommission` has no reader; keep it. It is deliberately strict, true only where a
commission holds the pen outright (AZ, CO, ID, MI, MT, WA); politician and advisory commissions and
New York's overridable one are all `false`, because elected officials still decide. It tracks the map
in force for 2026, not the standing rule — California is `false` because Prop 50 suspended its
commission through 2030. `efficiencyGap` is deliberately *not* among these, since it came from the
PlanScore methodology the representation gap replaced.

All three describe **congressional** lines and only those. Several states set their state legislative
lines by a route the governor never sees while their congressional map is an ordinary bill he can
veto — Florida, Maryland and Mississippi are all like this, and conflating the two is the standard way
to get this table wrong. The per-state reasoning lives in `data/mapDrawingRules.md`, which is where to
go before changing a value; there is no automated check for any of it.

Branch control moves with elections, so it dates in a way the PVI figures don't. See "Data Sources"
in the root `README.md` for where it comes from and how to re-check it.

The DRA and ALARM alternate maps were removed: the proportional ideal is now derived from each state's
own PVI, so there is no hypothetical map to compare against. Cook's site blocks scripted fetches, so
refreshing district data means pasting a new export into `data/cook2026DistrictPVI.tsv` by hand,
keeping the header row and column order.
