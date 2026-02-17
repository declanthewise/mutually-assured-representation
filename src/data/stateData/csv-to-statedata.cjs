const fs = require('fs');
const path = require('path');

const stateDataCsvPath = path.join(__dirname, 'stateData.csv');
const tsPath = path.join(__dirname, 'stateData.ts');

// --- Read state data CSV ---

const stateCsv = fs.readFileSync(stateDataCsvPath, 'utf-8').trim().replace(/\r/g, '');
const stateLines = stateCsv.split('\n');
const headers = stateLines[0].split(',');

const stateRows = stateLines.slice(1).map(line => {
  const values = line.split(',');
  const obj = {};
  headers.forEach((h, i) => {
    obj[h] = values[i];
  });
  return obj;
});

// --- Generate TypeScript entries ---

const entries = stateRows.map(row => {
  return `  {
    "id": "${row.id}",
    "name": "${row.name}",
    "districts": ${parseInt(row.districts)},
    "districts2032": ${parseInt(row.districts2032)},
    "efficiencyGap": ${parseFloat(row.efficiencyGap)},
    "partisanLean": ${parseInt(row.partisanLean)},
    "stateControl": "${row.stateControl}",
    "redistrictingAuthority": "${row.redistrictingAuthority}",
    "governorCanVeto": ${row.governorCanVeto.toLowerCase() === 'true'},
    "hasBallotInitiative": ${row.hasBallotInitiative.toLowerCase() === 'true'}
  }`;
});

const ts = `import { StateData } from '../../types';

// Efficiency gap calculated from PlanScore 2024 raw data (https://planscore.org)
// See scripts/calculate-metrics.cjs for calculation details
//
// Efficiency gap: EG = (Wasted Dem Votes - Wasted Rep Votes) / Total Votes
//   Uses estimated votes (votes_dem_est, votes_rep_est) to handle uncontested races
//
// Partisan lean: 2025 Cook PVI (75/25 weighted average of 2020+2024, relative to national average)
//   Positive = D lean, Negative = R lean
//
// Safe/competitive seats: Computed at runtime in safeSeats.ts from district-level lean data
//
// 2032 projections based on Brennan Center projections using Census Bureau's Vintage 2025 estimates
//
// Sources:
// - https://github.com/PlanScore/National-EG-Map
// - https://www.cookpolitical.com/cook-pvi/2025-partisan-voting-index/district-map-and-list
// - https://en.wikipedia.org/wiki/Cook_Partisan_Voting_Index
// - https://www.brennancenter.org/our-work/analysis-opinion/big-changes-ahead-voting-maps-after-next-census

export const stateData: StateData[] = [
${entries.join(',\n')}
];

export const stateDataById: Record<string, StateData> = Object.fromEntries(
  stateData.map(s => [s.id, s])
);
`;

fs.writeFileSync(tsPath, ts);

console.log(`Generated ${tsPath}`);
console.log(`  ${stateRows.length} states`);
