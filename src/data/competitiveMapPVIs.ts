import draCsvRaw from './draCompetitiveMaps.csv?raw';
import { categorizePVIs, SafeSeatCounts } from './safeSeats';

/** Per-district PVI values from DRA most-competitive plans. */
export const competitiveMapDistrictPVIs: Record<string, number[]> = {};

const lines = draCsvRaw.trim().split('\n');
for (let i = 1; i < lines.length; i++) {
  const [state, , pviStr] = lines[i].split(',');
  const pvi = parseInt(pviStr, 10);
  if (!competitiveMapDistrictPVIs[state]) competitiveMapDistrictPVIs[state] = [];
  competitiveMapDistrictPVIs[state].push(pvi);
}

/** Pre-computed safe-seat breakdown per state using DRA competitive maps. */
export const competitiveMapSafeSeats: Record<string, SafeSeatCounts> = {};

for (const [state, pvis] of Object.entries(competitiveMapDistrictPVIs)) {
  competitiveMapSafeSeats[state] = categorizePVIs(pvis);
}
