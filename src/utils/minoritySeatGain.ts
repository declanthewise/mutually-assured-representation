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
