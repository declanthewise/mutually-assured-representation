import { StateData } from '../types';

export type DistrictYear = 'current' | '2030';

/**
 * Calculate the seats impact of the efficiency gap for a state.
 * Seats = efficiencyGap * districts
 */
export function getSeats(state: StateData, districtYear: DistrictYear): number {
  const districts = districtYear === '2030' ? state.districts2030 : state.districts;
  return state.efficiencyGap * districts;
}

/**
 * Find MAR partners for a given state.
 * Matches states with:
 * - Similar district count (within 25%)
 * - Opposite partisan bias (R vs D advantage)
 * - Similar seats impact (within ±1 seat)
 */
export function findMatches(
  state: StateData,
  allStates: StateData[],
  districtYear: DistrictYear = 'current'
): StateData[] {
  const stateSeats = getSeats(state, districtYear);
  const getDistricts = (s: StateData) =>
    districtYear === '2030' ? s.districts2030 : s.districts;

  const stateDistricts = getDistricts(state);

  return allStates.filter(other => {
    if (other.id === state.id) return false;

    // Skip single-district states (can't be gerrymandered)
    const otherDistricts = getDistricts(other);
    if (otherDistricts === 1) return false;

    // Similar district count (within 25% of smaller count)
    const minDistricts = Math.min(stateDistricts, otherDistricts);
    const maxDistricts = Math.max(stateDistricts, otherDistricts);
    const districtRatio = maxDistricts / minDistricts;
    if (districtRatio > 1.25) return false;

    // Opposite efficiency gap direction
    if (Math.sign(other.efficiencyGap) === Math.sign(state.efficiencyGap)) return false;

    // Similar seats magnitude (within ±1 seat)
    const otherSeats = getSeats(other, districtYear);
    if (Math.abs(Math.abs(otherSeats) - Math.abs(stateSeats)) > 1) return false;

    return true;
  });
}
