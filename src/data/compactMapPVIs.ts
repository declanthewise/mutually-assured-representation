import alarmCsvRaw from './alarmCompactMaps.csv?raw';
import { categorizePVIs, SafeSeatCounts } from './safeSeats';

/** Per-district PVI values from ALARM median-compactness plans. */
export const compactMapDistrictPVIs: Record<string, number[]> = {};

const lines = alarmCsvRaw.trim().split('\n');
for (let i = 1; i < lines.length; i++) {
  const [state, , pviStr] = lines[i].split(',');
  const pvi = parseInt(pviStr, 10);
  if (!compactMapDistrictPVIs[state]) compactMapDistrictPVIs[state] = [];
  compactMapDistrictPVIs[state].push(pvi);
}

/** Pre-computed safe-seat breakdown per state using ALARM compact maps. */
export const compactMapSafeSeats: Record<string, SafeSeatCounts> = {};

for (const [state, pvis] of Object.entries(compactMapDistrictPVIs)) {
  compactMapSafeSeats[state] = categorizePVIs(pvis);
}
