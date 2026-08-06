import { FAIR_GREEN, GAP_GOLD } from '../colors';
import {
  baselineGaps,
  computeNationalRepresentationGap,
  pactSeatsReturned,
} from '../data/computeRepresentationGap';
import { houseBalance, houseBalanceParty } from '../data/districtLeans';
import { stateDataById } from '../data/stateData';
import { MatchPair } from '../types';

/** The gap before any pact is signed — what everything here is measured against. */
const BASELINE_GAP = computeNationalRepresentationGap(baselineGaps);

interface ResultsPanelProps {
  selectedMatches: MatchPair[];
  nationalRepresentationGap: number;
  onResume: () => void;
  onStartOver: () => void;
}

export function ResultsPanel({
  selectedMatches,
  nationalRepresentationGap,
  onResume,
  onStartOver,
}: ResultsPanelProps) {
  const seatsClosed = BASELINE_GAP - nationalRepresentationGap;
  const closedShare = (seatsClosed / BASELINE_GAP) * 100;

  // Biggest trades first — the pacts that did the most work lead the list.
  const pacts = selectedMatches
    .map(([a, b]) => ({ a, b, seats: pactSeatsReturned(a, b) }))
    .sort((x, y) => y.seats - x.seats);

  return (
    <div className="results-panel">
      {seatsClosed > 0 ? (
        <p className="results-headline">
          Your {pacts.length === 1 ? 'pact' : `${pacts.length} pacts`} closed{' '}
          <span style={{ color: FAIR_GREEN }}>{seatsClosed}</span> of the{' '}
          <span style={{ color: GAP_GOLD }}>{BASELINE_GAP}</span> seat representation gap.
        </p>
      ) : (
        <p className="results-headline">
          No seats returned yet — the {BASELINE_GAP} seat gap stands.
        </p>
      )}

      <div className="results-bar" role="img"
        aria-label={`${seatsClosed} of ${BASELINE_GAP} seats returned to proportional`}>
        <div className="results-bar-fill" style={{ width: `${closedShare}%` }} />
      </div>
      <div className="results-bar-labels">
        <span style={{ color: FAIR_GREEN }}>{seatsClosed} returned</span>
        <span style={{ color: GAP_GOLD }}>{nationalRepresentationGap} still off</span>
      </div>

      {pacts.length > 0 && (
        <ul className="results-pacts">
          {pacts.map(({ a, b, seats }) => (
            <li key={`${a}-${b}`}>
              <span className="results-pact-states">
                {stateDataById[a]?.name ?? a} &harr; {stateDataById[b]?.name ?? b}
              </span>
              <span className="results-pact-seats" style={{ color: seats > 0 ? FAIR_GREEN : '#aaa' }}>
                {seats > 0 ? `+${seats} each · ${seats * 2} seats` : 'no seats to trade'}
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="results-note">
        The House is still {houseBalanceParty}+{Math.abs(houseBalance)}. Every pact returned the same
        number of seats to each side, so none of this moved the party balance — only the distortion.
      </p>

      {/* Same pair as under the columns: gold puts the board back, green goes on. */}
      <div className="finish-row">
        <button className="restart-btn" onClick={onStartOver}>
          Start Over
        </button>
        <button className="finish-btn" onClick={onResume}>
          Keep Matching
        </button>
      </div>
    </div>
  );
}
