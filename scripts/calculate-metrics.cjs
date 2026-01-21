const fs = require('fs');
const path = require('path');

// Read the raw data TSV (from PlanScore GitHub)
const tsvPath = path.join(__dirname, '..', 'planscore-raw-data.tsv');
const tsvContent = fs.readFileSync(tsvPath, 'utf-8');

const lines = tsvContent.split('\n');
const header = lines[0].split('\t');

// Find column indices
const colIndex = {};
header.forEach((col, i) => {
  colIndex[col] = i;
});

console.log('Column indices:', colIndex);

// Parse data rows for 2024
const data2024 = [];
for (let i = 1; i < lines.length; i++) {
  const row = lines[i].split('\t');
  if (row.length < 10) continue;

  const cycle = row[colIndex['cycle']];
  if (cycle !== '2024') continue;

  const state = row[colIndex['stateabrev']];
  const votesDemStr = row[colIndex['votes_dem_est']];
  const votesRepStr = row[colIndex['votes_rep_est']];
  const district = row[colIndex['district']];
  const dpresStr = row[colIndex['dpres']];

  // Parse vote counts (remove commas)
  const votesDem = parseInt(votesDemStr.replace(/,/g, ''), 10);
  const votesRep = parseInt(votesRepStr.replace(/,/g, ''), 10);
  const dpres = parseFloat(dpresStr);

  if (isNaN(votesDem) || isNaN(votesRep)) {
    console.log(`Skipping invalid row: ${state} district ${district}`);
    continue;
  }

  data2024.push({
    state,
    district,
    votesDem,
    votesRep,
    totalVotes: votesDem + votesRep,
    dpres: isNaN(dpres) ? null : dpres
  });
}

console.log(`\nFound ${data2024.length} districts for 2024`);

// Group by state
const stateResults = {};
for (const row of data2024) {
  if (!stateResults[row.state]) {
    stateResults[row.state] = [];
  }
  stateResults[row.state].push(row);
}

// Calculate efficiency gap for each state
function calculateEfficiencyGap(districts) {
  let totalWastedDem = 0;
  let totalWastedRep = 0;
  let totalVotes = 0;

  for (const d of districts) {
    const { votesDem, votesRep } = d;
    const districtTotal = votesDem + votesRep;
    const threshold = Math.floor(districtTotal / 2) + 1;

    totalVotes += districtTotal;

    if (votesDem > votesRep) {
      // Democrat won
      totalWastedDem += votesDem - threshold;  // Winner's wasted: excess above threshold
      totalWastedRep += votesRep;               // Loser's wasted: all votes
    } else {
      // Republican won
      totalWastedRep += votesRep - threshold;  // Winner's wasted: excess above threshold
      totalWastedDem += votesDem;               // Loser's wasted: all votes
    }
  }

  // EG = (Wasted Dem - Wasted Rep) / Total Votes
  // Positive EG means Republicans have advantage (Democrats wasted more)
  // Negative EG means Democrats have advantage (Republicans wasted more)
  const efficiencyGap = (totalWastedDem - totalWastedRep) / totalVotes;

  return {
    efficiencyGap,
    totalWastedDem,
    totalWastedRep,
    totalVotes,
    districts: districts.length
  };
}

// Calculate partisan lean for a state (vote-weighted average of dpres - 50)
function calculatePartisanLean(districts) {
  let totalVotes = 0;
  let weightedDpres = 0;

  for (const d of districts) {
    if (d.dpres === null) continue;
    totalVotes += d.totalVotes;
    weightedDpres += d.dpres * d.totalVotes;
  }

  if (totalVotes === 0) return null;

  // Partisan lean = weighted average dpres - 50 (national average)
  // Positive = D lean, Negative = R lean
  const avgDpres = weightedDpres / totalVotes;
  return avgDpres - 50;
}

// Calculate for each state
const results = {};
for (const [state, districts] of Object.entries(stateResults)) {
  const partisanLean = calculatePartisanLean(districts);

  // Skip single-district states (efficiency gap is meaningless)
  if (districts.length === 1) {
    results[state] = { efficiencyGap: 0, districts: 1, partisanLean, note: 'Single-district state' };
    continue;
  }

  const calc = calculateEfficiencyGap(districts);
  results[state] = { ...calc, partisanLean };
}

// Sort by state
const sortedStates = Object.keys(results).sort();

console.log('\n=== Efficiency Gap Results ===\n');
console.log('State | Districts | Efficiency Gap | R/D Advantage');
console.log('------|-----------|----------------|---------------');

for (const state of sortedStates) {
  const r = results[state];
  const egPercent = (r.efficiencyGap * 100).toFixed(2);
  const advantage = r.efficiencyGap > 0.01 ? 'R' : r.efficiencyGap < -0.01 ? 'D' : 'N';
  console.log(`${state.padEnd(5)} | ${String(r.districts).padStart(9)} | ${egPercent.padStart(14)}% | ${advantage}`);
}

// Output as JSON for easy comparison
console.log('\n=== JSON Output ===\n');
const jsonOutput = {};
for (const state of sortedStates) {
  jsonOutput[state] = Math.round(results[state].efficiencyGap * 10000) / 10000;
}
console.log(JSON.stringify(jsonOutput, null, 2));

// Compare with current stateData.ts values
console.log('\n=== Verification Against stateData.ts ===\n');

