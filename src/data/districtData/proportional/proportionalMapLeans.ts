import draCsvRaw from './draProportionalMaps.csv?raw';
import { categorizeLeans, SafeSeatCounts } from '../safeSeats';

/** Per-district lean values from DRA most-proportional plans. */
export const proportionalMapDistrictLeans: Record<string, number[]> = {};

const lines = draCsvRaw.trim().split('\n');
for (let i = 1; i < lines.length; i++) {
  const [state, , leanStr] = lines[i].split(',');
  const lean = parseInt(leanStr, 10);
  if (!proportionalMapDistrictLeans[state]) proportionalMapDistrictLeans[state] = [];
  proportionalMapDistrictLeans[state].push(lean);
}

/** Pre-computed safe-seat breakdown per state using DRA proportional maps. */
export const proportionalMapSafeSeats: Record<string, SafeSeatCounts> = {};

for (const [state, leans] of Object.entries(proportionalMapDistrictLeans)) {
  proportionalMapSafeSeats[state] = categorizeLeans(leans);
}
