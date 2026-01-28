import { useState, useMemo } from 'react';
import { RedistrictingAuthority, StateControl, StateData } from '../types';
import { stateData } from '../data/stateData';
import { findMatches, getSeats, isStrongMatch, DistrictYear } from '../utils/findMatches';
import type { MatchFilters } from '../App';

/**
 * Get background color for a state based on partisan lean.
 * More partisan = more intense color.
 * D-leaning (positive) = blue, R-leaning (negative) = red.
 * States at or near 0 lean are more transparent.
 */
function getPartisanColor(state: StateData): string {
  const lean = state.partisanLean;

  // Max lean around 20% for full saturation (Cook PVI scale)
  const intensity = Math.min(Math.abs(lean) / 20, 1);

  // Opacity scales with intensity - neutral states are more transparent
  const opacity = 0.2 + intensity * 0.8;

  if (lean === 0) {
    return 'rgba(200, 200, 200, 0.3)';
  } else if (lean > 0) {
    // D-leaning: blue
    return `rgba(100, 130, 255, ${opacity})`;
  } else {
    // R-leaning: red
    return `rgba(255, 100, 100, ${opacity})`;
  }
}

type SortKey = 'name' | 'partisanLean' | 'districts' | 'efficiencyGap' | 'seats' | 'stateControl' | 'matches';
type SortDirection = 'asc' | 'desc';

interface StateTableProps {
  districtYear: DistrictYear;
  hideHeader?: boolean;
  filters?: MatchFilters;
  selectedStateId?: string | null;
  lockedStateId?: string | null;
  onHoverState?: (state: StateData | null) => void;
  onClickState?: (state: StateData | null) => void;
}

const authorityLabels: Record<RedistrictingAuthority, string> = {
  legislature: 'Legislature',
  independent_commission: 'Independent Commission',
  politician_commission: 'Politician Commission',
  advisory_commission: 'Advisory Commission',
};

const stateControlLabels: Record<StateControl, string> = {
  dem: 'D',
  rep: 'R',
  split: 'Split',
};

