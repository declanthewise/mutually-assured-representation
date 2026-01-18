import { StateData } from '../types';

export type DistrictYear = 'current' | '2030';

/**
 * Find MAR partners for a given state.
 * Matches states with:
 * - Similar district count (within ±25% of the smaller state's count)
 * - Opposite partisan bias
 * - Similar efficiency gap magnitude (within ±8%)
 */
export function findMatches(
  state: StateData,
  allStates: StateData[],
  districtYear: DistrictYear = 'current'
): StateData[] {
  const getDistricts = (s: StateData) =>
    districtYear === '2030' ? s.districts2030 : s.districts;

  return allStates.filter(other => {
    if (other.id === state.id) return false;

    // Percentage-based district comparison (within 25% of smaller count)
    const stateDistricts = getDistricts(state);
    const otherDistricts = getDistricts(other);
    const minDistricts = Math.min(stateDistricts, otherDistricts);
    const maxDistricts = Math.max(stateDistricts, otherDistricts);
    const districtRatio = maxDistricts / minDistricts;
    if (districtRatio > 1.25) return false;

    // Opposite efficiency gap direction
    if (Math.sign(other.efficiencyGap) === Math.sign(state.efficiencyGap)) return false;

    // Similar efficiency gap magnitude
    if (Math.abs(Math.abs(other.efficiencyGap) - Math.abs(state.efficiencyGap)) > 0.08) return false;

    return true;
  });
}
