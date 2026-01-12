import { StateData } from '../types';

/**
 * Find ceasefire partners for a given state.
 * Matches states with:
 * - Similar district count (within ±3)
 * - Opposite partisan bias
 * - Similar efficiency gap magnitude (within ±8%)
 */
export function findMatches(state: StateData, allStates: StateData[]): StateData[] {
  return allStates.filter(other =>
    other.id !== state.id &&
    Math.abs(other.districts - state.districts) <= 3 &&
    Math.sign(other.efficiencyGap) !== Math.sign(state.efficiencyGap) &&
    Math.abs(Math.abs(other.efficiencyGap) - Math.abs(state.efficiencyGap)) <= 0.08
  );
}
