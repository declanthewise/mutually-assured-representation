import draCsvRaw from './draCompetitiveMaps.csv?raw';
import { categorizeLeans, SafeSeatCounts } from '../safeSeats';

/** Per-district lean values from DRA most-competitive plans. */
export const competitiveMapDistrictLeans: Record<string, number[]> = {};

const lines = draCsvRaw.trim().split('\n');
for (let i = 1; i < lines.length; i++) {
  const [state, , leanStr] = lines[i].split(',');
  const lean = parseInt(leanStr, 10);
  if (!competitiveMapDistrictLeans[state]) competitiveMapDistrictLeans[state] = [];
  competitiveMapDistrictLeans[state].push(lean);
}

/** Pre-computed safe-seat breakdown per state using DRA competitive maps. */
export const competitiveMapSafeSeats: Record<string, SafeSeatCounts> = {};

for (const [state, leans] of Object.entries(competitiveMapDistrictLeans)) {
  competitiveMapSafeSeats[state] = categorizeLeans(leans);
}
