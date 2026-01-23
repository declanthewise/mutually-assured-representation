import { StateData } from '../types';

export type DistrictYear = 'current' | '2032';

// States above this partisan lean threshold can only match with opposite-party states
const STRONG_PARTISAN_THRESHOLD = 8;

/**
 * Calculate the seats impact for a state.
 * For current districts: Seats = efficiencyGap * districts
 * For 2032: Seats = -(partisanLean / 100) * districts
 *   (negated because partisanLean uses opposite sign convention: positive = D, negative = R)
 */
export function getSeats(state: StateData, districtYear: DistrictYear): number {
  const districts = districtYear === '2032' ? state.districts2032 : state.districts;
  if (districtYear === '2032') {
    return -(state.partisanLean / 100) * districts;
  }
  return state.efficiencyGap * districts;
}

// Opacity constants - change these to adjust match display
const STRONG_MATCH_OPACITY = 1.0;
const WEAK_MATCH_OPACITY = 0.7;
const STRONG_MATCH_SEATS_THRESHOLD = 0.7;

/**
 * Check if a match is "strong" based on seats impact similarity.
 */
export function isStrongMatch(
  state: StateData,
  match: StateData,
  districtYear: DistrictYear
): boolean {
  const stateSeats = Math.abs(getSeats(state, districtYear));
  const matchSeats = Math.abs(getSeats(match, districtYear));
  const seatsDiff = Math.abs(matchSeats - stateSeats);
  return seatsDiff < STRONG_MATCH_SEATS_THRESHOLD;
}

/**
 * Get the opacity for displaying a match.
 * Strong matches get full opacity, weak matches get reduced opacity.
 */
export function getMatchOpacity(
  state: StateData,
  match: StateData,
  districtYear: DistrictYear
): number {
  return isStrongMatch(state, match, districtYear) ? STRONG_MATCH_OPACITY : WEAK_MATCH_OPACITY;
}

/**
 * Find MAR partners for a given state.
 *
 * Matches states with opposite efficiency gap (current) or partisan lean (2032),
 * and similar district count (within 30%).
 * Returns matches sorted by similarity (best matches first).
 * Opacity-based strength grading communicates match quality in the UI.
 */
export function findMatches(
  state: StateData,
  allStates: StateData[],
  districtYear: DistrictYear = 'current'
): StateData[] {
  const getDistricts = (s: StateData) =>
    districtYear === '2032' ? s.districts2032 : s.districts;

  const stateSeats = Math.abs(getSeats(state, districtYear));
  const stateDistricts = getDistricts(state);

  return allStates
    .filter(other => {
      if (other.id === state.id) return false;

      // Skip single-district states (can't be gerrymandered)
      const otherDistricts = getDistricts(other);
      if (otherDistricts === 1) return false;

      // For current districts: if either state has strong partisan lean (>10%),
      // they must be opposite parties to match
      if (districtYear === 'current') {
        const eitherStronglyPartisan =
          Math.abs(state.partisanLean) > STRONG_PARTISAN_THRESHOLD ||
          Math.abs(other.partisanLean) > STRONG_PARTISAN_THRESHOLD;
        const sameParty = Math.sign(state.partisanLean) === Math.sign(other.partisanLean);
        if (eitherStronglyPartisan && sameParty) {
          return false;
        }
      }

      // Similar district count (within 30%)
      const minDistricts = Math.min(stateDistricts, otherDistricts);
      const maxDistricts = Math.max(stateDistricts, otherDistricts);
      const districtRatio = maxDistricts / minDistricts;
      if (districtRatio > 1.3) return false;

      if (districtYear === '2032') {
        // For 2032: match on opposite partisan lean
        if (Math.sign(other.partisanLean) === Math.sign(state.partisanLean)) return false;
        // Partisan lean within 5%
        const leanDiff = Math.abs(Math.abs(other.partisanLean) - Math.abs(state.partisanLean));
        if (leanDiff > 5) return false;
      } else {
        // For current: match on opposite efficiency gap
        if (Math.sign(other.efficiencyGap) === Math.sign(state.efficiencyGap)) return false;
        // Efficiency gap within 10%
        const egDiff = Math.abs(Math.abs(other.efficiencyGap) - Math.abs(state.efficiencyGap));
        if (egDiff > 0.10) return false;
      }

      return true;
    })
    .sort((a, b) => {
      // Sort by how close the seats impact is to the selected state
      const aSeats = Math.abs(getSeats(a, districtYear));
      const bSeats = Math.abs(getSeats(b, districtYear));
      const aDiff = Math.abs(aSeats - stateSeats);
      const bDiff = Math.abs(bSeats - stateSeats);
      return aDiff - bDiff;
    });
}