export function StateTable({ districtYear, hideHeader, filters, selectedStateId, lockedStateId, onHoverState, onClickState }: StateTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const filterBothVeto = filters?.bothVeto ?? false;
  const filterBothBallot = filters?.bothBallot ?? false;

  const getDistricts = (state: typeof stateData[0]) =>
    districtYear === '2032' ? state.districts2032 : state.districts;

  const statesWithMatches = useMemo(() => {
    return stateData.map(state => {
      const allMatches = findMatches(state, stateData, districtYear);
      const filteredMatches = allMatches.filter(match => {
        if (filterBothVeto && !(state.governorCanVeto && match.governorCanVeto)) {
          return false;
        }
        if (filterBothBallot && !(state.hasBallotInitiative && match.hasBallotInitiative)) {
          return false;
        }
        return true;
      });
      return {
        ...state,
        matches: filteredMatches,
        totalMatches: allMatches.length,
      };
    });
  }, [filterBothVeto, filterBothBallot, districtYear]);

  const sortedStates = useMemo(() => {
    return [...statesWithMatches].sort((a, b) => {
      let comparison = 0;
      switch (sortKey) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'partisanLean':
          comparison = Math.abs(a.partisanLean) - Math.abs(b.partisanLean);
          break;
        case 'districts':
          comparison = getDistricts(a) - getDistricts(b);
          break;
        case 'efficiencyGap':
          comparison = Math.abs(a.efficiencyGap) - Math.abs(b.efficiencyGap);
          break;
        case 'seats':
          comparison = Math.abs(getSeats(a, districtYear)) - Math.abs(getSeats(b, districtYear));
          break;
        case 'stateControl':
          comparison = a.stateControl.localeCompare(b.stateControl);
          break;
        case 'matches':
          comparison = a.matches.length - b.matches.length;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [statesWithMatches, sortKey, sortDirection, districtYear]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  const formatSeats = (seats: number) => {
    const absSeats = Math.abs(seats).toFixed(1);
    if (seats > 0) {
      return `R+${absSeats}`;
    } else if (seats < 0) {
      return `D+${absSeats}`;
    }
    return '0';
  };

  const formatEg = (eg: number) => {
    const percent = Math.abs(eg * 100).toFixed(1);
    if (eg > 0) {
      return `R+${percent}%`;
    } else if (eg < 0) {
      return `D+${percent}%`;
    }
    return '0%';
  };

  const formatLean = (lean: number) => {
    if (lean === 0) {
      return 'EVEN';
    }
    if (lean > 0) {
      return `D+${Math.round(lean)}%`;
    }
    return `R+${Math.round(Math.abs(lean))}%`;
  };

  const SortHeader = ({ label, sortKeyName }: { label: string; sortKeyName: SortKey }) => {
    const isActive = sortKey === sortKeyName;
    const arrow = sortDirection === 'asc' ? ' \u25B2' : ' \u25BC';
    return (
      <th onClick={() => handleSort(sortKeyName)} className="sortable">
        {label}
        {isActive && <span className="sort-indicator">{arrow}</span>}
      </th>
    );
  };

  return (
    <div className={`state-table-container${hideHeader ? ' embedded' : ''}`}>
      <div className="table-wrapper">
        <table className="state-table">
          <thead>
            <tr>
              <SortHeader label="State" sortKeyName="name" />
              <SortHeader label="Partisan Lean" sortKeyName="partisanLean" />
              <SortHeader label="Districts" sortKeyName="districts" />
              <SortHeader label="Efficiency Gap" sortKeyName="efficiencyGap" />
              <SortHeader label="Seats Impact" sortKeyName="seats" />
              <SortHeader label="State Control" sortKeyName="stateControl" />
              <th>Map Authority</th>
              <th>Governor Veto</th>
              <th>Ballot Initiative</th>
              <SortHeader label="Best Matches" sortKeyName="matches" />
            </tr>
          </thead>
          <tbody>
            {sortedStates.map(state => {
              const isSingleDistrict = getDistricts(state) === 1;
              const isSelected = selectedStateId === state.id;
              return (
              <tr
                key={state.id}
                className={`${isSingleDistrict ? 'single-district' : ''} ${isSelected ? 'selected' : ''} ${lockedStateId === state.id ? 'locked' : ''}`}
                onMouseEnter={() => !lockedStateId && onHoverState?.(state)}
                onMouseLeave={() => !lockedStateId && onHoverState?.(null)}
                onClick={() => onClickState?.(lockedStateId === state.id ? null : state)}
              >
                <td className="state-name">{state.name}</td>
                <td className={`center ${state.partisanLean > 0 ? 'lean-d' : state.partisanLean < 0 ? 'lean-r' : ''}`}>
                  {formatLean(state.partisanLean)}
                </td>
                <td className="center">{getDistricts(state)}</td>
                <td className={`center ${districtYear === '2032' ? 'grayed-out' : state.efficiencyGap > 0 ? 'lean-r' : state.efficiencyGap < 0 ? 'lean-d' : ''}`}>
                  {districtYear === '2032' ? 'N/A' : formatEg(state.efficiencyGap)}
                </td>
                <td className={`center ${districtYear === '2032' ? 'grayed-out' : getSeats(state, districtYear) > 0 ? 'lean-r' : getSeats(state, districtYear) < 0 ? 'lean-d' : ''}`}>
                  {districtYear === '2032' ? 'N/A' : formatSeats(getSeats(state, districtYear))}
                </td>
                <td className={`center state-control-${state.stateControl}`}>
                  {stateControlLabels[state.stateControl]}
                </td>
                <td className="authority">{authorityLabels[state.redistrictingAuthority]}</td>
                <td className="center">
                  {state.governorCanVeto ? 'Yes' : 'No'}
                </td>
                <td className="center">
                  {state.hasBallotInitiative ? 'Yes' : 'No'}
                </td>
                <td className="matches-cell">
                  {state.matches.length > 0 ? (
                    <div className="match-tags">
                      {(() => {
                        // If more than 1 match, only show strong matches
                        const displayMatches = state.matches.length > 1
                          ? state.matches.filter(m => isStrongMatch(state, m, districtYear))
                          : state.matches;
                        return displayMatches.slice(0, 5).map(match => {
                          const bgColor = getPartisanColor(match);
                          return (
                            <span
                              key={match.id}
                              className="match-tag"
                              style={{ backgroundColor: bgColor }}
                            >
                              {match.id}
                            </span>
                          );
                        });
                      })()}
                    </div>
                  ) : (
                    <span className="no-matches-text">{isSingleDistrict ? 'N/A' : '-'}</span>
                  )}
                </td>
              </tr>
            );
            })}
          </tbody>
        </table>
        <div className="table-legend">
        <span><strong>Partisan Lean:</strong> <a href="https://en.wikipedia.org/wiki/Cook_Partisan_Voting_Index" target="_blank" rel="noopener noreferrer">Cook PVI</a></span>
        <span><strong>Districts:</strong> Number of congressional districts</span>
        <span><strong>Efficiency Gap:</strong> <a href="https://github.com/PlanScore/National-EG-Map" target="_blank" rel="noopener noreferrer">2024 House results</a></span>
        <span><strong>Seats Impact:</strong> Seats gained from gerrymandering</span>
        <span><strong>State Control:</strong> Government trifecta</span>
        <span><strong>Map Authority:</strong> <a href="https://www.brennancenter.org/our-work/research-reports/who-draws-maps-legislative-and-congressional-redistricting" target="_blank" rel="noopener noreferrer">Who draws the congressional map</a></span>
        <span><strong>Governor Veto:</strong> <a href="https://ballotpedia.org/State-by-state_redistricting_procedures" target="_blank" rel="noopener noreferrer">Governor can veto the map</a></span>
        <span><strong>Ballot Initiative:</strong> <a href="https://ballotpedia.org/States_with_initiative_or_referendum" target="_blank" rel="noopener noreferrer">Citizen initiatives allowed</a></span>
        </div>
      </div>
    </div>
  );
}
