import districtPviRaw from './districtPVI.csv?raw';

export const SAFE_SEAT_THRESHOLD = 8;

export interface SafeSeatCounts {
  safeR: number;
  safeD: number;
  leanR: number;
  even: number;
  leanD: number;
  competitiveSeats: number;
  safeSeats: number;
}

function parsePVI(pviStr: string): number {
  if (pviStr === 'EVEN') return 0;
  const match = pviStr.match(/([RD])\+(\d+)/);
  if (!match) return 0;
  const value = parseInt(match[2]);
  return match[1] === 'R' ? value : -value;
}

function computeSafeSeats(): Record<string, SafeSeatCounts> {
  const lines = districtPviRaw.trim().split('\n');
  const rows = lines.slice(1); // Skip header

  const agg: Record<string, { safeR: number; safeD: number; leanR: number; even: number; leanD: number }> = {};

  for (const line of rows) {
    // Parse CSV handling quoted fields
    const parts: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        parts.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    parts.push(current);

    const dist = parts[0]; // e.g., "AL-01"
    const pviStr = parts[4]; // e.g., "R+27"
    const stateId = dist.split('-')[0];
    const pvi = parsePVI(pviStr);

    if (!agg[stateId]) {
      agg[stateId] = { safeR: 0, safeD: 0, leanR: 0, even: 0, leanD: 0 };
    }

    if (pvi >= SAFE_SEAT_THRESHOLD) {
      agg[stateId].safeR++;
    } else if (pvi <= -SAFE_SEAT_THRESHOLD) {
      agg[stateId].safeD++;
    } else if (pvi > 0) {
      agg[stateId].leanR++;
    } else if (pvi < 0) {
      agg[stateId].leanD++;
    } else {
      agg[stateId].even++;
    }
  }

  const result: Record<string, SafeSeatCounts> = {};
  for (const [stateId, counts] of Object.entries(agg)) {
    result[stateId] = {
      safeR: counts.safeR,
      safeD: counts.safeD,
      leanR: counts.leanR,
      even: counts.even,
      leanD: counts.leanD,
      competitiveSeats: counts.leanR + counts.even + counts.leanD,
      safeSeats: counts.safeR + counts.safeD,
    };
  }
  return result;
}

export const stateSafeSeats = computeSafeSeats();
