import { MatchPair, StateData } from '../types';
import { FairSplit, fairSplitOf } from './computeRepresentationGap';
import { holdsDemocraticBranches, stateData } from './stateData';

/**
 * The board as it stands after the 2030 census, when every state redraws at once.
 *
 * The 2026 board is an argument about maps that exist: it measures an enacted map
 * against the state's proportional ideal and calls the difference a representation
 * gap. None of that survives reapportionment. There is no 2032 map to measure, and
 * so **no representation gap anywhere in this module** — the district-level Cook
 * leans in `districtLeans.ts` describe districts that will not exist, and nothing
 * here reads them.
 *
 * What is left is the half that doesn't depend on an enacted map: each state's own
 * statewide PVI, and how many districts it will have to draw. Those two give the
 * fair split directly, so the whole board is built out of `fairSplitOf()` against
 * `districts2032` — the same ideal the 2026 board uses, asked of the delegation the
 * census leaves the state with rather than the one it has now.
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

/** Lookup over the matchable set only, so an unmatchable id can't seal a pact. */
const state2032ById: Record<string, StateData> = Object.fromEntries(
  matchable2032States.map(s => [s.id, s]),
);

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
 * Districts a pact commits **each** partner to draw for the other's party, so its
 * national effect is double this number — the same shape as `pactSeatsReturned()`,
 * and for the same reason.
 *
 * **The House balance must not move.** One state draws R districts it would rather
 * draw D and the other does the reverse, so the trade only exists between opposite
 * columns, and only up to the lesser of the two fair minorities. Whatever the larger
 * partner still owes its minority is left on the table — a pact can't hand over more
 * than its partner can match without moving the margin, which is the one thing the
 * whole tool refuses to do.
 */
export function pact2032Returned(stateA: string, stateB: string): number {
  const a = state2032ById[stateA];
  const b = state2032ById[stateB];
  if (!a || !b) return 0;
  // Same column — nothing to trade, exactly as two same-direction gerrymanders
  // return nothing on the 2026 board.
  if (isDemocraticSide2032(a) === isDemocraticSide2032(b)) return 0;
  return Math.min(minorityFair2032(a), minorityFair2032(b));
}

/**
 * Districts each state has been committed to by the selected pacts, keyed by id and
 * zero for a state that hasn't signed. Both halves of a pact commit the same number,
 * which is what the box's second row counts.
 */
export function computeReturned2032(selectedMatches: MatchPair[]): Record<string, number> {
  const returned: Record<string, number> = Object.fromEntries(
    matchable2032States.map(s => [s.id, 0]),
  );

  for (const [stateA, stateB] of selectedMatches) {
    const seats = pact2032Returned(stateA, stateB);
    if (seats === 0) continue;
    returned[stateA] = seats;
    returned[stateB] = seats;
  }

  return returned;
}

/**
 * Every minority district the fair maps owe nationally — the pool the results panel
 * measures a run against, and the counterpart of the 2026 board's baseline gap.
 *
 * It is a ceiling rather than a target: pacts are capped pairwise by the lesser
 * partner, so no pairing of the board delivers all of it.
 */
export const national2032Fair: number = matchable2032States.reduce(
  (total, state) => total + minorityFair2032(state),
  0,
);

/** Districts the selected pacts commit nationally — both halves of every pact. */
export function computeNational2032Returned(selectedMatches: MatchPair[]): number {
  return selectedMatches.reduce((total, [a, b]) => total + pact2032Returned(a, b) * 2, 0);
}
