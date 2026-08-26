import { MatchPair, StateData } from '../types';
import { FairSplit, fairSplitOf } from './computeRepresentationGap';
import { stateSafeSeats } from './districtLeans';
import { holdsDemocraticBranches, stateData } from './stateData';

/**
 * The board as it stands after the 2030 census, when every state redraws at once.
 *
 * It is the 2026 board over a different apportionment, and deliberately nothing more
 * clever than that: the same ideal, the same gap, the same pact math, so a reader who
 * has played one board already knows how to play this one.
 *
 * Two halves, and both are projections:
 *
 * **The ideal** is `fairSplitOf()` against `districts2032`. Reapportionment moves how
 * many districts a state draws, not how it votes, so the statewide PVI carries over
 * untouched and the fair split falls straight out of it.
 *
 * **The enacted map** is today's, held at the same level of gerrymandering and scaled
 * to the new delegation: a state drawing 4 of its 52 districts for the minority is
 * taken to draw 4 of 48. That is a projection, not a forecast — nobody knows what any
 * state will draw in 2031 — but it is the neutral one. It assumes only that states
 * keep doing what they are doing now, which makes the 2032 gap a statement about the
 * census rather than about anybody's intentions, and it lands at 97 against 2026's
 * 104, near enough to read as the same map on a different map of the country.
 *
 * The minority-party count is the one that gets scaled, because it is the only one
 * the board ever shows and the only one the gap is measured from — on the 2026 board
 * the displayed gap is always exactly the minority party's own shortfall, since the
 * column a state sits in is the side its gerrymander squeezes.
 *
 * Apportionment projections: Brennan Center.
 * https://www.brennancenter.org/our-work/analysis-opinion/how-states-seats-us-house-could-change-after-next-census
 */

/**
 * Single-district states have no map to draw, so they never enter a pact — the same
 * rule as the 2026 board, read off the projected delegation instead of today's.
 *
 * The set moves by one: Rhode Island is projected to lose its second district and
 * drops out, leaving 43 matchable states against 2026's 44. Idaho gains a third and
 * was already in.
 */
export const matchable2032States = stateData.filter(s => s.districts2032 >= 2);

/** The proportional ideal on the projected delegation. */
export function fairSplit2032(state: StateData): FairSplit {
  return fairSplitOf(state, state.districts2032);
}

/**
 * Which column a state sits in: D-leaning left, R-leaning right, read off the
 * statewide PVI alone.
 *
 * The 2026 board splits on the direction of the state's *gerrymander*, because that
 * is what a pact trades away, and reads lean only where no gap names a side. Here
 * there is no gerrymander yet to point either way — that is the point of drawing the
 * board before the maps — so lean is not a fallback but the whole test. It is a
 * close proxy in any case: on the 2026 board 43 of the 44 matchable states sit on
 * the side their own PVI names.
 *
 * Two states are exactly EVEN and so unplaced by lean: Michigan and Wisconsin. They
 * fall to who holds the branches, which is the same last-resort question
 * `isDemocraticSide()` and `fairSplit()` ask — which party would actually be signing
 * — and it settles both, Michigan left on two branches to one and Wisconsin right on
 * one to two.
 */
export function isDemocraticSide2032(state: StateData): boolean {
  if (state.partisanLean !== 0) return state.partisanLean > 0;
  return holdsDemocraticBranches(state);
}

/**
 * The districts a state's fair map owes the party its column squeezes — the R share
 * on the left, the D share on the right, matching `minorityProportionalOf()` on the
 * 2026 board. This is the figure a 2032 pact spends: what the state is being asked
 * to hand over rather than draw itself into.
 */
export function minorityFair2032(state: StateData): number {
  const fair = fairSplit2032(state);
  return isDemocraticSide2032(state) ? fair.rSeats : fair.dSeats;
}

/**
 * The minority districts today's map draws, carried to the projected delegation at
 * the same rate and rounded to the nearest whole district.
 *
 * Done in integers, like `fairSplitOf()` and for the same reason — a half district
 * has to land on a definite side. **A tie rounds down**, toward fewer minority
 * districts, because the party holding the pen is the one that would win the argument
 * over a district that could go either way, and the whole premise here is that states
 * keep gerrymandering. Exactly one state reaches the tie: Minnesota, 4 of 8 districts
 * drawn R and projected to 7, which is 3.50 on the nose.
 *
 * `floor((2·count·new + old − 1) / (2·old))` is round-half-down in whole numbers, so
 * no float ever decides it.
 */
function projectedMinority(count: number, oldDistricts: number, newDistricts: number): number {
  return Math.floor((2 * count * newDistricts + oldDistricts - 1) / (2 * oldDistricts));
}

/** A state's projected 2032 delegation. Always sums to `districts2032`. */
export interface Seats2032 {
  rSeats: number;
  dSeats: number;
  even: number;
}

/**
 * Today's delegation carried to the projected one, for **all fifty states** — the
 * board drops the single-district ones, but the House does not, and Rhode Island
 * still sends somebody.
 *
 * The minority count is scaled, and so is the undecided count, because both are
 * facts about how the map was drawn. **The majority takes whatever is left**, which
 * is what makes the three sum to the new delegation exactly and is the same premise
 * the rest of this file rests on: the party holding the pen takes the districts a
 * state gains and protects its own when a state loses them. It never goes negative —
 * the two scaled counts would have to round up past the whole delegation between them
 * — but it is clamped anyway, since the data moves.
 *
 * Which party counts as the minority follows `isDemocraticSide2032()`, so it is read
 * off lean rather than off the 2026 gap. The one state where those disagree is
 * Nevada, which the 2026 board seats on the left with its D-drawn map and this one
 * seats on the right with its R+1 lean; the 2032 columns are built on lean, so this
 * follows lean.
 */
