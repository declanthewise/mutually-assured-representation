import districtPviRaw from './cook2026DistrictPVI.tsv?raw';

/** A district this far from even is treated as locked for its party. */
export const SAFE_SEAT_THRESHOLD = 8;

/**
 * A district within this much of even counts as undecided — drawn for neither
 * party, and so held out of both party tallies.
 *
 * Cook rates exactly seven districts EVEN, but a band of one takes in seventeen,
 * and the ones it adds are the ones nobody has called: of the ten R+1 and D+1
 * districts, four are rated Toss Up and three Lean, three are Likely, and none is
 * Solid. In a midterm, on a neutral national environment, a seat a point off even
 * is a seat in play. Drawing the line at exactly EVEN made the band an artifact of
 * where Cook's rounding fell rather than a claim about competitiveness.
 *
 * The behaviour backs the width up. Pairing district lean against who actually won,
 * over the 2010s maps (five elections, the four states that redrew mid-decade set
 * aside), 64% of districts within a point of even were held by both parties at some
 * point, against 55% at 2-3, 44% at 4-5, 18% at 6-7 and 3% from 8 out — which is
 * also where SAFE_SEAT_THRESHOLD sits, arrived at independently. On the current maps
 * the cliff is sharper still: across 2022 and 2024 the within-a-point districts
 * flipped at 32% and everything beyond them at 5% or less. One is the conservative
 * choice — the 2010s say competitiveness reaches 5 — but it is the one the last two
 * elections support, and a wider band would start calling half-safe seats undecided.
 *
 * The ratings and the PVI are not the same measure and shouldn't be conflated — the
 * ratings fold in incumbency and candidate quality, which is why PA-01 is D+1 and
 * still Likely R, and why OH-09 is R+5 and still a Toss Up. This tool is an argument
 * about districts rather than about races, so PVI stays the input; the ratings are
 * only the sanity check on where the line sits.
 */
export const EVEN_BAND = 1;

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
    // The band is tested first: a district inside it belongs to neither party,
    // whichever way the last point of its margin happens to fall.
    if (Math.abs(lean) <= EVEN_BAND) {
      even++;
    } else if (lean >= SAFE_SEAT_THRESHOLD) {
      safeR++;
    } else if (lean <= -SAFE_SEAT_THRESHOLD) {
      safeD++;
    } else if (lean > 0) {
      leanR++;
    } else {
      leanD++;
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

/**
 * The enacted map's seat-lean margin, positive for R. A pact returns the same
 * number of seats to each side, so this never moves — which is the argument.
 */
export const houseBalance = nationalSeatTotals.rSeats - nationalSeatTotals.dSeats;
export const houseBalanceParty = houseBalance >= 0 ? 'R' : 'D';
