# Mutually Assured Representation

An interactive map for finding US states with equal and opposite gerrymanders — pairs that could
disarm together without either party surrendering a seat.

Mid-decade redistricting turned 2026 into an arms race: ten states redrew their lines, and the median
House seat moved two points redder. Unilateral reform is a losing move, because the state that draws
a fair map hands seats to the other side. A pact isn't. If California gives back nine seats and Texas
gives back nine, the national party balance doesn't move at all — only the distortion does.

## The numbers

- **National representation gap: 90 of 435 districts.** The sum of every state's distance from
  proportional.
- **House balance: R+24** (221 R-leaning districts, 197 D-leaning, 17 undecided). This never moves
  when a pact is signed, which is the entire argument.

## How the math works

**Representation gap** — for each state, compare the seats the enacted map actually allocates to each
party against the seats a proportional split of that state's own partisan lean would give:

```
exact ideal      = districts × (50 − statePVI) / 100
fair R districts = the whole part, plus the last one if R clears 75% of it
fair D districts = the rest, less the last one if neither party clears 75%
gap              = how far the squeezed party falls short of its fair number
```

Positive means Republicans are overrepresented, negative means Democrats are. Both figures come from
Cook PVI, so they sit on the same scale, and everything is whole districts.

A district within a point of even — `EVEN_BAND`, so `|PVI| <= 1` — is one the map hasn't decided.
Cook rates seven districts exactly `EVEN`, but the band takes in seventeen, and the ten it adds are
the ones nobody has called: four are rated Toss Up, three Lean, three Likely, none Solid. In a
midterm on a neutral environment, a seat a point off even is a seat in play, and drawing the line at
exactly `EVEN` made the boundary an artifact of where Cook's rounding fell. Such a district counts for
neither party, and it is not taken out of the delegation the fair split divides — so it shows up as
the squeezed party being a district short, which is exactly what it is. **Virginia should have 5R. It has 4R drawn and
one district left undecided. Its gap is 1.** The matching view lists that district beside the enacted
count rather than folding it into either tally, so Virginia's 2026 row reads `1E 4R` against a fair
`5R`.

The fair map has toss-ups of its own, for the same reason. A state's exact ideal almost never lands on
a whole number of districts, and the leftover fraction used to be rounded away — whichever party held
more than half of the last district got all of it, however little more. New Mexico's ideal is 1.38 of
3 districts, and the 0.38 Republicans were owed vanished into a second Democratic seat because
0.38 < 0.5.

So the leftover gets a band too. A party has to clear the midpoint of the last district's half — three
quarters of it — to be handed the seat outright; short of that the fair map leaves it undecided, which
is what it is. New Mexico's fair map becomes 1R, 1D and a toss-up. 22 states carry one. Where a state
has a toss-up on both sides of the comparison the two cancel and the gap is read off the party counts
alone: Michigan is `1E 6D` fair against `2E 5D` enacted, a gap of 1.

Which states get one has nothing to do with how partisan they are — it turns on where the leftover
fraction happens to fall. West Virginia at R+21 has an ideal of 1.42 and gets a toss-up; Nevada at R+1
has an ideal of 2.04 and doesn't. Single-district states are exempt, since their only seat *is* the
whole delegation and the band would ask a party to clear 75% of the state to be owed its one
representative.

**Pacts** — a pact converts the same number of districts in **both** partners, so its national effect
is double what either one gives up. The smaller partner sets the price: a state with a 3-district gap
can only buy 3 districts of disarmament from a partner with 9, and the remaining 6 stays on the map.

What can trade for what is decided by a single rule: **the House balance must not move.** Two party
districts trade cleanly — one state draws a D district R, the other draws an R district D, and both
columns end where they started. Two undecided districts trade cleanly for the same reason: one state
draws its EVEN district R, the other draws its own D, and each column gains one.

An EVEN district cannot be traded against a party district. Drawing an undecided district R adds to
the R column without taking anything from D, while the partner flipping an R district to D moves one
across — R comes out level, D a seat ahead, and the balance has moved. That trade is refused rather
than allowed to cost the thing the pacts exist to protect.

So each state's gap has two parts, and they settle separately: party districts drawn the wrong way,
and surplus EVEN districts. Michigan's EVEN district is not surplus — its fair map calls for a
toss-up — so Michigan trades on its party gap alone, like a state with no EVEN district at all.

