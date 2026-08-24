import { StateData, MatchPair } from '../types';
import { SafeSeatCounts, stateSafeSeats } from './districtLeans';
import { stateData, stateDataById } from './stateData';

/** The proportional ideal, in whole districts. */
export interface FairSplit {
  rSeats: number;
  dSeats: number;
  /** 1 where the state's own PVI splits its delegation exactly — a toss-up in the ideal. */
  even: number;
}

/**
 * What the state's own Cook PVI says its delegation should look like, in whole
 * districts: `districts × R share of the two-party vote`, rounded.
 *
 * Where that lands exactly on a half, the odd district is a toss-up rather than a
 * rounding: Michigan is EVEN with 13 districts, so the fair map is 6R, 6D and one
 * district neither party is owed. Rounding to 7R would hand it to Republicans on
 * nothing but the tie-breaking rule inside Math.round. Michigan is the only state
 * this reaches.
 */
export function fairSplit(state: StateData): FairSplit {
  // Integer arithmetic: districts × (50 − lean) is the ideal × 100 exactly, so a
  // remainder of 50 is a true half and not a float artifact. Computing in floating
  // point first would miss some and invent others, since a lean like 10 makes
  // (50 − lean) / 100 inexact in binary.
  const scaled = state.districts2022 * (50 - state.partisanLean);
  const even = scaled % 100 === 50 ? 1 : 0;
  const rSeats = even ? (scaled - 50) / 100 : Math.round(scaled / 100);
  return { rSeats, dSeats: state.districts2022 - rSeats - even, even };
}

/**
 * A state's representation gap: how far the squeezed party falls short of the
 * districts its own state's PVI says it should hold. Everything is whole districts.
 *
 *   R short = fair R districts − districts leaning R
 *   D short = fair D districts − districts leaning D
 *   gap     = whichever party is shorter, signed positive when that party is D
 *             (i.e. positive → R overrepresented, negative → D overrepresented)
 *
 * A district inside EVEN_BAND is one the map hasn't decided. It is **not** counted
 * for either party and it is **not** taken out of the delegation the ideal divides —
 * so it shows up as the squeezed party being one district short, which is exactly
 * what it is. Virginia should have 5R and has 4R drawn, with one district left
 * undecided: a gap of one. The box lists that EVEN district beside the enacted
 * count rather than folding it into either party's tally.
 *
 * The two shortfalls sum to the EVEN districts the enacted map holds beyond the
 * ideal's own, which is why the larger of them is the gap: it is the side that has
 * to be made whole. Where the ideal carries a toss-up too — Michigan, which is EVEN
 * with an odd delegation — the two EVEN districts cancel and the gap is read off the
 * party counts alone.
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
 * EVEN districts a state holds beyond the ones its fair map wants left undecided.
 *
 * Michigan's fair map is 6R, 6D and a toss-up, so one of the two EVEN districts it
 * holds is the one it is supposed to have — that one is not surplus and cannot be
 * traded. Every other EVEN state has a fair map with no toss-up in it, so all of its
 * EVEN districts ought to have been drawn for somebody, and they are the part of its
 * gap that an EVEN-for-EVEN trade can reach.
 */
export function surplusEvenOf(stateId: string): number {
  const counts = stateSafeSeats[stateId];
  const data = stateDataById[stateId];
  if (!counts || !data) return 0;
  return Math.max(0, counts.even - fairSplit(data).even);
}

/** The part of a state's gap that is party districts drawn the wrong way. */
export function partyGapOf(stateId: string): number {
  return Math.max(0, Math.abs(baselineGaps[stateId] ?? 0) - surplusEvenOf(stateId));
}

/** What a pact moves in each partner, split by the kind of district it moves. */
export interface PactTrade {
  /** Districts drawn for one party that become the other's. */
  party: number;
  /** Undecided districts that both partners draw, one for each side. */
  even: number;
  /** Districts converted in each state — what the badges count. */
  total: number;
}

/**
 * What a pact between two states converts in *each* of them.
 *
 * **The House balance must not move.** That is the whole argument the tool makes,
 * and it is what decides which districts can be traded for which. Two party
 * districts trade cleanly: one state draws a D district R, the other draws an R
 * district D, and both columns end where they started. Two EVEN districts trade
 * cleanly for the same reason: one state draws its undecided district R, the other
 * draws its own D, and again each column gains one.
 *
 * An EVEN district cannot be traded against a party district. Drawing an undecided
 * district R adds to the R column without taking anything from D, while the partner
 * flipping an R district to D moves one across — so R comes out level, D comes out a
 * seat ahead, and the balance has moved. The trade is refused rather than allowed to
 * cost the thing the pacts exist to protect.
 *
 * So a pact is really two trades settled in the same handshake, each capped by the
 * lesser partner, and only between states gerrymandered in opposite directions:
 * party districts against party districts, surplus EVEN districts against surplus
 * EVEN districts. Michigan's EVEN district is not surplus — its fair map calls for a
 * toss-up — so Michigan trades on its party gap alone, like a state with no EVEN
 * district at all.
 */
export function pactTrade(stateA: string, stateB: string): PactTrade {
  const gapA = baselineGaps[stateA] ?? 0;
  const gapB = baselineGaps[stateB] ?? 0;
  // Same direction (or one is already even) — nothing to trade either way.
  if (gapA * gapB >= 0) return { party: 0, even: 0, total: 0 };

  const party = Math.min(partyGapOf(stateA), partyGapOf(stateB));
  const even = Math.min(surplusEvenOf(stateA), surplusEvenOf(stateB));
  return { party, even, total: party + even };
}

/**
 * Districts a pact hands back to the shorted party in *each* state — the figure the
 * map badges count and the results panel names. The pact's national effect is
 * double this number.
 */
export function pactSeatsReturned(stateA: string, stateB: string): number {
  return pactTrade(stateA, stateB).total;
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
