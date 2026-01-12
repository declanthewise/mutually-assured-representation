import { HoveredState } from '../types';
import { stateData } from '../data/stateData';
import { findMatches } from '../utils/findMatches';

interface MatchPanelProps {
  hoveredState: HoveredState | null;
}

export function MatchPanel({ hoveredState }: MatchPanelProps) {
  if (!hoveredState) {
    return (
      <div className="match-panel">
        <h2>Ceasefire Partners</h2>
        <p className="hint">Hover over a state to see potential ceasefire partners.</p>
        <div className="explanation">
          <h3>How it works</h3>
          <p>
            States with <strong>equal and opposite</strong> gerrymandering can form
            interstate pacts to de-escalate together.
          </p>
          <p>
            Matches are states with:
          </p>
          <ul>
            <li>Similar number of districts (±3)</li>
            <li>Opposite partisan lean</li>
            <li>Similar efficiency gap magnitude (±8%)</li>
          </ul>
        </div>
      </div>
    );
  }

  const matches = findMatches(hoveredState.state, stateData);
  const egPercent = (hoveredState.state.efficiencyGap * 100).toFixed(1);
  const egSign = hoveredState.state.efficiencyGap > 0 ? '+' : '';

  return (
    <div className="match-panel">
      <h2>Ceasefire Partners</h2>

      <div className="selected-state">
        <h3>{hoveredState.state.name}</h3>
        <div className="state-stats">
          <span>{hoveredState.state.districts} districts</span>
          <span className={`lean-${hoveredState.state.lean.toLowerCase()}`}>
            {egSign}{egPercent}% EG
          </span>
        </div>
      </div>

      {matches.length > 0 ? (
        <div className="matches-list">
          <h4>Potential Partners ({matches.length})</h4>
          {matches.map(match => {
            const matchEg = (match.efficiencyGap * 100).toFixed(1);
            const matchSign = match.efficiencyGap > 0 ? '+' : '';
            return (
              <div key={match.id} className="match-item">
                <span className="match-name">{match.name}</span>
                <span className="match-stats">
                  {match.districts} dist, {matchSign}{matchEg}%
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="no-matches">
          <p>No ceasefire partners found.</p>
          <p className="small">
            This state may have a unique combination of districts and partisan lean.
          </p>
        </div>
      )}
    </div>
  );
}
