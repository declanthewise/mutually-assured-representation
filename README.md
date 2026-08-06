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

Michigan and Wisconsin are exactly EVEN, and a lean of zero picks no side. Those two are placed by
**who holds their branches** instead — the same signatory reasoning, taken from the government rather
than a rounded statewide margin. Michigan (D governor, D senate, R house) sits on the left, Wisconsin
(D governor, R senate, R house) on the right. Democrats have to win the branches outright, so a state
that split them evenly would stay on the right.

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

`independentCommission` and `governorCanVeto` decide **which mark** a box gets, because the pyramid
should only claim power the branches actually hold:

| Mark | Condition | States |
|---|---|---|
| Gray circle | An independent commission draws the map | AZ, CO, ID, MI, MT, WA |
| Upside-down pyramid | Governor has **no** veto over the map | CT, HI, NC, NJ, VA |
| Pyramid | The branches enact it, governor can veto | the other 39 |

A circle means none of the three branches holds the pen, so there's no structure to draw. An
inverted pyramid means the executive can't block the map — the structure rests on that point rather
than being weighed down by it.

`independentCommission` is deliberately strict: **true only where a commission holds the pen
outright**, which is six states. Everything else is false, because the elected branches still decide:

- **Politician commissions** (HI, NJ, VA) are appointed by, or seated with, legislators.
- **Advisory commissions** (AK, IA, ME, MD, NM, RI, UT) only recommend; the legislature adopts and
  the governor signs.
- **New York's** commission can be overridden by the legislature, which is what happened in 2022 and
  2024 — and its governor *can* veto the map, which is the tell. A commission that holds the pen
  leaves the governor nothing to veto.

Note that the two conditions are independent, so the inverted pyramid means only what it says: the
governor has no veto. CT and NC land there because they set lines by joint resolution; HI, NJ and VA
land there because a commission does the drawing and the governor is simply not in the process.

`districts2032` and `hasBallotInitiative` still have no runtime reader and are deliberately kept —
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

- The ideal R seat count is `round(districts × (50 − statePVI) / 100)`, so a state's gap is always a
  whole number of seats.
- Districts rated exactly `EVEN` (7 nationally) count for neither party. They're genuinely
  competitive, so the map hasn't allocated them to anyone.

One known limitation: proportionality from statewide PVI ignores political geography. Democratic
voters are concentrated in cities, so a state can land far from its PVI-proportional ideal without
anyone drawing a deliberate gerrymander. California's D+16 gap under the post–Prop 50 map is the
extreme case.

## Credits

By Declan Fitzsimons. 2026 district and 2025 state partisan leans come from
[The Cook Political Report](https://www.cookpolitical.com/cook-pvi/2026-partisan-voting-index/district-map-and-list).
