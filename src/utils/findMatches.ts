import { StateData } from '../types';
import { stateSafeSeats, SafeSeatCounts } from '../data/districtData/safeSeats';
import { alternateMapSafeSeats } from '../data/districtData/alternateMapPVIs';

/**
 * Compute the partisan seat balance of a safe-seat breakdown.
 * Positive = R advantage (more R-leaning seats), Negative = D advantage.
 */
function seatBalance(seats: SafeSeatCounts): number {
  return (seats.safeR + seats.leanR) - (seats.safeD + seats.leanD);
}

/**
 * Compute the delta between enacted and alternate (DRA) map balance.
 * Positive = enacted map favors R more than the alternate map would.
 * Negative = enacted map favors D more than the alternate map would.
 * Returns null if data is not available.
 */
export function getBalanceDelta(stateId: string): number | null {
  const enacted = stateSafeSeats[stateId];
  const proposed = alternateMapSafeSeats[stateId];
  if (!enacted || !proposed) return null;
  return seatBalance(enacted) - seatBalance(proposed);
}

// Match thresholds
const DELTA_SUM_THRESHOLD = 2;       // Max |delta_A + delta_B| for a match (seats)
const STRONG_MATCH_THRESHOLD = 1;    // Max |delta_A + delta_B| for a "strong" match (seats)
const STRONG_PARTISAN_THRESHOLD = 3; // Partisan lean above which opposite-party is required

/**
 * Check if a match is "strong" — the deltas nearly perfectly cancel out.
 */
export function isStrongMatch(
  state: StateData,
  match: StateData,
): boolean {
  const stateDelta = getBalanceDelta(state.id);
  const matchDelta = getBalanceDelta(match.id);
  if (stateDelta === null || matchDelta === null) return false;
  return Math.abs(stateDelta + matchDelta) <= STRONG_MATCH_THRESHOLD;
}

/**
 * Find MAR partners for a given state.
 *
 * Matches states whose enacted-to-alternate-map balance deltas
 * are nearly equal and opposite: if both states adopt alternate maps,
 * the net national partisan effect is close to zero.
 */
export function findMatches(
  state: StateData,
  allStates: StateData[],
): StateData[] {
  const stateDelta = getBalanceDelta(state.id);
  if (stateDelta === null) return [];
  const stateDistricts = state.districts2022;

  return allStates
    .filter(other => {
      if (other.id === state.id) return false;

      // Skip single-district states (can't be gerrymandered)
      if (other.districts2022 === 1) return false;

      const otherDelta = getBalanceDelta(other.id);
      if (otherDelta === null) return false;

      // Deltas must be opposite direction (zero-delta states can match either)
      if (stateDelta !== 0 && otherDelta !== 0 &&
          Math.sign(stateDelta) === Math.sign(otherDelta)) return false;

      // Strongly partisan states must match with opposite-party states
      const eitherStronglyPartisan =
        Math.abs(state.partisanLean) > STRONG_PARTISAN_THRESHOLD ||
        Math.abs(other.partisanLean) > STRONG_PARTISAN_THRESHOLD;
      if (eitherStronglyPartisan &&
          Math.sign(state.partisanLean) === Math.sign(other.partisanLean)) return false;

      // Similar district count (within 30%)
      const minDistricts = Math.min(stateDistricts, other.districts2022);
      const maxDistricts = Math.max(stateDistricts, other.districts2022);
      if (maxDistricts / minDistricts > 1.3) return false;

      // Deltas must nearly cancel out
      return Math.abs(stateDelta + otherDelta) <= DELTA_SUM_THRESHOLD;
    })
    .sort((a, b) => {
      // Sort by how close the delta sum is to zero (best matches first)
      const aDelta = getBalanceDelta(a.id)!;
      const bDelta = getBalanceDelta(b.id)!;
      return Math.abs(stateDelta + aDelta) - Math.abs(stateDelta + bDelta);
    });
}