Four states carry a surplus undecided district on the D-drawn side (CA, NV, NY, VA) and four on the
R-drawn side (AZ, MI, OH, PA), so undecided districts have somewhere to go. A state whose whole gap is
undecided districts has no party gap at all, and its only productive partners are those surplus states
across the gutter. Pair one of them with anyone else and the pact pays out zero, which the badges show
honestly as `0`.

Columns in the matching view are split by **which way each state's map is drawn** — the direction of
its representation gap, D-drawn on the left and R-drawn on the right. That's the thing a pact trades,
so every pairing across the gutter has seats in it. A state's own partisan lean is a close proxy: 43
of the 44 multi-district states sit on the side their statewide PVI names. Nevada is the exception,
R+1 but D-gerrymandered by a seat, and it sits with the states it can actually disarm.

Ten states carry no gap and so no side — Colorado, Hawaii, Idaho, Kansas, Maine, Minnesota,
Mississippi, Nebraska, Utah and West Virginia. They fall back to their lean, which settles all ten. Below that sits a third test, on **who holds
the branches**, for a state that has no gap *and* an exactly EVEN lean: the signatory is the state
government, so its party is better read off the government than off a rounded statewide margin, and
Democrats have to win the branches outright so a state that split them evenly would stay on the
right. Nothing reaches that test today. It was there for Michigan, whose fair map of 6R, 6D and a
toss-up against an enacted 7R and 5D leaves its Democrats a district short; the code keeps it,
because the data moves.

## Running it

```bash
npm install
npm run dev      # dev server on :5173
npm run build    # type-check and build for production
npm run preview  # preview the production build
```

## Data

Everything partisan comes from Cook PVI: 2026 district leans and 2025 state leans, the latest
published for each. State and district figures share one definition, which is what makes the
representation gap well defined — there is no second methodology in the repo.

```
src/data/
├── cook2026DistrictPVI.tsv         # 2026 Cook PVI, all 435 districts
├── districtLeans.ts                # Parses that file into per-state seat counts
├── stateData.ts                    # 50 states: 2025 Cook PVI, seat count, map-drawing authority
└── computeRepresentationGap.ts     # Per-state gaps, pact math, national total
```

Both sources are read at runtime. There are no build scripts and no generated files — edit them
directly. Map *rendering* inputs are separate: the TopoJSON boundaries and the mushroom-cloud image
sit in `src/map/`, imported so Vite emits them as hashed files rather than inlining them into the
bundle.

### stateData.ts

Two fields drive the representation gap:

- `partisanLean` — the **2025 statewide Cook PVI**, signed so positive is D. Redistricting doesn't
  move a statewide PVI (it's the state's own presidential vote versus the nation's), so pairing 2025
  state figures with 2026 district figures is sound: the 2026 release left the statewide numbers
  unchanged.
- `districts2022` — seat count under the 2022 apportionment.

Three more describe **who can sign a pact**, and are drawn as the control pyramid on each box in the
match graph — `governorParty` on top, `senateParty` and `houseParty` as the course beneath:

- Each is `'dem'`, `'rep'`, or `'split'`. `'split'` on a chamber means no party commands it: a tie
  (Minnesota's 67–67 House) or a cross-party coalition (both of Alaska's).
- `houseParty` is `null` for Nebraska alone, whose legislature is unicameral — and officially
  nonpartisan, though its members' own registration runs R.
- A trifecta is simply all three agreeing, which is why the verdict isn't stored separately. The
  pyramid shows *which* branch is the holdout, and that's the part that decides whether a state can
  actually enter a pact.

**Every state shows its pyramid, and every pyramid stands upright.** Who holds each branch is all
the mark says.

`governorCanVeto` is recorded but **nothing reads it**. It used to flip the pyramid upside-down for
the eleven states whose governor can't veto the congressional map (AZ, CO, CT, HI, ID, MI, MT, NC,
NJ, VA, WA — CT and NC set their lines by joint resolution, the other nine use commissions that
leave the governor out of the process). That made one small shape carry two unrelated facts, so the
orientation is gone and the field joins the other map-drawing ones kept for pact-feasibility work.

