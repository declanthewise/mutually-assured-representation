import { SafeSeatCounts, stateSafeSeats } from '../data/safeSeats';
import { competitiveMapSafeSeats } from '../data/competitiveMapPVIs';
import { MatchPair } from '../types';

/**
 * Compute adjusted SafeSeatCounts by replacing matched states' enacted
 * seat counts with DRA competitive-map seat counts.
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
    if (competitiveMapSafeSeats[stateA]) {
      result[stateA] = competitiveMapSafeSeats[stateA];
    }
    if (competitiveMapSafeSeats[stateB]) {
      result[stateB] = competitiveMapSafeSeats[stateB];
    }
  }

  return result;
}