const currentValues = {
  AL: -0.0808, AR: 0.1388, AZ: 0.2134, CA: -0.1018, CO: 0.1201,
  CT: -0.3145, FL: 0.1112, GA: 0.1194, HI: -0.0947, IA: 0.3697,
  ID: 0.0929, IL: -0.1723, IN: 0.0861, KS: 0.0272, KY: 0.0005,
  LA: -0.0367, MA: -0.1763, MD: -0.0671, ME: -0.38, MI: 0.0487,
  MN: 0.0219, MO: 0.0784, MS: 0.0107, MT: 0.308, NC: 0.1801,
  NE: 0.2277, NH: -0.4298, NJ: -0.1274, NM: -0.3986, NV: -0.2327,
  NY: -0.0404, OH: 0.0444, OK: 0.1183, OR: -0.2194, PA: 0.0605,
  RI: -0.2618, SC: 0.1699, TN: 0.1074, TX: 0.0753, UT: 0.1825,
  VA: 0.0193, WA: -0.1466, WI: 0.2337, WV: 0.0758,
  // Single-district states
  AK: 0, DE: 0, ND: 0, SD: 0, VT: 0, WY: 0
};

let discrepancies = [];
for (const state of sortedStates) {
  const calculated = results[state].efficiencyGap;
  const current = currentValues[state];

  if (current === undefined) {
    console.log(`${state}: NOT FOUND in current data`);
    continue;
  }

  const diff = Math.abs(calculated - current);
  if (diff > 0.0001) {
    discrepancies.push({
      state,
      calculated: Math.round(calculated * 10000) / 10000,
      current,
      diff: Math.round(diff * 10000) / 10000
    });
    console.log(`${state}: MISMATCH - Calculated: ${(calculated * 100).toFixed(2)}%, Current: ${(current * 100).toFixed(2)}%, Diff: ${(diff * 100).toFixed(2)}%`);
  } else {
    console.log(`${state}: MATCH - ${(calculated * 100).toFixed(2)}%`);
  }
}

if (discrepancies.length === 0) {
  console.log('\n*** All values match! ***');
} else {
  console.log(`\n*** Found ${discrepancies.length} discrepancies ***`);
  console.log(JSON.stringify(discrepancies, null, 2));
}

// Spot-check Texas and Wisconsin
console.log('\n=== Spot Checks ===');
console.log(`Texas: ${(results['TX'].efficiencyGap * 100).toFixed(2)}% (expected ~7.53%)`);
console.log(`Wisconsin: ${(results['WI'].efficiencyGap * 100).toFixed(2)}% (expected ~23.37%)`);

// ============================================
// PARTISAN LEAN CALCULATION (from dpres column)
// ============================================

console.log('\n\n========================================');
console.log('PARTISAN LEAN (from 2024 presidential vote)');
console.log('========================================\n');

console.log('State | Districts | Partisan Lean | Current Value | Diff');
console.log('------|-----------|---------------|---------------|------');

const currentPartisanLean = {
  AL: -15.3, AR: -15.7, AZ: -2.8, CA: 10.6, CO: 5.7,
  CT: 7.3, FL: -6.6, GA: -1.0, HI: 11.8, IA: -6.7,
  ID: -18.9, IL: 5.3, IN: -9.5, KS: -8.3, KY: -15.7,
  LA: -13.0, MA: 13.2, MD: 14.8, ME: 3.3, MI: -0.7,
  MN: 2.1, MO: -9.4, MS: -11.5, MT: -10.3, NC: -1.5,
  NE: -10.3, NH: 1.4, NJ: 2.9, NM: 3.0, NV: -1.5,
  NY: 6.2, OH: -5.8, OK: -17.5, OR: 7.4, PA: -1.1,
  RI: 6.8, SC: -9.1, TN: -15.0, TX: -7.1, UT: -11.1,
  VA: 3.0, WA: 9.4, WI: -0.5, WV: -21.3,
  // Single-district states (calculated from PlanScore dpres)
  AK: -6.9, DE: 7.5, ND: -18.7, SD: -15.0, VT: 16.4, WY: -23.5
};

let leanDiscrepancies = [];
for (const state of sortedStates) {
  const r = results[state];
  const calculated = r.partisanLean;
  const current = currentPartisanLean[state];

  if (calculated === null) {
    console.log(`${state.padEnd(5)} | ${String(r.districts).padStart(9)} | NO DATA`);
    continue;
  }

  const calcRounded = Math.round(calculated * 10) / 10;
  const diff = current !== undefined ? Math.abs(calcRounded - current) : null;

  console.log(`${state.padEnd(5)} | ${String(r.districts).padStart(9)} | ${calcRounded.toFixed(1).padStart(13)} | ${current !== undefined ? current.toFixed(1).padStart(13) : 'N/A'.padStart(13)} | ${diff !== null ? diff.toFixed(1) : 'N/A'}`);

  if (diff !== null && diff > 0.5) {
    leanDiscrepancies.push({
      state,
      calculated: calcRounded,
      current,
      diff: Math.round(diff * 10) / 10
    });
  }
}

console.log('\n=== Partisan Lean JSON (for stateData.ts) ===\n');
const partisanLeanJson = {};
for (const state of sortedStates) {
  const pl = results[state].partisanLean;
  partisanLeanJson[state] = pl !== null ? Math.round(pl * 10) / 10 : null;
}
console.log(JSON.stringify(partisanLeanJson, null, 2));

if (leanDiscrepancies.length > 0) {
  console.log(`\n*** Found ${leanDiscrepancies.length} partisan lean discrepancies (>0.5 difference) ***`);
  console.log(JSON.stringify(leanDiscrepancies, null, 2));
} else {
  console.log('\n*** All partisan lean values match within 0.5! ***');
}
