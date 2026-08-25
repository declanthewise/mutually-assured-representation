import { FAIR_BLACK, GAP_ORANGE, PARTY_COLORS } from '../colors';
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
      {/* Two lines, set here rather than left to the wrap: what the pacts returned
          is one clause, and the claim the whole tool makes closes on a line of its
          own. Each `headline-line` is a block, and `.results-headline` sizes itself
          so the longer of the two stays on one line — see App.css, which is where
          the arithmetic for that lives and where it has to be redone if this
          wording changes. */}
      {seatsClosed > 0 ? (
        <p className="results-headline">
          <span className="headline-line">
            Your {spellCount(pacts.length)} {pacts.length === 1 ? 'pact' : 'pacts'} returned{' '}
            <span style={{ color: FAIR_BLACK }}>{seatsClosed}</span> of{' '}
            <span style={{ color: GAP_ORANGE }}>{BASELINE_GAP}</span> districts,
          </span>
          <span className="headline-line">and the U.S. House district margin is unchanged.</span>
        </p>
      ) : (
        <p className="results-headline">
          <span className="headline-line">
            No seats returned yet — all <span style={{ color: GAP_ORANGE }}>{BASELINE_GAP}</span>{' '}
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

      {/* The orange button from under the columns, alone: from the results there is
          nothing to do but put the board back. */}
      <div className="finish-row">
        <button className="restart-btn" onClick={onRetry}>
          Retry
        </button>
      </div>
    </div>
  );
}
