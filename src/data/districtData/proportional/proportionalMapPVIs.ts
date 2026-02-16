import draCsvRaw from './draProportionalMaps.csv?raw';
import { categorizePVIs, SafeSeatCounts } from '../safeSeats';

/** Per-district PVI values from DRA most-proportional plans. */
export const proportionalMapDistrictPVIs: Record<string, number[]> = {};

const lines = draCsvRaw.trim().split('\n');
for (let i = 1; i < lines.length; i++) {
  const [state, , pviStr] = lines[i].split(',');
  const pvi = parseInt(pviStr, 10);
  if (!proportionalMapDistrictPVIs[state]) proportionalMapDistrictPVIs[state] = [];
  proportionalMapDistrictPVIs[state].push(pvi);
}

/** Pre-computed safe-seat breakdown per state using DRA proportional maps. */
export const proportionalMapSafeSeats: Record<string, SafeSeatCounts> = {};

for (const [state, pvis] of Object.entries(proportionalMapDistrictPVIs)) {
  proportionalMapSafeSeats[state] = categorizePVIs(pvis);
}
