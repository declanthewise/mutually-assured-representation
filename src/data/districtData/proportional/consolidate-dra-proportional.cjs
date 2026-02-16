/**
 * Consolidate individual DRA "most proportional" CSV files into a single
 * draProportionalMaps.csv with the same state,district,pvi format used
 * by the ALARM compact maps CSV.
 *
 * Usage: node src/data/districtData/proportional/consolidate-dra-proportional.cjs
 */
const fs = require('fs');
const path = require('path');

const INPUT_DIR = path.join(__dirname, 'raw');
const OUTPUT_PATH = path.join(__dirname, 'draProportionalMaps.csv');

// Expected district counts (2022 apportionment) for all multi-district states
const EXPECTED_DISTRICTS = {
  AL: 7, AZ: 9, AR: 4, CA: 52, CO: 8, CT: 5, FL: 28, GA: 14,
  HI: 2, ID: 2, IL: 17, IN: 9, IA: 4, KS: 4, KY: 6, LA: 6,
  ME: 2, MD: 8, MA: 9, MI: 13, MN: 8, MS: 4, MO: 8, MT: 2,
  NE: 3, NV: 4, NH: 2, NJ: 12, NM: 3, NY: 26, NC: 14, OH: 15,
  OK: 5, OR: 6, PA: 17, RI: 2, SC: 7, TN: 9, TX: 38, UT: 4,
  VA: 11, WA: 10, WV: 2, WI: 8,
};

const csvLines = ['state,district,pvi'];
const files = fs.readdirSync(INPUT_DIR).filter(f => f.endsWith('.csv')).sort();
let errors = 0;

for (const file of files) {
  const stateId = file.replace('mostproportional.csv', '');
  const expectedDistricts = EXPECTED_DISTRICTS[stateId];

  if (!expectedDistricts) {
    console.warn(`WARNING: Unknown state ${stateId} in file ${file}, skipping`);
    continue;
  }

  const content = fs.readFileSync(path.join(INPUT_DIR, file), 'utf-8');
  const lines = content.trim().split('\n');

  let districtCount = 0;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Parse CSV with quoted fields
    const parts = [];
    let current = '';
    let inQuotes = false;
    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === ',' && !inQuotes) { parts.push(current); current = ''; }
      else { current += ch; }
    }
    parts.push(current);

    const id = parts[0];
    // Skip "Un" (unassigned) and summary row (empty ID)
    if (id === 'Un' || id === '') continue;

    const dem = parseFloat(parts[3]);
    const rep = parseFloat(parts[4]);
    const pvi = Math.round((rep - dem) / (rep + dem) * 100);

    csvLines.push(`${stateId},${id},${pvi}`);
    districtCount++;
  }

  if (districtCount !== expectedDistricts) {
    console.error(`ERROR: ${stateId} has ${districtCount} districts, expected ${expectedDistricts}`);
    errors++;
  } else {
    console.log(`${stateId}: ${districtCount} districts OK`);
  }
}

if (errors > 0) {
  console.error(`\n${errors} error(s) found. Fix the data and re-run.`);
  process.exit(1);
}

fs.writeFileSync(OUTPUT_PATH, csvLines.join('\n') + '\n');
console.log(`\nWrote ${csvLines.length - 1} district records to ${OUTPUT_PATH}`);
