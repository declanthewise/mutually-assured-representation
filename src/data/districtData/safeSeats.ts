import districtPviRaw from './enacted/districtPVI.csv?raw';

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

function parseLeanString(leanStr: string): number {
  if (leanStr === 'EVEN') return 0;
  const match = leanStr.match(/([RD])\+(\d+)/);
  if (!match) return 0;
  const value = parseInt(match[2]);
  return match[1] === 'R' ? value : -value;
}

/** Categorize an array of numeric lean values into safe-seat buckets. */
export function categorizeLeans(leans: number[]): SafeSeatCounts {
  let safeR = 0, safeD = 0, leanR = 0, even = 0, leanD = 0;
  for (const lean of leans) {
    if (lean >= SAFE_SEAT_THRESHOLD) {
      safeR++;
    } else if (lean <= -SAFE_SEAT_THRESHOLD) {
      safeD++;
    } else if (lean > 0) {
      leanR++;
    } else if (lean < 0) {
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

  const stateLeans: Record<string, number[]> = {};

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
    const leanStr = parts[4]; // e.g., "R+27"
    const stateId = dist.split('-')[0];
    const lean = parseLeanString(leanStr);

    if (!stateLeans[stateId]) stateLeans[stateId] = [];
    stateLeans[stateId].push(lean);
  }

  const result: Record<string, SafeSeatCounts> = {};
  for (const [stateId, leans] of Object.entries(stateLeans)) {
    result[stateId] = categorizeLeans(leans);
  }
  return result;
}

export const stateSafeSeats = computeSafeSeats();
