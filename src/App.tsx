import { useState } from 'react';
import { USMap } from './components/USMap';
import { StateTooltip } from './components/StateTooltip';
import { MatchPanel } from './components/MatchPanel';
import { Legend } from './components/Legend';
import { StateTable } from './components/StateTable';
import { HoveredState } from './types';
import { DistrictYear } from './utils/findMatches';

type ViewTab = 'map' | 'table';

export interface MatchFilters {
  bothVeto: boolean;
  bothBallot: boolean;
}

function App() {
  const [hoveredState, setHoveredState] = useState<HoveredState | null>(null);
  const [lockedState, setLockedState] = useState<HoveredState | null>(null);
  const [districtYear, setDistrictYear] = useState<DistrictYear>('current');
  const [viewTab, setViewTab] = useState<ViewTab>('map');
  const [filters, setFilters] = useState<MatchFilters>({ bothVeto: false, bothBallot: false });

  // Use locked state if set, otherwise use hovered state
  const activeState = lockedState ?? hoveredState;

  const handleClickState = (state: HoveredState | null) => {
    if (state === null) {
      setLockedState(null);
    } else if (lockedState?.state.id === state.state.id) {
      // Clicking same state unlocks it
      setLockedState(null);
    } else {
      setLockedState(state);
    }
  };

  return (
    <div className="app">
      <header>
        <h1>Mutually Assured Representation</h1>
        <p className="subtitle">
          Find states with equal and opposite gerrymandering for interstate de-escalation pacts
        </p>
      </header>

      <main>
        <div className="map-container">
          <div className="map-header">
            <div className="view-toggle">
              <div className="toggle-buttons">
                <button
                  className={viewTab === 'map' ? 'active' : ''}
                  onClick={() => setViewTab('map')}
                >
                  Map
                </button>
                <button
                  className={viewTab === 'table' ? 'active' : ''}
                  onClick={() => setViewTab('table')}
                >
                  Table
                </button>
              </div>
            </div>
            <div className="year-toggle">
              <span className="year-label">District counts:</span>
              <div className="toggle-buttons">
                <button
                  className={districtYear === 'current' ? 'active' : ''}
                  onClick={() => setDistrictYear('current')}
                >
                  2020 (Current)
                </button>
                <button
                  className={districtYear === '2030' ? 'active' : ''}
                  onClick={() => setDistrictYear('2030')}
                >
                  2030 (Projected)
                </button>
              </div>
            </div>
            <div className="filter-toggle">
              <span className="filter-label">Filter matches:</span>
              <label className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={filters.bothVeto}
                  onChange={e => setFilters(f => ({ ...f, bothVeto: e.target.checked }))}
                />
                Both have governor veto
              </label>
              <label className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={filters.bothBallot}
                  onChange={e => setFilters(f => ({ ...f, bothBallot: e.target.checked }))}
                />
                Both have ballot initiative
              </label>
            </div>
          </div>
          {viewTab === 'map' ? (
            <>
              <USMap
                onHoverState={setHoveredState}
                onClickState={handleClickState}
                activeState={activeState}
                isLocked={lockedState !== null}
                lockedStateId={lockedState?.state.id ?? null}
                districtYear={districtYear}
                filters={filters}
              />
              <Legend />
            </>
          ) : (
            <StateTable
              districtYear={districtYear}
              onDistrictYearChange={setDistrictYear}
              filters={filters}
              hideHeader
              selectedStateId={activeState?.state.id ?? null}
              lockedStateId={lockedState?.state.id ?? null}
              onHoverState={(state) => setHoveredState(state ? { state, x: 0, y: 0 } : null)}
              onClickState={(state) => handleClickState(state ? { state, x: 0, y: 0 } : null)}
            />
          )}
        </div>

        <aside className="sidebar">
          <MatchPanel hoveredState={activeState} districtYear={districtYear} filters={filters} />
        </aside>
      </main>

      {hoveredState && !lockedState && viewTab === 'map' && <StateTooltip hoveredState={hoveredState} districtYear={districtYear} />}

      <footer>
        <p>
          Built by Declan Fitzsimons with Claude Code. Data from <a href="https://github.com/PlanScore/National-EG-Map/blob/main/PlanScore%20Production%20Data%20(2025)%20-%20USH%20Outcomes%20(2025).tsv" target="_blank" rel="noopener noreferrer">PlanScore</a>.
        </p>
      </footer>
    </div>
  );
}

export default App;
