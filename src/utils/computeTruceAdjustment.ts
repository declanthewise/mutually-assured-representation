import { SafeSeatCounts, stateSafeSeats } from '../data/districtData/safeSeats';
import { alternateMapSafeSeats } from '../data/districtData/alternateMapPVIs';
import { MatchPair } from '../types';

/**
 * Compute adjusted SafeSeatCounts by replacing matched states' enacted
 * seat counts with alternate-map seat counts.
 *
 * Unmatched states keep their enacted SafeSeatCounts.
 */
export function computeAdjustedSafeSeats(
  selectedMatches: MatchPair[],
): Record<string, SafeSeatCounts> {
  // Start from a copy of the baseline
  const result: Record<string, SafeSeatCounts> = { ...stateSafeSeats };

  for (const [stateA, stateB] of selectedMatches) {
    // Replace each matched state with its competitive-map data (if available)
    if (alternateMapSafeSeats[stateA]) {
      result[stateA] = alternateMapSafeSeats[stateA];
    }
    if (alternateMapSafeSeats[stateB]) {
      result[stateB] = alternateMapSafeSeats[stateB];
    }
  }

  return result;
}
