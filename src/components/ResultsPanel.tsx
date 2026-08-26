import { FAIR_BLACK, GAP_ORANGE, PARTY_COLORS } from '../colors';
import {
  baselineGaps,
  computeNationalRepresentationGap,
  pactSeatsReturned,
} from '../data/computeRepresentationGap';
import { baseline2032Gap, baselineGaps2032, pact2032Returned } from '../data/plan2032';
import { stateDataById } from '../data/stateData';
import { MatchPair } from '../types';
import type { EraId } from './BipartiteMatchGraph';

/** The gap before any pact is signed — what everything here is measured against. */
const BASELINE_GAP = computeNationalRepresentationGap(baselineGaps);

const PARTY_NAMES = { D: 'Democrats', R: 'Republicans' } as const;

/** Single-digit counts read as words in the headline; anything larger stays a numeral. */
const SPELLED = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
] as const;

const spellCount = (n: number) => SPELLED[n] ?? String(n);

/** Everything the results read off the board that is up, gathered in one place. */
const BOARDS = {
  '2026': { baselineGaps, pool: BASELINE_GAP, returned: pactSeatsReturned },
  '2032': { baselineGaps: baselineGaps2032, pool: baseline2032Gap, returned: pact2032Returned },
} as const;

/**
 * The party a state hands seats back to when it disarms. A positive gap is R
 * overrepresentation, so unwinding it returns Democrats; a negative gap returns
 * Republicans. Both boards sign their gaps the same way — in 2032 the sign follows
 * the column, since the gap there is the whole fair minority share — so this reads
 * one map or the other and asks the same question of it. Every pact pairs one of
 * each, which is why the balance holds.
 */
function PactHalf({ era, stateId, seats }: { era: EraId; stateId: string; seats: number }) {
  const party = (BOARDS[era].baselineGaps[stateId] ?? 0) > 0 ? 'D' : 'R';
  return (
    <span style={{ color: PARTY_COLORS[party] }}>
      +{seats} {stateDataById[stateId]?.name ?? stateId} {PARTY_NAMES[party]}
    </span>
  );
}

interface ResultsPanelProps {
  era: EraId;
  selectedMatches: MatchPair[];
  /** The gap left standing once the pacts are honored, on the board shown. */
  nationalRepresentationGap: number;
  onRetry: () => void;
  /** Offered from the 2026 results only; the 2032 board is the end of the line. */
  onTry2032?: () => void;
}

export function ResultsPanel({
  era,
  selectedMatches,
  nationalRepresentationGap,
  onRetry,
  onTry2032,
}: ResultsPanelProps) {
  const is2032 = era === '2032';
  const board = BOARDS[era];

  // Both boards count the same two things — the gap they started with, and how much
  // of it the pacts closed — so the headline below is one piece of markup either way.
  // Only the baseline differs: 104 off the enacted maps, 182 off the maps 2032 would
  // bring if nobody signed anything.
  const pool = board.pool;
  const seatsClosed = pool - nationalRepresentationGap;

  // Biggest trades first — the pacts that did the most work lead the list. Within
  // a pact the half returning Democrats reads first, so every line runs D then R.
  const pacts = selectedMatches
    .map(([a, b]) => {
      const [left, right] = (board.baselineGaps[a] ?? 0) > 0 ? [a, b] : [b, a];
      return { a: left, b: right, seats: board.returned(a, b) };
    })
    .sort((x, y) => y.seats - x.seats);

  return (
    <div className="results-panel">
      {/* The 2026 board's headline runs two lines, set here rather than left to the
          wrap: what the pacts returned is one clause, and the claim the whole tool
          makes closes on a line of its own.

          The 2032 board takes one line instead. Its second line used to be the same
          margin claim, and that claim stopped being true there once an unclosed gap
          began going to the state's own majority: an uneven pact moves the House, and
          the stat bar says so. Rather than qualify it on every uneven run, the line
          goes, and the headline says the one thing that is always true — how many
          districts the pacts drew proportionally that nobody would have drawn. */}
      {is2032 ? (
        <p className="results-headline">
          Your {spellCount(pacts.length)} {pacts.length === 1 ? 'pact' : 'pacts'} created{' '}
          <span style={{ color: FAIR_BLACK }}>{seatsClosed}</span> proportional districts.
        </p>
      ) : seatsClosed > 0 ? (
        <p className="results-headline">
          <span className="headline-line">
            Your {spellCount(pacts.length)} {pacts.length === 1 ? 'pact' : 'pacts'} returned{' '}
            <span style={{ color: FAIR_BLACK }}>{seatsClosed}</span> of{' '}
            <span style={{ color: GAP_ORANGE }}>{pool}</span> districts,
          </span>
          <span className="headline-line">and the U.S. House district margin is unchanged.</span>
        </p>
      ) : (
        <p className="results-headline">
          <span className="headline-line">
            No seats returned yet — all <span style={{ color: GAP_ORANGE }}>{pool}</span>{' '}
            districts stand,
          </span>
          <span className="headline-line">and the U.S. House district margin is unchanged.</span>
        </p>
      )}

      {/* Finish only appears once a pact is sealed, so there is always a list. */}
      <ul className="results-pacts">
        {pacts.map(({ a, b, seats }) => (
          <li key={`${a}-${b}`}>
            {/* A pair with nothing to trade keeps its names, greyed — there is
                no swap to show. */}
            {seats > 0 ? (
              <>
                <PactHalf era={era} stateId={a} seats={seats} /> &harr;{' '}
                <PactHalf era={era} stateId={b} seats={seats} />
              </>
            ) : (
              <span style={{ color: '#aaa' }}>
                {stateDataById[a]?.name ?? a} &harr; {stateDataById[b]?.name ?? b}
              </span>
            )}
          </li>
        ))}
      </ul>

      {/* The orange button from under the columns, and — off the 2026 results only —
          the one that carries the same argument past the next census. Retry puts the
          board back and reads orange for it; Try 2032 goes forward and wears the
          black Start and Finish wear. */}
      <div className="finish-row">
        <button className="restart-btn" onClick={onRetry}>
          Retry
        </button>
        {onTry2032 && (
          <button className="try-2032-btn" onClick={onTry2032}>
            Try 2032
          </button>
        )}
      </div>
    </div>
  );
}
