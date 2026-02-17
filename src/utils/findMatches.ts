import { StateData } from '../types';
import { stateSafeSeats } from '../data/districtData/safeSeats';
import { alternateMapSafeSeats } from '../data/districtData/alternateMapLeans';

/**
 * Compute the number of majority-party safe+lean seats lost by switching
 * to the alternate (proportional) map. This counts seats that move away
 * from the majority party — whether they become even, lean-minority, or
 * safe-minority.
 *
 * Positive = majority party loses seats (good for the minority).
 * "Majority party" = same as the state's partisan lean:
 *   D-leaning state → majority is D,  R-leaning state → majority is R.
 *
 * Returns null if data is unavailable.
 */
export function getMinoritySeatGain(state: StateData): number | null {
  const enacted = stateSafeSeats[state.id];
  const alt = alternateMapSafeSeats[state.id];
  if (!enacted || !alt) return null;

  const stateLeansD = state.partisanLean > 0;
  const enactedMajority = stateLeansD
    ? enacted.safeD + enacted.leanD
    : enacted.safeR + enacted.leanR;
  const altMajority = stateLeansD
    ? alt.safeD + alt.leanD
    : alt.safeR + alt.leanR;

  return enactedMajority - altMajority;
}

// Match thresholds
const STRONG_PARTISAN_THRESHOLD = 3; // Partisan lean above which opposite-party is required
const BIG_FOUR = new Set(['CA', 'TX', 'FL', 'NY']);

/**
 * Find MAR partners for a given state.
 *
 * Uses minority-party seat gain as the matching metric.
 * Matching tiers (by |gainA - gainB|):
 *   1. Exact (== 0): show all, sorted by closest district count.
 *   2. Otherwise: show only the single closest match.
 *
 * Big-four states (CA, TX, FL, NY) can only match with each other.
 */
export function findMatches(
  state: StateData,
  allStates: StateData[],
): StateData[] {
  const stateGain = getMinoritySeatGain(state);
  if (stateGain === null) return [];

  const isBigFour = BIG_FOUR.has(state.id);

  // Build candidate list with basic directional / partisan filters
  const candidates: { other: StateData; otherGain: number }[] = [];

  for (const other of allStates) {
    if (other.id === state.id) continue;
    if (other.districts2022 === 1) continue;

    // Big-four restriction
    if (isBigFour && !BIG_FOUR.has(other.id)) continue;
    if (!isBigFour && BIG_FOUR.has(other.id)) continue;

    const otherGain = getMinoritySeatGain(other);
    if (otherGain === null) continue;

    // Strongly partisan states must match with opposite-party states
    const eitherStronglyPartisan =
      Math.abs(state.partisanLean) > STRONG_PARTISAN_THRESHOLD ||
      Math.abs(other.partisanLean) > STRONG_PARTISAN_THRESHOLD;
    if (eitherStronglyPartisan &&
        Math.sign(state.partisanLean) === Math.sign(other.partisanLean)) continue;

    candidates.push({ other, otherGain });
  }

  if (candidates.length === 0) return [];

  // Sort helper: closest district count to state
  const byDistrictCloseness = (a: { other: StateData }, b: { other: StateData }) =>
    Math.abs(a.other.districts2022 - state.districts2022) -
    Math.abs(b.other.districts2022 - state.districts2022);

  // Tier 1: exact matches (|gainA - gainB| == 0), closest district count only (ties kept)
  const exact = candidates.filter(c => Math.abs(stateGain - c.otherGain) === 0);
  if (exact.length > 0) {
    exact.sort(byDistrictCloseness);
    const bestDist = Math.abs(exact[0].other.districts2022 - state.districts2022);
    return exact
      .filter(c => Math.abs(c.other.districts2022 - state.districts2022) === bestDist)
      .map(c => c.other);
  }

  // Tier 2: single closest match by |gainA - gainB|, then district count
  candidates.sort((a, b) => {
    const aDiff = Math.abs(stateGain - a.otherGain);
    const bDiff = Math.abs(stateGain - b.otherGain);
    if (aDiff !== bDiff) return aDiff - bDiff;
    return byDistrictCloseness(a, b);
  });

  return [candidates[0].other];
}
