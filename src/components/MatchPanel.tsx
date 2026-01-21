import { HoveredState } from '../types';
import { stateData } from '../data/stateData';
import { findMatches, getSeats, DistrictYear } from '../utils/findMatches';
import type { MatchFilters } from '../App';

function formatEg(eg: number): string {
  const percent = Math.abs(eg * 100).toFixed(1);
  if (eg > 0) {
    return `R+${percent}% EG`;
  } else if (eg < 0) {
    return `D+${percent}% EG`;
  }
  return '0% EG';
}

function formatSeats(seats: number): string {
  const absSeats = Math.abs(seats).toFixed(1);
  if (seats > 0) {
    return `R+${absSeats} seats`;
  } else if (seats < 0) {
    return `D+${absSeats} seats`;
  }
  return '0 seats';
}

interface MatchPanelProps {
  hoveredState: HoveredState | null;
  districtYear: DistrictYear;
  filters?: MatchFilters;
}

export function MatchPanel({ hoveredState, districtYear, filters }: MatchPanelProps) {
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
            <li>Opposite partisan lean</li>            
            <li>Similar district count (within 25%)</li>
            <li>Similar seats impact (±1 seat)</li>
          </ul>
        </div>
      </div>
    );
  }

  const allMatches = findMatches(hoveredState.state, stateData, districtYear);
  const matches = allMatches.filter(match => {
    if (filters?.bothVeto && !(hoveredState.state.governorCanVeto && match.governorCanVeto)) {
      return false;
    }
    if (filters?.bothBallot && !(hoveredState.state.hasBallotInitiative && match.hasBallotInitiative)) {
      return false;
    }
    return true;
  });
  const districts = districtYear === '2032'
    ? hoveredState.state.districts2032
    : hoveredState.state.districts;
  const isSingleDistrict = districts === 1;
  const eg = hoveredState.state.efficiencyGap;
  const seats = getSeats(hoveredState.state, districtYear);
  const partisanLean = hoveredState.state.partisanLean >= 0
    ? `D+${hoveredState.state.partisanLean.toFixed(1)}`
    : `R+${Math.abs(hoveredState.state.partisanLean).toFixed(1)}`;

  return (
    <div className="match-panel">
      <h2>MAR Partners</h2>

      <div className="selected-state">
        <div className="state-card-row">
          <span className="state-card-name-lean">
            <span className="state-card-name">{hoveredState.state.name}</span>
            <span className={`state-card-lean ${hoveredState.state.partisanLean >= 0 ? 'lean-d' : 'lean-r'}`}>
              {partisanLean}
            </span>
          </span>
          <span className={`state-card-eg ${eg > 0 ? 'lean-r' : eg < 0 ? 'lean-d' : ''}`}>
            {formatEg(eg)}
          </span>
        </div>
        <div className="state-card-row">
          <span className="state-card-districts">{districts} {districts === 1 ? 'district' : 'districts'}</span>
          <span className={`state-card-seats ${seats > 0 ? 'lean-r' : seats < 0 ? 'lean-d' : ''}`}>
            {formatSeats(seats)}
          </span>
        </div>
      </div>

      {isSingleDistrict ? (
        <div className="no-matches">
          <p>Single-district state</p>
          <p className="small">
            States with only one congressional district cannot be gerrymandered and have no MAR partners.
          </p>
        </div>
      ) : matches.length > 0 ? (
        <div className="matches-list">
          <h4>Potential Partners ({matches.length})</h4>
          {matches.map(match => {
            const matchDistricts = districtYear === '2032'
              ? match.districts2032
              : match.districts;
            const matchEg = match.efficiencyGap;
            const matchSeats = getSeats(match, districtYear);
            const matchLean = match.partisanLean >= 0
              ? `D+${match.partisanLean.toFixed(1)}`
              : `R+${Math.abs(match.partisanLean).toFixed(1)}`;
            return (
              <div key={match.id} className="match-item">
                <div className="state-card-row">
                  <span className="state-card-name-lean">
                    <span className="state-card-name">{match.name}</span>
                    <span className={`state-card-lean ${match.partisanLean >= 0 ? 'lean-d' : 'lean-r'}`}>
                      {matchLean}
                    </span>
                  </span>
                  <span className={`state-card-eg ${matchEg > 0 ? 'lean-r' : matchEg < 0 ? 'lean-d' : ''}`}>
                    {formatEg(matchEg)}
                  </span>
                </div>
                <div className="state-card-row">
                  <span className="state-card-districts">{matchDistricts} districts</span>
                  <span className={`state-card-seats ${matchSeats > 0 ? 'lean-r' : matchSeats < 0 ? 'lean-d' : ''}`}>
                    {formatSeats(matchSeats)}
                  </span>
                </div>
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
