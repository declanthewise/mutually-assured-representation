/**
 * Reports where Open States' current legislator roster disagrees with the
 * branch-control fields in `stateData.ts`, alongside which it lives.
 *
 * It is a dev tool, not part of the app: nothing imports it, so it never reaches
 * the bundle. It sits here rather than in a scripts/ directory because the data
 * it checks is the file next to it, and the two should move together.
 *
 * It never writes. A seat count is not the same thing as control, and the states
 * where the two come apart are the ones this app cares most about: Alaska's two
 * chambers are run by cross-party coalitions that a tally reads as Republican,
 * Nebraska's officially nonpartisan legislature has no party labels to count at
 * all, and Maine's House is organized by a party that never reaches 76 of 151.
 * A script that wrote its own conclusions would quietly get all three wrong on
 * every run. So the output is a prompt to go read Ballotpedia, not a patch.
 *
 * Governors are not checked — the Open States roster is legislators only. Every
 * run says so, because the governor is the branch most likely to have flipped
 * and the one this can't see.
 *
 *   npm run check:control
 *
 * Source: https://open.pluralpolicy.com/data/legislator-csv/ (nightly, no key).
 */
import { csvParse } from 'd3';
import { stateData } from './stateData';
import { BranchControl, StateData } from '../types';

const rosterUrl = (id: string) => `https://data.openstates.org/people/current/${id.toLowerCase()}.csv`;

/** How many states to have in flight at once. */
const BATCH = 8;

/**
 * States where the seat count is known to be wrong, and why. A disagreement here
 * is the script working correctly, so it's reported apart from the real news —
 * but still reported, so a genuine change in one of them isn't swallowed by the
 * exemption.
 */
const BLIND_SPOTS: Record<string, string> = {
  AK: 'both chambers are run by cross-party coalitions; the tally sees only the R pluralities',
  NE: 'officially nonpartisan, so every member reads as unaffiliated and no majority resolves',
  ME: 'the House runs on a D plurality (75-72 with independents holding the rest), and the roster ' +
      'carries non-voting members that push the majority line further out of reach',
};

/**
 * Open States spells the parties as the states do: Minnesota's Democrats are
 * "Democratic-Farmer-Labor", North Dakota's are "Democratic-NPL", and Vermont
 * runs "Democratic/Progressive" fusion candidates. All of them caucus as they
 * are named, so the prefix is enough.
 */
function normalizeParty(raw: string): 'dem' | 'rep' | 'other' {
  if (raw.startsWith('Democratic')) return 'dem';
  if (raw.startsWith('Republican')) return 'rep';
  return 'other';
}

/**
 * Who holds a chamber, by seats alone. Requires an outright majority, so a tie
 * (Minnesota's 67–67 House) and a chamber full of independents both land on
 * 'split' — which is the right answer for the tie and a coincidence for the
 * coalition states.
 */
function majorityOf(parties: string[]): BranchControl {
  let dem = 0;
  let rep = 0;
  for (const raw of parties) {
    const party = normalizeParty(raw);
    if (party === 'dem') dem++;
    else if (party === 'rep') rep++;
  }
  const half = parties.length / 2;
  if (dem > half) return 'dem';
  if (rep > half) return 'rep';
  return 'split';
}

interface Observed {
  senateParty: BranchControl;
  houseParty: BranchControl | null;
  seats: number;
}

async function observeState(state: StateData): Promise<Observed> {
  const response = await fetch(rosterUrl(state.id));
  if (!response.ok) {
    throw new Error(`${state.id}: HTTP ${response.status} from Open States`);
  }
  const rows = csvParse(await response.text());

  const chambers: Record<string, string[]> = { upper: [], lower: [], legislature: [] };
  for (const row of rows) {
    const chamber = row.current_chamber ?? '';
    if (chamber in chambers) chambers[chamber].push(row.current_party ?? '');
  }

  // Nebraska files its one chamber as 'legislature'. Everyone else is upper/lower.
  if (chambers.legislature.length > 0) {
    return { senateParty: majorityOf(chambers.legislature), houseParty: null, seats: rows.length };
  }
  return {
    senateParty: majorityOf(chambers.upper),
    houseParty: majorityOf(chambers.lower),
    seats: rows.length,
  };
}

