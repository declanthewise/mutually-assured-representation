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
 * How far into the last district a party has to reach before the fair map hands it
 * over outright, as hundredths. A remainder of 75 or more claims it for R, 25 or
 * less concedes it to D, and anything between leaves it undecided.
 *
 * These are the midpoints of the two halves of the last district — the point at
 * which one party's claim on it is twice the other's. Below that neither claim is
 * strong enough to name an owner.
 */
const FAIR_CLAIM = 75;
const FAIR_CONCEDE = 25;

/**
 * What the state's own Cook PVI says its delegation should look like, in whole
 * districts: `districts × R share of the two-party vote`, with the leftover
 * fraction deciding who gets the last one.
 *
 * That leftover used to be settled by rounding, which is a knife edge — the last
 * district went to whichever party held more than half of it, however little more.
 * New Mexico is 3 districts at D+4, an ideal of 1.38, and the 0.38 Republicans were
 * owed vanished into a second Democratic seat because 0.38 < 0.5. Michigan, at
 * exactly 6.50, was the one state in the country where the knife edge was visible,
 * and it got a toss-up while every other state's remainder was rounded away in
 * silence.
 *
 * So the remainder gets a band, the same way a district does (see EVEN_BAND in
 * districtLeans.ts). A party has to clear the midpoint of the last district's half
 * — three quarters of it — to be handed it outright. Short of that the fair map
 * leaves it undecided, which is what it is: a seat neither side has earned.
 *
 * This is also what keeps the gap unambiguous. The band lines the fair map's
 * undecided districts up against the enacted map's, so the two parties' shortfalls
 * no longer both come out positive — Arizona used to read one short on each side,
 * with the sign decided by a `>=`.
 */
export function fairSplit(state: StateData): FairSplit {
  // Integer arithmetic: districts × (50 − lean) is the ideal × 100 exactly, so the
  // remainder is the last district's share in hundredths with no float error.
  // Computing the ideal as a float first would put a remainder of exactly 25 or 75
  // on the wrong side of the comparison.
  const scaled = state.districts2022 * (50 - state.partisanLean);
  const whole = Math.floor(scaled / 100);
  const remainder = scaled % 100;

  // A single-district state has no marginal seat: its only district *is* the whole
  // delegation, so the band would be asking a party to clear 75% of the state to be
  // owed its one representative. Wyoming at R+23 came out 0R 0D 1E. The seat goes to
  // whoever leads, which is what rounding did and what the band is not for.
  if (state.districts2022 === 1) {
    const rSeats = Math.round(scaled / 100);
    return { rSeats, dSeats: 1 - rSeats, even: 0 };
  }

  if (remainder >= FAIR_CLAIM) {
    return { rSeats: whole + 1, dSeats: state.districts2022 - whole - 1, even: 0 };
  }
  if (remainder <= FAIR_CONCEDE) {
    return { rSeats: whole, dSeats: state.districts2022 - whole, even: 0 };
  }
  return { rSeats: whole, dSeats: state.districts2022 - whole - 1, even: 1 };
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
