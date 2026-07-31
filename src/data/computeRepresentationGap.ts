import { StateData, MatchPair } from '../types';
import { SafeSeatCounts, stateSafeSeats } from './districtLeans';
import { stateData, stateDataById } from './stateData';

/**
 * A state's representation gap: how many seats the enacted map over- or
 * under-allocates to Republicans relative to the proportional ideal implied
 * by the state's Cook PVI.
 *
 *   ideal R seats = districts × R share of the two-party vote (from state PVI)
 *   enacted R seats = districts whose own Cook PVI leans R
 *
 * Positive → R overrepresented (R gerrymander)
 * Negative → D overrepresented (D gerrymander)
 *
 * EVEN districts (PVI exactly even) are excluded from both party counts —
 * they are genuinely competitive, so the map hands them to neither side.
 */
export function computeRepresentationGap(state: StateData, counts: SafeSeatCounts): number {
  const idealRFraction = (50 - state.partisanLean) / 100;
  const idealRSeats = Math.round(state.districts2022 * idealRFraction);
  return counts.rSeats - idealRSeats;
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
 * Seats a pact between two states hands back to the under-represented party
 * in *each* state. A pact can only unwind as much gerrymandering as its
 * smaller partner carries, so the trade is capped by the lesser gap — and
 * only counts when the two states are gerrymandered in opposite directions.
 *
 * The pact's national effect is double this number.
 */
export function pactSeatsReturned(stateA: string, stateB: string): number {
  const gapA = baselineGaps[stateA] ?? 0;
  const gapB = baselineGaps[stateB] ?? 0;
  if (gapA * gapB >= 0) return 0; // same direction (or one is already even) — nothing to trade
  return Math.min(Math.abs(gapA), Math.abs(gapB));
}

/**
 * Signed representation gap for every state once the selected pacts are honored.
 * Each partner sheds `pactSeatsReturned` seats of gerrymander; the sign is kept
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