export const stateSeats2032: Record<string, Seats2032> = Object.fromEntries(
  stateData.map(state => {
    const counts = stateSafeSeats[state.id];
    const { districts2022: from, districts2032: to } = state;
    const demSide = isDemocraticSide2032(state);

    const minority = counts
      ? projectedMinority(demSide ? counts.rSeats : counts.dSeats, from, to)
      : 0;
    const even = counts ? projectedMinority(counts.even, from, to) : 0;
    const majority = Math.max(0, to - minority - even);

    return [
      state.id,
      {
        rSeats: demSide ? minority : majority,
        dSeats: demSide ? majority : minority,
        even,
      },
    ];
  }),
);

/**
 * The districts the projected map gives the party this state's column squeezes — the
 * box's middle row, and what its gap is measured from.
 */
export function minorityEnacted2032(state: StateData): number {
  const seats = stateSeats2032[state.id];
  if (!seats) return 0;
  return isDemocraticSide2032(state) ? seats.rSeats : seats.dSeats;
}

/**
 * The projected House, across all 435 districts. Fixed, and independent of any pact —
 * that is the whole argument, and it is why a pact trades in both directions at once.
 *
 * It comes to **229R 189D 17 EVEN, a margin of R+40**, against today's R+24. The
 * sixteen points are reapportionment alone: no map here is drawn any differently than
 * it is now, and the seats still move, because they move toward the states that
 * already draw R. It is the one figure on the 2032 board that no pact can touch.
 */
export const nationalSeatTotals2032 = Object.values(stateSeats2032).reduce(
  (acc, c) => ({
    rSeats: acc.rSeats + c.rSeats,
    dSeats: acc.dSeats + c.dSeats,
    even: acc.even + c.even,
  }),
  { rSeats: 0, dSeats: 0, even: 0 },
);

export const houseBalance2032 = nationalSeatTotals2032.rSeats - nationalSeatTotals2032.dSeats;
export const houseBalanceParty2032 = houseBalance2032 >= 0 ? 'R' : 'D';

/**
 * A state's baseline 2032 gap: how far the projected map leaves the squeezed party
 * short of its projected fair share. Signed the way the 2026 gap is — positive when
 * the Democrats are the short side, so positive means R overrepresented — which makes
 * it negative on the D-leaning left column and positive on the R-leaning right.
 *
 * Floored at zero, because a shortfall cannot be negative. Nothing reaches the floor
 * today: Minnesota is the only state whose projection meets its fair share exactly,
 * and it lands on it rather than past it. The clamp is there because the data moves —
 * leans, apportionment and the Cook file all can — and a state whose map already
 * over-delivers for its minority has nothing to close, not a gap pointing backwards.
 * It also keeps the box's equation honest: the middle row is derived as the fair count
 * less the gap, so clamping the gap is what stops that row exceeding the row above it.
 */
export function baselineGap2032Of(state: StateData): number {
  const short = Math.max(0, minorityFair2032(state) - minorityEnacted2032(state));
  return isDemocraticSide2032(state) ? -short : short;
}

/** Baseline signed 2032 gap for every matchable state, keyed by id. */
export const baselineGaps2032: Record<string, number> = Object.fromEntries(
  matchable2032States.map(s => [s.id, baselineGap2032Of(s)]),
);

/** Magnitude of a state's projected 2032 gerrymander. */
export function gapSize2032Of(state: StateData): number {
  return Math.abs(baselineGaps2032[state.id] ?? 0);
}

/**
 * Districts a pact hands back to the shorted party in *each* state, so its national
 * effect is double this number — the same shape as `pactSeatsReturned()`, and for the
 * same reason.
 *
 * **The House balance must not move.** One state draws a D district R and the other
 * draws an R district D, so the trade only exists between opposite columns, and only
 * up to the lesser of the two gaps. Whatever the larger partner is still short stays
 * on the board.
 */
export function pact2032Returned(stateA: string, stateB: string): number {
  const gapA = baselineGaps2032[stateA] ?? 0;
  const gapB = baselineGaps2032[stateB] ?? 0;
  // Same direction, or one of them has nothing to give up.
  if (gapA * gapB >= 0) return 0;
  return Math.min(Math.abs(gapA), Math.abs(gapB));
}

/**
 * Signed 2032 gap for every state once the selected pacts are honored — each partner
 * sheds `pact2032Returned` districts of it, keeping the sign so callers can still
 * tell which party the remainder favors. The counterpart of `computeResidualGaps()`.
 */
export function computeResidualGaps2032(selectedMatches: MatchPair[]): Record<string, number> {
  const residual: Record<string, number> = { ...baselineGaps2032 };

  for (const [stateA, stateB] of selectedMatches) {
    const returned = pact2032Returned(stateA, stateB);
    if (returned === 0) continue;
    residual[stateA] -= Math.sign(residual[stateA]) * returned;
    residual[stateB] -= Math.sign(residual[stateB]) * returned;
  }

  return residual;
}

/**
 * The national 2032 gap before any pact: **97**, against 2026's 104. The census costs
 * the minority parties a little less than the maps already do, which is the useful
 * thing the board says — reapportionment alone is not the emergency; the drawing is.
 *
 * Five states carry no gap: Maine, Michigan, Minnesota, Nebraska and Nevada. The best
 * any pairing can do is leave 17, since a pact is capped by the lesser partner and the
 * left column only owes 40 of the 97.
 */
export const baseline2032Gap: number = matchable2032States.reduce(
  (total, state) => total + Math.abs(baselineGap2032Of(state)),
  0,
);
