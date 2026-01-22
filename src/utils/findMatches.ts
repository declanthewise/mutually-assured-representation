import { StateData } from '../types';

export type DistrictYear = 'current' | '2032';

/**
 * Calculate the seats impact of the efficiency gap for a state.
 * Seats = efficiencyGap * districts
 */
export function getSeats(state: StateData, districtYear: DistrictYear): number {
  const districts = districtYear === '2032' ? state.districts2032 : state.districts;
  return state.efficiencyGap * districts;
}

/**
 * Find MAR partners for a given state.
 * Matches states with:
 * - Similar district count (within 25%)
 * - Equal and opposite efficiency gaps (opposite sign, magnitude within 8%)
 */
export function findMatches(
  state: StateData,
  allStates: StateData[],
  districtYear: DistrictYear = 'current'
): StateData[] {
  const getDistricts = (s: StateData) =>
    districtYear === '2032' ? s.districts2032 : s.districts;

  const stateDistricts = getDistricts(state);

  return allStates.filter(other => {
    if (other.id === state.id) return false;

    // Skip single-district states (can't be gerrymandered)
    const otherDistricts = getDistricts(other);
    if (otherDistricts === 1) return false;

    // 1. Similar district count (within 25%)
    const minDistricts = Math.min(stateDistricts, otherDistricts);
    const maxDistricts = Math.max(stateDistricts, otherDistricts);
    const districtRatio = maxDistricts / minDistricts;
    if (districtRatio > 1.25) return false;

    // 2. Opposite efficiency gap with similar magnitude
    if (Math.sign(other.efficiencyGap) === Math.sign(state.efficiencyGap)) return false;
    const egDiff = Math.abs(Math.abs(other.efficiencyGap) - Math.abs(state.efficiencyGap));
    if (egDiff > 0.06) return false; // 6% tolerance

    return true;
  });
}
