import { HoveredState } from '../types';
import { stateData } from '../data/stateData';
import { findMatches, getSeats, isStrongMatch, DistrictYear } from '../utils/findMatches';
import type { MatchFilters } from '../App';

function formatSeats(seats: number): string {
  const absSeats = Math.abs(seats).toFixed(1);
  if (seats > 0) {
    return `R+${absSeats}`;
  } else if (seats < 0) {
    return `D+${absSeats}`;
  }
  return '0';
}

function formatEg(eg: number): string {
  const percent = Math.abs(eg * 100).toFixed(1);
  if (eg > 0) {
    return `R+${percent}%`;
  } else if (eg < 0) {
    return `D+${percent}%`;
  }
  return '0%';
}

function formatLean(lean: number): string {
  if (lean >= 0) {
    return `D+${lean.toFixed(1)}%`;
  }
  return `R+${Math.abs(lean).toFixed(1)}%`;
}

interface MatchPanelProps {
  hoveredState: HoveredState | null;
  districtYear: DistrictYear;
  filters?: MatchFilters;
  maxHeight?: number;
}

export function MatchPanel({ hoveredState, districtYear, filters, maxHeight }: MatchPanelProps) {
  if (!hoveredState) {
    return (
      <div className="match-panel" style={{ maxHeight: maxHeight ? `${maxHeight}px` : undefined }}>
        <h2>Potential Matches</h2>
        <p className="hint">Hover over a state to see potential MAR partners.</p>
        <div className="explanation">
          <h3>How it works</h3>
          {districtYear === '2032' ? (
            <>
              <p>
                States with <strong>equal and opposite</strong> House delegations can form
                interstate pacts to de-escalate together.
              </p>
              <p>
                Matches are states with:
              </p>
              <ul>
                <li>Similar district count (within 30%)</li>
                <li>Opposite partisan lean (within 5%)</li>
              </ul>
            </>
          ) : (
            <>
              <p>
                States with <strong>equal and opposite</strong> gerrymandering can form
                interstate pacts to de-escalate together.
              </p>
              <p>
                Matches are states with:
              </p>
              <ul>
                <li>Similar district count (within 30%)</li>
                <li>Opposite efficiency gap (within 10%)</li>
              </ul>
            </>
          )}
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
  const seats = getSeats(hoveredState.state, districtYear);
  const eg = hoveredState.state.efficiencyGap;
  const stateName = hoveredState.state.name;

  return (
    <div className="match-panel" style={{ maxHeight: maxHeight ? `${maxHeight}px` : undefined }}>
      {isSingleDistrict ? (
        <>
          <h2>Potential Matches (0)</h2>
          <div className="no-matches">
            <p>{stateName} has 1 district</p>
            <p className="small">
              States with only one congressional district cannot be gerrymandered.
            </p>
          </div>
        </>
      ) : matches.length > 0 ? (
        <>
          <h2>Potential Matches ({matches.length})</h2>
          <div className="matches-list">
            {matches.map(match => {
              const matchDistricts = districtYear === '2032'
                ? match.districts2032
                : match.districts;
              const matchSeats = getSeats(match, districtYear);
              const matchEg = match.efficiencyGap;
              const lean = hoveredState.state.partisanLean;
              const matchLean = match.partisanLean;
              const matchStrength = isStrongMatch(hoveredState.state, match, districtYear) ? 'strong' : 'weak';
              return (
                <div key={match.id} className={`match-item match-${matchStrength}`}>
                  <div className="match-header">
                    <span className="match-state">{stateName}</span>
                    <span className="match-arrow">↔</span>
                    <span className="match-state">{match.name}</span>
                  </div>
                  <div className="match-comparison">
                    <div className="match-row">
                      <span className="match-label">Districts</span>
                      <span className="match-value">{districts}</span>
                      <span className="match-separator">|</span>
                      <span className="match-value">{matchDistricts}</span>
                    </div>
                    {districtYear === '2032' ? (
                      <>
                        <div className="match-row">
                          <span className="match-label">Partisan Lean</span>
                          <span className={`match-value ${lean >= 0 ? 'lean-d' : 'lean-r'}`}>
                            {formatLean(lean)}
                          </span>
                          <span className="match-separator">|</span>
                          <span className={`match-value ${matchLean >= 0 ? 'lean-d' : 'lean-r'}`}>
                            {formatLean(matchLean)}
                          </span>
                        </div>
                        <div className="match-row">
                          <span className="match-label">Projected Seats</span>
                          <span className={`match-value ${seats > 0 ? 'lean-r' : seats < 0 ? 'lean-d' : ''}`}>
                            {formatSeats(seats)}
                          </span>
                          <span className="match-separator">|</span>
                          <span className={`match-value ${matchSeats > 0 ? 'lean-r' : matchSeats < 0 ? 'lean-d' : ''}`}>
                            {formatSeats(matchSeats)}
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="match-row">
                          <span className="match-label">Efficiency Gap</span>
                          <span className={`match-value ${eg > 0 ? 'lean-r' : eg < 0 ? 'lean-d' : ''}`}>
                            {formatEg(eg)}
                          </span>
                          <span className="match-separator">|</span>
                          <span className={`match-value ${matchEg > 0 ? 'lean-r' : matchEg < 0 ? 'lean-d' : ''}`}>
                            {formatEg(matchEg)}
                          </span>
                        </div>
                        <div className="match-row">
                          <span className="match-label">Seats Impact</span>
                          <span className={`match-value ${seats > 0 ? 'lean-r' : seats < 0 ? 'lean-d' : ''}`}>
                            {formatSeats(seats)}
                          </span>
                          <span className="match-separator">|</span>
                          <span className={`match-value ${matchSeats > 0 ? 'lean-r' : matchSeats < 0 ? 'lean-d' : ''}`}>
                            {formatSeats(matchSeats)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <h2>Potential Matches (0)</h2>
          <div className="no-matches">
            <p>No matches for {stateName}</p>
            <p className="small">
              This state may have a unique combination of districts and {districtYear === '2032' ? 'partisan lean' : 'seats impact'}.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
