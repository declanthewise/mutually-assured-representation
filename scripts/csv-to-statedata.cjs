const fs = require('fs');
const path = require('path');

const stateDataCsvPath = path.join(__dirname, '..', 'src', 'data', 'stateData.csv');
const districtPviPath = path.join(__dirname, '..', 'src', 'data', 'districtPVI.csv');
const tsPath = path.join(__dirname, '..', 'src', 'data', 'stateData.ts');

// --- Parse district PVI data and aggregate by state ---

const districtCsv = fs.readFileSync(districtPviPath, 'utf-8').trim().replace(/\r/g, '');
const districtLines = districtCsv.split('\n');
const districtRows = districtLines.slice(1); // Skip header

// Parse CSV line handling quoted fields
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

// Parse PVI value (e.g., "R+27" -> 27, "D+5" -> -5, "EVEN" -> 0)
function parsePVI(pviStr) {
  if (pviStr === 'EVEN') return 0;
  const match = pviStr.match(/([RD])\+(\d+)/);
  if (!match) return 0;
  const value = parseInt(match[2]);
  return match[1] === 'R' ? value : -value;
}

// Aggregate district competitiveness by state
const stateAgg = {};

for (const line of districtRows) {
  const parts = parseCSVLine(line);
  const dist = parts[0]; // e.g., "AL-01"
  const pviStr = parts[4]; // e.g., "R+27"

  const stateId = dist.split('-')[0];
  const pvi = parsePVI(pviStr);

  if (!stateAgg[stateId]) {
    stateAgg[stateId] = { safeR: 0, safeD: 0, competitive: 0 };
  }

  if (pvi >= 10) {
    stateAgg[stateId].safeR++;
  } else if (pvi <= -10) {
    stateAgg[stateId].safeD++;
  } else {
    stateAgg[stateId].competitive++;
  }
}

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

// --- Generate TypeScript entries (using computed aggregates) ---

const entries = stateRows.map(row => {
  const stateId = row.id;
  const agg = stateAgg[stateId] || { safeR: 0, safeD: 0, competitive: 0 };
  const safeSeats = agg.safeR + agg.safeD;

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
    "hasBallotInitiative": ${row.hasBallotInitiative.toLowerCase() === 'true'},
    "safeSeats": ${safeSeats},
    "safeR": ${agg.safeR},
    "safeD": ${agg.safeD},
    "competitiveSeats": ${agg.competitive}
  }`;
});

const ts = `import { StateData } from '../types';

// Efficiency gap calculated from PlanScore 2024 raw data (https://planscore.org)
// See scripts/calculate-metrics.cjs for calculation details
//
// Efficiency gap: EG = (Wasted Dem Votes - Wasted Rep Votes) / Total Votes
//   Uses estimated votes (votes_dem_est, votes_rep_est) to handle uncontested races
//
// Partisan lean: 2025 Cook PVI (75/25 weighted average of 2020+2024, relative to national average)
//   Positive = D lean, Negative = R lean
//
// Safe/competitive seats: Aggregated from district-level 2025 Cook PVI data
//   Safe seat: |PVI| >= 10 (e.g., R+10 or D+10 or stronger)
//   Competitive seat: |PVI| < 10
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

// --- Verification ---

let totalSafe = 0, totalCompetitive = 0;
let mismatches = [];

stateRows.forEach(row => {
  const agg = stateAgg[row.id] || { safeR: 0, safeD: 0, competitive: 0 };
  const districts = parseInt(row.districts);
  const safeSeats = agg.safeR + agg.safeD;
  const total = safeSeats + agg.competitive;

  totalSafe += safeSeats;
  totalCompetitive += agg.competitive;

  if (total !== districts) {
    mismatches.push(`${row.id}: ${districts} districts but ${total} computed (safe: ${safeSeats}, competitive: ${agg.competitive})`);
  }
});

console.log(`Generated ${tsPath}`);
console.log(`  ${stateRows.length} states, ${totalSafe} safe seats, ${totalCompetitive} competitive seats`);

if (mismatches.length > 0) {
  console.log('\nMismatches (computed != districts):');
  mismatches.forEach(m => console.log(`  ${m}`));
}
