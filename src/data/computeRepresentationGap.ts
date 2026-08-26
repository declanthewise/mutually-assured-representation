import { StateData, MatchPair } from '../types';
import { SafeSeatCounts, stateSafeSeats } from './districtLeans';
import { holdsDemocraticBranches, stateData, stateDataById } from './stateData';

/** The proportional ideal, in whole districts. Every district is allocated. */
export interface FairSplit {
  rSeats: number;
  dSeats: number;
}

/**
 * What the state's own Cook PVI says its delegation should look like, in whole
 * districts: `districts × R share of the two-party vote`, with the last district
 * going to whichever party holds the larger claim on it.
 *
 * The last district is settled by rounding, which is a knife edge — but it is the
 * knife edge a real negotiation would fall off, since the party that wins the
 * argument about a state's last district is the one with the majority of it. The
 * fair map names an owner for every district, and the enacted map's undecided
 * districts are then the ones nobody has drawn for anybody.
 *
 * Michigan is the one state the rounding can't settle: 13 districts at EVEN is
 * exactly 6.50, so its Democrats and Republicans have identical claims on the last
 * one. It falls to who holds the state government, which is the party that would be
 * signing — Democrats, two branches to one.
 */
export function fairSplit(state: StateData): FairSplit {
  return fairSplitOf(state, state.districts2022);
}

/**
 * The same ideal against a delegation size given outright, for a board drawn on an
 * apportionment other than today's — the 2032 graph asks this of `districts2032`.
 * The lean is the state's own PVI either way, since reapportionment moves how many
 * districts a state draws and not how it votes.
 */
export function fairSplitOf(state: StateData, districts: number): FairSplit {
  // Integer arithmetic: districts × (50 − lean) is the ideal × 100 exactly, so the
  // remainder is the last district's share in hundredths with no float error. A
  // remainder of exactly 50 computed as a float could land on either side of the
  // comparison, which is Michigan's whole case.
  const scaled = districts * (50 - state.partisanLean);
  const whole = Math.floor(scaled / 100);
  const remainder = scaled % 100;

  const lastToR = remainder === 50 ? !holdsDemocraticBranches(state) : remainder > 50;
  const rSeats = lastToR ? whole + 1 : whole;
  return { rSeats, dSeats: districts - rSeats };
}

/**
 * A state's representation gap: how far the squeezed party falls short of the
 * districts its own state's PVI says it should hold. Everything is whole districts.
 *
 *   R short = fair R districts − districts drawn R
 *   D short = fair D districts − districts drawn D
 *   gap     = whichever party is shorter, signed positive when that party is D
 *             (i.e. positive → R overrepresented, negative → D overrepresented)
 *
 * A district inside EVEN_BAND is one the map hasn't drawn for anybody. It is not
 * counted for either party, and the fair map — which allocates all of them — has no
 * matching category, so it surfaces as the squeezed party being one district short.
 * That is what it is. Virginia should have 5R and has 4R drawn: a gap of one.
 *
 * The two shortfalls therefore sum to the state's undecided districts, so a state
 * holding one can read short on both sides at once. The larger is the gap: it is the
 * side that has to be made whole. The ten states holding an odd number of undecided
 * districts can't tie; where an even number splits evenly the tie falls to D, which
 * today is Arizona and Pennsylvania, both one short each way.
 */
export function computeRepresentationGap(state: StateData, counts: SafeSeatCounts): number {
  const fair = fairSplit(state);
  const rShort = fair.rSeats - counts.rSeats;
  const dShort = fair.dSeats - counts.dSeats;
  return dShort >= rShort ? dShort : -rShort;
}

/** Signed representation gap for a state id, or 0 if we have no district data. */
export function representationGapOf(stateId: string): number {
  const counts = stateSafeSeats[stateId];
  const data = stateDataById[stateId];
  if (!counts || !data) return 0;
  return computeRepresentationGap(data, counts);
}

/** Baseline signed gap for every state, keyed by id. */
export const baselineGaps: Record<string, number> = Object.fromEntries(
  stateData.map(s => [s.id, representationGapOf(s.id)]),
);

/**
 * Districts a pact hands back to the shorted party in *each* state — the figure the
 * map badges count and the results panel names. The pact's national effect is
 * double this number.
 *
 * **The House balance must not move**, which is the whole argument the tool makes,
 * and it is what makes the trade symmetric: one state draws a D district R, the
 * other draws an R district D, and both columns end where they started. So a pact
 * only pays out between states gerrymandered in opposite directions, and only up to
 * the lesser of the two gaps. Whatever gap survives stays on the map.
 */
export function pactSeatsReturned(stateA: string, stateB: string): number {
  const gapA = baselineGaps[stateA] ?? 0;
  const gapB = baselineGaps[stateB] ?? 0;
  // Same direction, or one of them has nothing to give up.
  if (gapA * gapB >= 0) return 0;
  return Math.min(Math.abs(gapA), Math.abs(gapB));
}

/**
 * Signed representation gap for every state once the selected pacts are honored.
 * Each partner sheds `pactSeatsReturned` districts of gerrymander; the sign is kept
 * so callers can still tell which party the remainder favors.
 */
export function computeResidualGaps(selectedMatches: MatchPair[]): Record<string, number> {
  const residual: Record<string, number> = { ...baselineGaps };

  for (const [stateA, stateB] of selectedMatches) {
    const returned = pactSeatsReturned(stateA, stateB);
    if (returned === 0) continue;
    residual[stateA] -= Math.sign(residual[stateA]) * returned;
    residual[stateB] -= Math.sign(residual[stateB]) * returned;
  }

  return residual;
}

/**
 * The national representation gap: the sum of absolute per-state gaps.
 *
 * TX+9R and CA-16D each contribute their full magnitude, totalling 25 (not -7).
 */
export function computeNationalRepresentationGap(gaps: Record<string, number>): number {
  let total = 0;
  for (const gap of Object.values(gaps)) {
    total += Math.abs(gap);
  }
  return total;
}
