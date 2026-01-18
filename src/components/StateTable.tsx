import { useState, useMemo } from 'react';
import { RedistrictingAuthority } from '../types';
import { stateData } from '../data/stateData';
import { findMatches, DistrictYear } from '../utils/findMatches';

type SortKey = 'name' | 'districts' | 'efficiencyGap' | 'partisanLean' | 'matches';
type SortDirection = 'asc' | 'desc';

interface StateTableProps {
  districtYear: DistrictYear;
  onDistrictYearChange: (year: DistrictYear) => void;
}

const authorityLabels: Record<RedistrictingAuthority, string> = {
  legislature: 'Legislature',
  independent_commission: 'Independent Commission',
  politician_commission: 'Politician Commission',
  advisory_commission: 'Advisory Commission',
};

export function StateTable({ districtYear, onDistrictYearChange }: StateTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterBothVeto, setFilterBothVeto] = useState(false);
  const [filterBothBallot, setFilterBothBallot] = useState(false);

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
        case 'districts':
          comparison = getDistricts(a) - getDistricts(b);
          break;
        case 'efficiencyGap':
          comparison = a.efficiencyGap - b.efficiencyGap;
          break;
        case 'partisanLean':
          comparison = a.partisanLean - b.partisanLean;
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
      setSortDirection('asc');
    }
  };

  const formatEg = (eg: number) => {
    const percent = (eg * 100).toFixed(1);
    return eg > 0 ? `+${percent}%` : `${percent}%`;
  };

  const formatLean = (lean: number) => {
    if (lean >= 0) {
      return `D+${lean.toFixed(1)}`;
    }
    return `R+${Math.abs(lean).toFixed(1)}`;
  };

  const SortHeader = ({ label, sortKeyName }: { label: string; sortKeyName: SortKey }) => (
    <th onClick={() => handleSort(sortKeyName)} className="sortable">
      {label}
      {sortKey === sortKeyName && (
        <span className="sort-indicator">{sortDirection === 'asc' ? ' \u25B2' : ' \u25BC'}</span>
      )}
    </th>
  );

  return (
    <div className="state-table-container">
      <h2>All States Overview</h2>
      <p className="table-description">
        Complete data for all states with MAR partner potential. States where governor
        can veto maps or citizens can use ballot initiatives have more pathways for reform.
      </p>
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
            onChange={e => setFilterBothVeto(e.target.checked)}
          />
          Both states have governor veto
        </label>
        <label className="filter-checkbox">
          <input
            type="checkbox"
            checked={filterBothBallot}
            onChange={e => setFilterBothBallot(e.target.checked)}
          />
          Both states have ballot initiative
        </label>
        {(filterBothVeto || filterBothBallot) && (
          <button
            className="clear-filters"
            onClick={() => { setFilterBothVeto(false); setFilterBothBallot(false); }}
          >
            Clear filters
          </button>
        )}
      </div>
      <div className="table-wrapper">
        <table className="state-table">
          <thead>
            <tr>
              <SortHeader label="State" sortKeyName="name" />
              <SortHeader label={districtYear === '2030' ? 'Districts (2030)' : 'Districts'} sortKeyName="districts" />
              <SortHeader label="Eff. Gap" sortKeyName="efficiencyGap" />
              <SortHeader label="Lean" sortKeyName="partisanLean" />
              <th>Map Authority</th>
              <th>Gov. Veto</th>
              <th>Ballot Init.</th>
              <SortHeader label="Matches" sortKeyName="matches" />
              <th>Best Match Partners</th>
            </tr>
          </thead>
          <tbody>
            {sortedStates.map(state => (
              <tr key={state.id}>
                <td className="state-name">{state.name}</td>
                <td className="center">{getDistricts(state)}</td>
                <td className={`center ${state.efficiencyGap > 0 ? 'lean-r' : state.efficiencyGap < 0 ? 'lean-d' : ''}`}>
                  {formatEg(state.efficiencyGap)}
                </td>
                <td className={`center ${state.partisanLean >= 0 ? 'lean-d' : 'lean-r'}`}>
                  {formatLean(state.partisanLean)}
                </td>
                <td className="authority">{authorityLabels[state.redistrictingAuthority]}</td>
                <td className={`center ${state.governorCanVeto ? 'yes' : 'no'}`}>
                  {state.governorCanVeto ? 'Yes' : 'No'}
                </td>
                <td className={`center ${state.hasBallotInitiative ? 'yes' : 'no'}`}>
                  {state.hasBallotInitiative ? 'Yes' : 'No'}
                </td>
                <td className="center match-count">
                  {state.matches.length > 0 ? (
                    <span className="has-matches">
                      {state.matches.length}
                      {(filterBothVeto || filterBothBallot) && state.totalMatches !== state.matches.length && (
                        <span className="total-matches">/{state.totalMatches}</span>
                      )}
                    </span>
                  ) : (
                    <span className="no-matches-count">
                      0
                      {(filterBothVeto || filterBothBallot) && state.totalMatches > 0 && (
                        <span className="total-matches">/{state.totalMatches}</span>
                      )}
                    </span>
                  )}
                </td>
                <td className="matches-cell">
                  {state.matches.length > 0 ? (
                    <div className="match-tags">
                      {state.matches.slice(0, 3).map(match => (
                        <span
                          key={match.id}
                          className={`match-tag lean-${match.lean.toLowerCase()}`}
                          title={`${match.name}: ${formatEg(match.efficiencyGap)} EG, ${formatLean(match.partisanLean)}`}
                        >
                          {match.id}
                        </span>
                      ))}
                      {state.matches.length > 3 && (
                        <span className="more-matches">+{state.matches.length - 3}</span>
                      )}
                    </div>
                  ) : (
                    <span className="no-matches-text">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="table-legend">
        <h4>Legend</h4>
        <div className="legend-items">
          <div className="legend-item">
            <strong>Eff. Gap:</strong> Efficiency gap - positive (R advantage), negative (D advantage)
          </div>
          <div className="legend-item">
            <strong>Gov. Veto:</strong> Can governor veto congressional redistricting maps
          </div>
          <div className="legend-item">
            <strong>Ballot Init.:</strong> State allows citizen ballot initiatives for redistricting reform
          </div>
          <div className="legend-item">
            <strong>Double Trigger:</strong> States with both Gov. Veto = No AND Ballot Init. = Yes have citizen-only reform pathways
          </div>
        </div>
      </div>
    </div>
  );
}
