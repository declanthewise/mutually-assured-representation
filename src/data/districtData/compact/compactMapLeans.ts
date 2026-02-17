import alarmCsvRaw from './alarmCompactMaps.csv?raw';
import { categorizeLeans, SafeSeatCounts } from '../safeSeats';

/** Per-district lean values from ALARM median-compactness plans. */
export const compactMapDistrictLeans: Record<string, number[]> = {};

const lines = alarmCsvRaw.trim().split('\n');
for (let i = 1; i < lines.length; i++) {
  const [state, , leanStr] = lines[i].split(',');
  const lean = parseInt(leanStr, 10);
  if (!compactMapDistrictLeans[state]) compactMapDistrictLeans[state] = [];
  compactMapDistrictLeans[state].push(lean);
}

/** Pre-computed safe-seat breakdown per state using ALARM compact maps. */
export const compactMapSafeSeats: Record<string, SafeSeatCounts> = {};

for (const [state, leans] of Object.entries(compactMapDistrictLeans)) {
  compactMapSafeSeats[state] = categorizeLeans(leans);
}