`independentCommission` is likewise recorded but **unread** — it's kept for pact-feasibility work,
like the other map-drawing fields. It's deliberately strict: true only where a commission holds the
pen outright, which is six states (AZ, CO, ID, MI, MT, WA). Politician commissions (HI, NJ, VA),
advisory commissions (AK, IA, ME, MD, NM, RI, UT) and New York's overridable one are all false,
because elected officials still decide. New York is the useful test — its legislature overrode the
commission in 2022 and 2024, and its governor can veto the map, which a commission holding the pen
would leave nothing to do.

`districts2032` and `hasBallotInitiative` likewise have no runtime reader and are deliberately kept —
a ballot initiative is a route around a hostile legislature.

Both fields describe the map **actually in force for 2026**, not the state's standing rule, and the
mid-decade wave moved several:

- **California** — Prop 50 (Nov 2025) suspended the citizens' commission and handed the pen to the
  legislature through 2030; the commission resumes in 2031. So California is a pyramid, not a circle.
- **Virginia** — the April 2026 amendment that would have bypassed its commission passed 51%, then
  the Supreme Court of Virginia struck it down on May 8, 2026. The commission stands, so Virginia
  keeps its circle.
- **Arkansas and Missouri** — both were once miscategorized as commission states. Their commissions
  draw *state legislative* lines only; congressional maps come from the legislature, and Missouri's
  governor signed one in September 2025.

#### Refreshing branch control

Unlike the PVI figures, this **goes out of date on an election calendar** — every regular November,
plus the occasional special election, party switch, or resignation. As recorded, the branch fields
come to 16 D trifectas, 23 R and 11 split, and the chambers alone to 57 R and 39 D.

There's no clean API for it, and the states that break automated counts are exactly the ones this app
cares about, so the edits stay manual. `npm run check:control` narrows down where to look:

```
npm run check:control
```

It pulls the nightly [Open States legislator roster](https://open.pluralpolicy.com/data/legislator-csv/)
(no API key), counts each chamber by party, and prints every chamber that disagrees with
`stateData.ts`. It **never writes** — it exits 1 with a list of states to go read. Then:

1. Check each flagged state against
   [Ballotpedia's trifecta table](https://ballotpedia.org/State_government_trifectas) and edit
   `stateData.ts` by hand.
2. Cross-check the chamber totals it prints against
   [NCSL's partisan composition](https://www.ncsl.org/about-state-legislatures). Two independent
   sources agreeing on both the trifecta counts *and* the chamber counts is a real check; either one
   alone can hide two offsetting errors.
3. Verify per state, not just on the totals — the national figures survive compensating mistakes.

**Two things it cannot do**, both by design:

- **Governors are invisible to it.** The roster is legislators only, so the branch most likely to
  flip is the one branch it can't see. Every run says so. Check all 50 by hand after a statewide
  election.
- **A seat count is not control.** Three states disagree with the roster on every run and are
  correct as recorded: Alaska (coalitions running both chambers read as R pluralities), Nebraska
  (nonpartisan, so nothing resolves), and Maine (a D-organized House that never reaches 76 of 151).
  The script carries them as named blind spots with reasons, and still prints them, so a genuine
  change in one isn't swallowed by its own exemption.

That's the whole argument for report-over-write: a script that patched `stateData.ts` from the
roster would silently declare Alaska a Republican trifecta.

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

- The fair R district count is the whole part of `districts × (50 − statePVI) / 100`, with the last
  district awarded only to a party clearing 75% of it and left as a toss-up otherwise. 22 states carry
  such a toss-up; single-district states are exempt and fall back to rounding.
- Districts within `EVEN_BAND` of even — `|PVI| <= 1`, which is 17 districts across 12 states — count
  for neither party and stay in the delegation the fair split divides, so each one shows up as its
  state's squeezed party being a district short. Every gap is a whole number, and the national
  baseline is 90.

One known limitation: proportionality from statewide PVI ignores political geography. Democratic
voters are concentrated in cities, so a state can land far from its PVI-proportional ideal without
anyone drawing a deliberate gerrymander. California's D+16 gap under the post–Prop 50 map is the
extreme case.

## Credits

By Declan Fitzsimons. 2026 district and 2025 state partisan leans come from
[The Cook Political Report](https://www.cookpolitical.com/cook-pvi/2026-partisan-voting-index/district-map-and-list).
