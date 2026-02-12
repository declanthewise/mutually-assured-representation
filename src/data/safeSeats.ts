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

/** Categorize an array of numeric PVI values into safe-seat buckets. */
export function categorizePVIs(pvis: number[]): SafeSeatCounts {
  let safeR = 0, safeD = 0, leanR = 0, even = 0, leanD = 0;
  for (const pvi of pvis) {
    if (pvi >= SAFE_SEAT_THRESHOLD) {
      safeR++;
    } else if (pvi <= -SAFE_SEAT_THRESHOLD) {
      safeD++;
    } else if (pvi > 0) {
      leanR++;
    } else if (pvi < 0) {
      leanD++;
    } else {
      even++;
    }
  }
  return {
    safeR, safeD, leanR, even, leanD,
    competitiveSeats: leanR + even + leanD,
    safeSeats: safeR + safeD,
  };
}

function computeSafeSeats(): Record<string, SafeSeatCounts> {
  const lines = districtPviRaw.trim().split('\n');
  const rows = lines.slice(1); // Skip header

  const statePVIs: Record<string, number[]> = {};

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

    if (!statePVIs[stateId]) statePVIs[stateId] = [];
    statePVIs[stateId].push(pvi);
  }

  const result: Record<string, SafeSeatCounts> = {};
  for (const [stateId, pvis] of Object.entries(statePVIs)) {
    result[stateId] = categorizePVIs(pvis);
  }
  return result;
}

export const stateSafeSeats = computeSafeSeats();
