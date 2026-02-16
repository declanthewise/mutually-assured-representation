const fs = require('fs');
const path = require('path');
const https = require('https');

// States to skip (single-district, no simulated data)
const SKIP_STATES = new Set(['AK', 'DE', 'ND', 'SD', 'VT', 'WY']);

// Harvard Dataverse API for ALARM 50-State Simulations
const DATASET_API = 'https://dataverse.harvard.edu/api/datasets/:persistentId/versions/:latest-published?persistentId=doi:10.7910/DVN/SLCD3E';

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const request = (redirectUrl) => {
      https.get(redirectUrl, { headers: { 'Accept': '*/*' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          request(res.headers.location);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${redirectUrl}`));
          return;
        }
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
        res.on('error', reject);
      }).on('error', reject);
    };
    request(url);
  });
}

async function fetchFileIds() {
  console.log('Fetching dataset metadata from Harvard Dataverse...');
  const json = await httpsGet(DATASET_API);
  const data = JSON.parse(json);
  const files = data.data.files;

  const statsFiles = {};
  for (const f of files) {
    const name = f.dataFile.filename;
    const match = name.match(/^([A-Z]{2})_cd_2020_stats\.tab$/);
    if (match) {
      const state = match[1];
      if (!SKIP_STATES.has(state)) {
        statsFiles[state] = f.dataFile.id;
      }
    }
  }

  console.log(`Found ${Object.keys(statsFiles).length} state stats files`);
  return statsFiles;
}

function parseTsv(content) {
  const lines = content.split('\n');
  const header = lines[0].split('\t');
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = line.split('\t');
    const row = {};
    for (let j = 0; j < header.length; j++) {
      row[header[j]] = values[j];
    }
    rows.push(row);
  }
  return rows;
}

function processState(rows) {
  // Filter to simulated plans only (draw != "cd_2020")
  const simulated = rows.filter(r => {
    const draw = r.draw.replace(/"/g, '');
    return draw !== 'cd_2020';
  });

  if (simulated.length === 0) return null;

  // Group by draw (plan ID)
  const plans = {};
  for (const row of simulated) {
    const draw = row.draw.replace(/"/g, '');
    if (!plans[draw]) plans[draw] = [];
    plans[draw].push(row);
  }

  // Calculate mean comp_polsby per plan
  const planCompactness = [];
  for (const [draw, districts] of Object.entries(plans)) {
    let sum = 0;
    let count = 0;
    for (const d of districts) {
      const val = parseFloat(d.comp_polsby);
      if (!isNaN(val)) {
        sum += val;
        count++;
      }
    }
    if (count > 0) {
      planCompactness.push({ draw, meanCompactness: sum / count, districts });
    }
  }

  // Sort by mean compactness to find median
  planCompactness.sort((a, b) => a.meanCompactness - b.meanCompactness);
  const medianIndex = Math.floor(planCompactness.length / 2);
  const medianPlan = planCompactness[medianIndex];

  // Extract per-district e_dvs and convert to PVI
  const districtPVIs = [];
  for (const d of medianPlan.districts) {
    const district = parseInt(d.district);
    const eDvs = parseFloat(d.e_dvs);
    // pvi = (0.5 - e_dvs) * 100: positive = R lean, negative = D lean
    const pvi = Math.round((0.5 - eDvs) * 100);
    districtPVIs.push({ district, pvi });
  }

  districtPVIs.sort((a, b) => a.district - b.district);
  return { draw: medianPlan.draw, meanCompactness: medianPlan.meanCompactness, districts: districtPVIs };
}

async function main() {
  const outputPath = path.join(__dirname, 'alarmCompactMaps.csv');

  const fileIds = await fetchFileIds();
  const states = Object.keys(fileIds).sort();
  const results = [];

  for (const state of states) {
    const fileId = fileIds[state];
    console.log(`Processing ${state} (file ID: ${fileId})...`);

    try {
      const content = await httpsGet(`https://dataverse.harvard.edu/api/access/datafile/${fileId}`);
      const rows = parseTsv(content);
      const result = processState(rows);

      if (result) {
        console.log(`  ${state}: plan ${result.draw}, compactness ${result.meanCompactness.toFixed(4)}, ${result.districts.length} districts`);
        for (const d of result.districts) {
          results.push({ state, district: d.district, pvi: d.pvi });
        }
      } else {
        console.log(`  ${state}: no simulated plans found`);
      }
    } catch (err) {
      console.error(`  ${state}: ERROR - ${err.message}`);
    }
  }

  // Write CSV
  const csvLines = ['state,district,pvi'];
  for (const r of results) {
    csvLines.push(`${r.state},${r.district},${r.pvi}`);
  }

  fs.writeFileSync(outputPath, csvLines.join('\n') + '\n');
  console.log(`\nWrote ${results.length} district records to ${outputPath}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
