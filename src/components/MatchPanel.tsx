import { HoveredState } from '../types';
import { stateData } from '../data/stateData';
import { findMatches, DistrictYear } from '../utils/findMatches';

interface MatchPanelProps {
  hoveredState: HoveredState | null;
  districtYear: DistrictYear;
}

export function MatchPanel({ hoveredState, districtYear }: MatchPanelProps) {
  if (!hoveredState) {
    return (
      <div className="match-panel">
        <h2>MAR Partners</h2>
        <p className="hint">Hover over a state to see potential MAR partners.</p>
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
            <li>Similar number of districts (within 25%)</li>
            <li>Opposite partisan lean</li>
            <li>Similar efficiency gap magnitude (±8%)</li>
          </ul>
        </div>
      </div>
    );
  }

  const matches = findMatches(hoveredState.state, stateData, districtYear);
  const districts = districtYear === '2030'
    ? hoveredState.state.districts2030
    : hoveredState.state.districts;
  const egPercent = (hoveredState.state.efficiencyGap * 100).toFixed(1);
  const egSign = hoveredState.state.efficiencyGap > 0 ? '+' : '';
  const partisanLean = hoveredState.state.partisanLean >= 0
    ? `D+${hoveredState.state.partisanLean.toFixed(1)}`
    : `R+${Math.abs(hoveredState.state.partisanLean).toFixed(1)}`;

  return (
    <div className="match-panel">
      <h2>MAR Partners</h2>

      <div className="selected-state">
        <h3>{hoveredState.state.name}</h3>
        <div className="state-stats">
          <span>{districts} districts</span>
          <span className={`lean-${hoveredState.state.lean.toLowerCase()}`}>
            {partisanLean}
          </span>
          <span className={`lean-${hoveredState.state.lean.toLowerCase()}`}>
            {egSign}{egPercent}% EG
          </span>
        </div>
      </div>

      {matches.length > 0 ? (
        <div className="matches-list">
          <h4>Potential Partners ({matches.length})</h4>
          {matches.map(match => {
            const matchDistricts = districtYear === '2030'
              ? match.districts2030
              : match.districts;
            const matchEg = (match.efficiencyGap * 100).toFixed(1);
            const matchSign = match.efficiencyGap > 0 ? '+' : '';
            const matchLean = match.partisanLean >= 0
              ? `D+${match.partisanLean.toFixed(1)}`
              : `R+${Math.abs(match.partisanLean).toFixed(1)}`;
            return (
              <div key={match.id} className="match-item">
                <span className="match-name">{match.name}</span>
                <span className={`match-lean lean-${match.lean.toLowerCase()}`}>
                  {matchLean}
                </span>
                <span className="match-stats">
                  {matchDistricts} dist, {matchSign}{matchEg}% EG
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="no-matches">
          <p>No MAR partners found.</p>
          <p className="small">
            This state may have a unique combination of districts and partisan lean.
          </p>
        </div>
      )}
    </div>
  );
}
