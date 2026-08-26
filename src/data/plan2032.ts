import { MatchPair, StateData } from '../types';
import { FairSplit, fairSplitOf } from './computeRepresentationGap';
import { holdsDemocraticBranches, stateData, stateDataById } from './stateData';

/**
 * The board as it stands after the 2030 census, when every state redraws at once.
 *
 * **The board starts from a clean sheet.** No 2032 map exists, and this file does not
 * invent one: the minority districts a state holds in 2032 are the ones a pact puts
 * there, and nothing else. A state that signs nothing delivers nothing.
 *
 * That is the difference from the 2026 board, and it is deliberate. In 2026 the middle
 * row is an enacted map and the gap is what that map denies. Here the middle row is
 * the pact itself, so before a pact there is no figure to state — the box leaves both
 * lower rows blank rather than writing a zero, because zero is a measurement and there
 * is nothing yet to measure. Carrying today's gerrymandering forward was tried and
 * pulled out: it made the second board a restatement of the first, and the argument it
 * is here to make is about the districts on the table, not about who is ahead now.
 *
 * **The ideal** is `fairSplitOf()` against `districts2032`. Reapportionment moves how
 * many districts a state draws, not how it votes, so the statewide PVI carries over
 * untouched and the fair split falls straight out of it. A state's baseline gap is
 * that whole fair minority share, and a pact is the only thing that closes any of it.
 *
 * **Nothing in this file reads today's map.** The district-level Cook leans in
 * `districtLeans.ts` describe districts that will not exist, and the projection that
 * once carried them forward is gone along with the stat bar that was its only reader.
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
 * A state's baseline 2032 gap: its whole fair minority share, since a state that has
 * signed nothing has delivered nothing. Signed the way the 2026 gap is — positive when
 * the Democrats are the short side, so positive means R overrepresented — which makes
 * it negative on the D-leaning left column and positive on the R-leaning right.
 *
 * The box never shows this figure at rest. It is what a pact is measured against, and
 * what the national total is built from; the row itself stays blank until there is a
 * pact to put a number in it.
 */
export function baselineGap2032Of(state: StateData): number {
  const owed = minorityFair2032(state);
  return isDemocraticSide2032(state) ? -owed : owed;
}

/** Baseline signed 2032 gap for every matchable state, keyed by id. */
export const baselineGaps2032: Record<string, number> = Object.fromEntries(
  matchable2032States.map(s => [s.id, baselineGap2032Of(s)]),
);

/** Magnitude of what a state owes its minority — the weight it carries into a pact. */
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
 * The gap the pacts have actually left behind — every signed state's remaining
 * shortfall, and nothing at all from a state that hasn't signed.
 *
 * This is the stat bar's figure, and it is **not** the sum of every state's residual
 * gap. It starts at **0** and grows, which is the same thing the boxes do: a state's
 * gap row is blank until it has a pact, because before one there is no map and so
 * nothing to be short of. A bar reading 182 over a board of blank rows would be
 * asserting the very number the board is refusing to assert.
 *
 * A pact that returns nothing still counts both partners in full. They signed, so
 * they have a map, and it leaves them exactly as short as they started.
 */
export function computeStatedGap2032(selectedMatches: MatchPair[]): number {
  let total = 0;
  for (const [a, b] of selectedMatches) {
    const returned = pact2032Returned(a, b);
    for (const id of [a, b]) {
      total += Math.abs(baselineGaps2032[id] ?? 0) - returned;
    }
  }
  return total;
}

/**
 * Districts the pacts have settled so far, by party.
 *
 * A state that signs draws its map, and every district in the fair minority's share is
 * decided one way or the other by doing so. The pact hands `returned` of them to the
 * minority; **whatever it leaves short goes to the majority**, because those districts
 * do not stay blank — the state drew them, and it drew them for itself.
 *
 * So an evenly matched pact keeps the House exactly where it was: each partner gives
 * its minority the same number, the partners sit in opposite columns, and the two
 * cancel. California against Texas is 18 each and the margin holds at EVEN. A mismatch
 * doesn't cancel: California against Florida trades 14, and the 4 California still owes
 * its Republicans are drawn Democratic instead, so the House tilts D+4.
 *
 * That tilt is the honest reading of an uneven pact, and it is the argument for pairing
 * states of like size — the residual isn't a rounding error, it is seats.
 *
 * A pact that returns nothing still counts: both partners drew their maps and gave
 * their minorities none of it.
 */
export function computeDrawn2032(selectedMatches: MatchPair[]): { rSeats: number; dSeats: number } {
  let rSeats = 0;
  let dSeats = 0;
  for (const [a, b] of selectedMatches) {
    const returned = pact2032Returned(a, b);
    for (const id of [a, b]) {
      const state = stateDataById[id];
      if (!state) continue;
      // What the pact left short, which the state's own majority draws for itself.
      const conceded = Math.abs(baselineGaps2032[id] ?? 0) - returned;
      // A D-leaning state's pact draws districts for its Republicans, and vice versa.
      if (isDemocraticSide2032(state)) {
        rSeats += returned;
        dSeats += conceded;
      } else {
        dSeats += returned;
        rSeats += conceded;
      }
    }
  }
  return { rSeats, dSeats };
}

/**
 * The national 2032 gap before any pact: every minority district the fair maps owe,
 * which on a clean sheet is every one of them — **182**.
 *
 * Every matchable state carries one, since every state owes its minority something.
 * The best any pairing can do is leave 28: a pact is capped by the lesser partner, the
 * left column owes 77 in total, and the 26 states on the right can cover all 17 on the
 * left, so 154 is the most that can come home.
 */
export const baseline2032Gap: number = matchable2032States.reduce(
  (total, state) => total + Math.abs(baselineGap2032Of(state)),
  0,
);
