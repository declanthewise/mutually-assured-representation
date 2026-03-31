import { StateData } from '../types';
import { SafeSeatCounts } from '../data/districtData/safeSeats';
import { stateDataById } from '../data/stateData/stateData';

/**
 * Computes a state's representation gap: how many seats the enacted map
 * over- or under-allocates relative to the proportional ideal derived
 * from Cook PVI.
 *
 * Positive → R overrepresented (R gerrymander)
 * Negative → D overrepresented (D gerrymander)
 *
 * "Even" seats (|lean| < threshold) are excluded from enacted R/D counts
 * because they are genuinely competitive — not controlled by the mapmaker.
 */
export function computeRepresentationGap(state: StateData, counts: SafeSeatCounts): number {
  const idealRFraction = (50 - state.partisanLean) / 100;
  const idealRSeats = Math.round(state.districts2022 * idealRFraction);
  const enactedRSeats = counts.safeR + counts.leanR;
  return enactedRSeats - idealRSeats;
}

/**
 * Computes the national representation gap: the sum of absolute per-state gaps.
 *
 * TX+5R and CA+5D each contribute 5, totalling 10 (not 0).
 */
export function computeNationalRepresentationGap(safeSeats: Record<string, SafeSeatCounts>): number {
  let total = 0;
  for (const [stateId, counts] of Object.entries(safeSeats)) {
    const stateData = stateDataById[stateId];
    if (!stateData) continue;
    total += Math.abs(computeRepresentationGap(stateData, counts));
  }
  return total;
}
