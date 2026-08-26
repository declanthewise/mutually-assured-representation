import { FAIR_BLACK, GAP_ORANGE, PARTY_COLORS } from '../colors';
import {
  baselineGaps,
  computeNationalRepresentationGap,
  pactSeatsReturned,
} from '../data/computeRepresentationGap';
import {
  computeNational2032Returned,
  isDemocraticSide2032,
  national2032Fair,
  pact2032Returned,
} from '../data/plan2032';
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

/**
 * The party a state hands seats back to when it disarms.
 *
 * On the 2026 board that's read off the gap: a positive gap is R overrepresentation,
 * so unwinding it returns Democrats. On the 2032 board there is no gap, so it's read
 * off the column the same way the box's rows are — a D-leaning state owes its
 * Republicans. The two agree wherever both apply, since the gap is what puts a state
 * in its column on the 2026 board. Either way every pact pairs one of each, which is
 * why the balance holds.
 */
function PactHalf({ era, stateId, seats }: { era: EraId; stateId: string; seats: number }) {
  const state = stateDataById[stateId];
  const party =
    era === '2032'
      ? state && isDemocraticSide2032(state)
        ? 'R'
        : 'D'
      : (baselineGaps[stateId] ?? 0) > 0
        ? 'D'
        : 'R';
  return (
    <span style={{ color: PARTY_COLORS[party] }}>
      +{seats} {state?.name ?? stateId} {PARTY_NAMES[party]}
    </span>
  );
}

interface ResultsPanelProps {
  era: EraId;
  selectedMatches: MatchPair[];
  /** 2026 only — the gap left standing once the pacts are honored. */
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

  // Both boards count the same two things — what the pacts came to, and the pool
  // they were drawn from — so the headline below is one piece of markup either way.
  // What differs is only where the figures come from: districts clawed back off
  // enacted maps in 2026, districts committed before any map exists in 2032.
  const seatsClosed = is2032
    ? computeNational2032Returned(selectedMatches)
    : BASELINE_GAP - nationalRepresentationGap;
  const pool = is2032 ? national2032Fair : BASELINE_GAP;

  // Biggest trades first — the pacts that did the most work lead the list. Within
  // a pact the half returning Democrats reads first, so every line runs D then R.
  const pacts = selectedMatches
    .map(([a, b]) => {
      const aReturnsDemocrats = is2032
        ? !isDemocraticSide2032(stateDataById[a])
        : (baselineGaps[a] ?? 0) > 0;
      const [left, right] = aReturnsDemocrats ? [a, b] : [b, a];
      return {
        a: left,
        b: right,
        seats: is2032 ? pact2032Returned(a, b) : pactSeatsReturned(a, b),
      };
    })
    .sort((x, y) => y.seats - x.seats);

  return (
    <div className="results-panel">
      {/* The 2032 board is reached from a button rather than from the top of the
          page, so it says outright which map it is talking about. */}
      {is2032 && <p className="results-kicker">After the 2030 Census</p>}

      {/* Two lines, set here rather than left to the wrap: what the pacts returned
          is one clause, and the claim the whole tool makes closes on a line of its
          own. Each `headline-line` is a block, and `.results-headline` sizes itself
          so the longer of the two stays on one line — see App.css, which is where
          the arithmetic for that lives and where it has to be redone if this
          wording changes. The 2032 figures are no wider: it caps at "Your 17 pacts
          returned 154 of 182 districts,", two characters short of the 2026 worst
          case the measure was taken against. */}
      {seatsClosed > 0 ? (
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
