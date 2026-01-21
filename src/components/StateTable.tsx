import { useState, useMemo } from 'react';
import { RedistrictingAuthority, StateControl, StateData } from '../types';
import { stateData } from '../data/stateData';
import { findMatches, getSeats, DistrictYear } from '../utils/findMatches';
import type { MatchFilters } from '../App';

type SortKey = 'name' | 'partisanLean' | 'districts' | 'efficiencyGap' | 'seats' | 'stateControl' | 'matches';
type SortDirection = 'asc' | 'desc';

interface StateTableProps {
  districtYear: DistrictYear;
  onDistrictYearChange: (year: DistrictYear) => void;
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

export function StateTable({ districtYear, onDistrictYearChange, hideHeader, filters, selectedStateId, lockedStateId, onHoverState, onClickState }: StateTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const filterBothVeto = filters?.bothVeto ?? false;
  const filterBothBallot = filters?.bothBallot ?? false;

  const getDistricts = (state: typeof stateData[0]) =>
    districtYear === '2030' ? state.districts2030 : state.districts;

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
    if (lean >= 0) {
      return `D+${lean.toFixed(1)}`;
    }
    return `R+${Math.abs(lean).toFixed(1)}`;
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
      {!hideHeader && (
        <>
          <h2>All States Overview</h2>
          <p className="table-description">
            Complete data for all states with MAR partner potential. States where governor
            can veto maps or citizens can use ballot initiatives have more pathways for reform.
          </p>
        </>
      )}
      {!hideHeader && (
        <div className="table-filters">
          <div className="filter-group">
            <span className="filter-label">District counts:</span>
            <div className="toggle-buttons">
              <button
                className={districtYear === 'current' ? 'active' : ''}
                onClick={() => onDistrictYearChange('current')}
              >
                Current
              </button>
              <button
                className={districtYear === '2030' ? 'active' : ''}
                onClick={() => onDistrictYearChange('2030')}
              >
                2030 Projected
              </button>
            </div>
          </div>
          <div className="filter-divider" />
          <span className="filter-label">Filter matches:</span>
          <label className="filter-checkbox">
            <input
              type="checkbox"
              checked={filterBothVeto}
              readOnly
            />
            Both states have governor veto
          </label>
          <label className="filter-checkbox">
            <input
              type="checkbox"
              checked={filterBothBallot}
              readOnly
            />
            Both states have ballot initiative
          </label>
        </div>
      )}
      <div className="table-wrapper">
        <table className="state-table">
          <thead>
            <tr>
              <SortHeader label="State" sortKeyName="name" />
              <SortHeader label="Partisan Lean (2024 Pres)" sortKeyName="partisanLean" />
              <SortHeader label={districtYear === '2030' ? 'Districts (Projected)' : 'Districts (Current)'} sortKeyName="districts" />
              <SortHeader label="Efficiency Gap (2024)" sortKeyName="efficiencyGap" />
              <SortHeader label="Seats Impact" sortKeyName="seats" />
              <SortHeader label="State Control" sortKeyName="stateControl" />
              <th>Map Authority</th>
              <th>Governor Veto</th>
              <th>Ballot Initiative</th>
              <SortHeader label="Match Partners" sortKeyName="matches" />
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
                <td className={`center ${state.partisanLean >= 0 ? 'lean-d' : 'lean-r'}`}>
                  {formatLean(state.partisanLean)}
                </td>
                <td className="center">{getDistricts(state)}</td>
                <td className={`center ${state.efficiencyGap > 0 ? 'lean-r' : state.efficiencyGap < 0 ? 'lean-d' : ''}`}>
                  {formatEg(state.efficiencyGap)}
                </td>
                <td className={`center ${getSeats(state, districtYear) > 0 ? 'lean-r' : getSeats(state, districtYear) < 0 ? 'lean-d' : ''}`}>
                  {formatSeats(getSeats(state, districtYear))}
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
                      {state.matches.slice(0, 7).map(match => (
                        <span
                          key={match.id}
                          className={`match-tag lean-${match.lean.toLowerCase()}`}
                          title={`${match.name}: ${formatEg(match.efficiencyGap)}, ${formatLean(match.partisanLean)}`}
                        >
                          {match.id}
                        </span>
                      ))}
                      {state.matches.length > 7 && (
                        <span className="more-matches">+{state.matches.length - 7}</span>
                      )}
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
      </div>
      <div className="table-legend">
        <h4>Legend</h4>
        <div className="legend-items">
          <div className="legend-item">
            <strong>Partisan Lean:</strong> State's overall partisan lean - D+ (Democratic), R+ (Republican)
          </div>
          <div className="legend-item">
            <strong>Efficiency Gap:</strong> Measures wasted votes - positive = R advantage, negative = D advantage
          </div>
          <div className="legend-item">
            <strong>Seats Impact:</strong> Net seats gained from gerrymandering - R+ or D+
          </div>
          <div className="legend-item">
            <strong>State Control:</strong> Which party controls the governorship and both legislative chambers
          </div>
          <div className="legend-item">
            <strong>Grayed rows:</strong> Single-district states cannot be gerrymandered and have no MAR partners
          </div>
        </div>
      </div>
    </div>
  );
}
