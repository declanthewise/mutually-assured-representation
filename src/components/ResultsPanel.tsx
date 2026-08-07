import { FAIR_GREEN, GAP_GOLD, PARTY_COLORS } from '../colors';
import {
  baselineGaps,
  computeNationalRepresentationGap,
  pactSeatsReturned,
} from '../data/computeRepresentationGap';
import { stateDataById } from '../data/stateData';
import { MatchPair } from '../types';

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
 * The party a state hands seats back to when it disarms. A positive gap is R
 * overrepresentation, so unwinding it returns Democrats; a negative gap returns
 * Republicans. Every pact pairs one of each, which is why the balance holds.
 */
function PactHalf({ stateId, seats }: { stateId: string; seats: number }) {
  const party = (baselineGaps[stateId] ?? 0) > 0 ? 'D' : 'R';
  return (
    <span style={{ color: PARTY_COLORS[party] }}>
      +{seats} {stateDataById[stateId]?.name ?? stateId} {PARTY_NAMES[party]}
    </span>
  );
}

interface ResultsPanelProps {
  selectedMatches: MatchPair[];
  nationalRepresentationGap: number;
  onRetry: () => void;
}

export function ResultsPanel({
  selectedMatches,
  nationalRepresentationGap,
  onRetry,
}: ResultsPanelProps) {
  const seatsClosed = BASELINE_GAP - nationalRepresentationGap;

  // Biggest trades first — the pacts that did the most work lead the list. Within
  // a pact the half returning Democrats reads first, so every line runs D then R.
  const pacts = selectedMatches
    .map(([a, b]) => {
      const [left, right] = (baselineGaps[a] ?? 0) > 0 ? [a, b] : [b, a];
      return { a: left, b: right, seats: pactSeatsReturned(a, b) };
    })
    .sort((x, y) => y.seats - x.seats);

  return (
    <div className="results-panel">
      {seatsClosed > 0 ? (
        <p className="results-headline">
          Your {spellCount(pacts.length)} {pacts.length === 1 ? 'pact' : 'pacts'} returned{' '}
          <span style={{ color: FAIR_GREEN }}>{seatsClosed}</span> of{' '}
          <span style={{ color: GAP_GOLD }}>{BASELINE_GAP}</span> gerrymandered seats to their
          constituents, and the U.S. House margin is unchanged.
        </p>
      ) : (
        <p className="results-headline">
          No seats returned yet — all <span style={{ color: GAP_GOLD }}>{BASELINE_GAP}</span>{' '}
          gerrymandered seats stand, and the U.S. House margin is unchanged.
        </p>
      )}

      {pacts.length > 0 && (
        <ul className="results-pacts">
          {pacts.map(({ a, b, seats }) => (
            <li key={`${a}-${b}`}>
              {/* A pair with nothing to trade keeps its names, greyed — there is
                  no swap to show. */}
              {seats > 0 ? (
                <>
                  <PactHalf stateId={a} seats={seats} /> &harr;{' '}
                  <PactHalf stateId={b} seats={seats} />
                </>
              ) : (
                <span style={{ color: '#aaa' }}>
                  {stateDataById[a]?.name ?? a} &harr; {stateDataById[b]?.name ?? b}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* The gold button from under the columns, alone: from the results there is
          nothing to do but put the board back. */}
      <div className="finish-row">
        <button className="restart-btn" onClick={onRetry}>
          Retry
        </button>
      </div>
    </div>
  );
}
