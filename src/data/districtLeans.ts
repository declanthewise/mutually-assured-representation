import districtPviRaw from './cook2026DistrictPVI.tsv?raw';

/** A district this far from even is treated as locked for its party. */
export const SAFE_SEAT_THRESHOLD = 8;

export interface SafeSeatCounts {
  safeR: number;
  safeD: number;
  leanR: number;
  even: number;
  leanD: number;
  competitiveSeats: number;
  safeSeats: number;
  /** Every district leaning R — the enacted map's R allocation. */
  rSeats: number;
  /** Every district leaning D — the enacted map's D allocation. */
  dSeats: number;
}

/** "R+12" → 12, "D+12" → -12, "EVEN" → 0. Positive is R, matching PVI convention. */
function parseLeanString(leanStr: string): number {
  if (leanStr === 'EVEN') return 0;
  const match = leanStr.match(/([RD])\+(\d+)/);
  if (!match) return 0;
  const value = parseInt(match[2]);
  return match[1] === 'R' ? value : -value;
}

/** Categorize a state's district leans into seat buckets. */
function categorizeLeans(leans: number[]): SafeSeatCounts {
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
    rSeats: safeR + leanR,
    dSeats: safeD + leanD,
  };
}

/**
 * Cook's 2026 PVI list, tab-separated with a header row:
 *   Dist | Incumbent | Incumbent Party | 2025 PVI | 2026 PVI | 2026 Rank
 *
 * Only the 2026 column is read; 2025 is kept alongside it for reference.
 */
function computeSafeSeats(): Record<string, SafeSeatCounts> {
  const stateLeans: Record<string, number[]> = {};
  const rows = districtPviRaw.trim().split('\n').slice(1); // skip header

  for (const line of rows) {
    const parts = line.split('\t');
    const stateId = parts[0].split('-')[0];
    if (!stateLeans[stateId]) stateLeans[stateId] = [];
    stateLeans[stateId].push(parseLeanString(parts[4]));
  }

  const result: Record<string, SafeSeatCounts> = {};
  for (const [stateId, leans] of Object.entries(stateLeans)) {
    result[stateId] = categorizeLeans(leans);
  }
  return result;
}

export const stateSafeSeats = computeSafeSeats();

/** National totals across the enacted map — fixed, independent of any pact. */
export const nationalSeatTotals = Object.values(stateSafeSeats).reduce(
  (acc, c) => ({
    rSeats: acc.rSeats + c.rSeats,
    dSeats: acc.dSeats + c.dSeats,
    even: acc.even + c.even,
  }),
  { rSeats: 0, dSeats: 0, even: 0 },
);