interface Finding {
  state: StateData;
  branch: string;
  recorded: string;
  observed: string;
}

function compare(state: StateData, observed: Observed): Finding[] {
  const findings: Finding[] = [];
  const show = (value: BranchControl | null) => (value === null ? 'unicameral' : value);

  if (state.senateParty !== observed.senateParty) {
    findings.push({
      state,
      branch: state.houseParty === null ? 'legislature' : 'senate',
      recorded: show(state.senateParty),
      observed: show(observed.senateParty),
    });
  }
  if (state.houseParty !== observed.houseParty) {
    findings.push({
      state,
      branch: 'house',
      recorded: show(state.houseParty),
      observed: show(observed.houseParty),
    });
  }
  return findings;
}

function chamberTotals(states: StateData[]) {
  let dem = 0;
  let rep = 0;
  for (const state of states) {
    for (const chamber of [state.senateParty, state.houseParty]) {
      if (chamber === 'dem') dem++;
      else if (chamber === 'rep') rep++;
    }
  }
  return { dem, rep };
}

async function main() {
  const findings: Finding[] = [];
  const failures: string[] = [];
  const observedStates: StateData[] = [];

  for (let i = 0; i < stateData.length; i += BATCH) {
    const batch = stateData.slice(i, i + BATCH);
    const results = await Promise.allSettled(batch.map(observeState));
    results.forEach((result, index) => {
      const state = batch[index];
      if (result.status === 'rejected') {
        failures.push(`${state.name}: ${result.reason}`);
        return;
      }
      findings.push(...compare(state, result.value));
      observedStates.push({ ...state, ...result.value });
    });
  }

  const review = findings.filter(f => !(f.state.id in BLIND_SPOTS));
  const expected = findings.filter(f => f.state.id in BLIND_SPOTS);

  const line = (f: Finding) =>
    `  ${f.state.name.padEnd(15)} ${f.branch.padEnd(11)} recorded ${f.recorded.padEnd(10)} roster says ${f.observed}`;

  console.log('\nBranch control vs. the Open States roster\n');

  if (review.length === 0) {
    console.log('  No unexplained disagreements. Every chamber matches the seat count.');
  } else {
    console.log(`NEEDS REVIEW — ${review.length} chamber(s) disagree:\n`);
    review.forEach(f => console.log(line(f)));
    console.log('\n  Check each against https://ballotpedia.org/State_government_trifectas');
    console.log('  and edit src/data/stateData.ts by hand. Do not trust the roster alone:');
    console.log('  a tally cannot see a coalition, a power-sharing deal, or a party switch.');
  }

  if (expected.length > 0) {
    console.log('\nKnown blind spots — expected to disagree, listed so they stay visible:\n');
    expected.forEach(f => console.log(`${line(f)}\n${' '.repeat(4)}↳ ${BLIND_SPOTS[f.state.id]}`));
  }

  if (failures.length > 0) {
    console.log(`\nCould not fetch ${failures.length} state(s):\n`);
    failures.forEach(f => console.log(`  ${f}`));
  }

  const recorded = chamberTotals(stateData);
  const seen = chamberTotals(observedStates);
  console.log('\nChamber totals (cross-check against NCSL, currently 57 R / 39 D):');
  console.log(`  recorded here  ${recorded.rep} R / ${recorded.dem} D`);
  console.log(`  roster says    ${seen.rep} R / ${seen.dem} D  (across ${observedStates.length} states)`);

  console.log('\nGovernors are NOT checked — the roster is legislators only.');
  console.log('Verify all 50 by hand after any statewide election.\n');

  process.exitCode = review.length > 0 || failures.length > 0 ? 1 : 0;
}

main();
