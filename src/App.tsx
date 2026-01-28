import { useState, useRef, useEffect } from 'react';
import { USMap } from './components/USMap';
import { StateTooltip } from './components/StateTooltip';
import { MatchPanel } from './components/MatchPanel';
import { StateTable } from './components/StateTable';
import { BipartiteMatchGraph } from './components/BipartiteMatchGraph';
import { HoveredState } from './types';
import { DistrictYear } from './utils/findMatches';

type ViewTab = 'map' | 'table' | 'graph';

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
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapContainerHeight, setMapContainerHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const el = mapContainerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setMapContainerHeight(entry.contentRect.height);
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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
        <div className="map-container" ref={mapContainerRef}>
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
                <button
                  className={viewTab === 'graph' ? 'active' : ''}
                  onClick={() => setViewTab('graph')}
                >
                  Matches
                </button>
              </div>
            </div>
            <div className="year-toggle">
              <span className="year-label">Apportionment:</span>
              <div className="toggle-buttons">
                <button
                  className={districtYear === 'current' ? 'active' : ''}
                  onClick={() => setDistrictYear('current')}
                >
                  2022
                </button>
                <button
                  className={districtYear === '2032' ? 'active' : ''}
                  onClick={() => setDistrictYear('2032')}
                >
                  2032
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
            <USMap
              onHoverState={setHoveredState}
              onClickState={handleClickState}
              activeState={activeState}
              isLocked={lockedState !== null}
              lockedStateId={lockedState?.state.id ?? null}
              districtYear={districtYear}
              filters={filters}
            />
          ) : viewTab === 'table' ? (
            <StateTable
              districtYear={districtYear}
              filters={filters}
              hideHeader
              selectedStateId={activeState?.state.id ?? null}
              lockedStateId={lockedState?.state.id ?? null}
              onHoverState={(state) => setHoveredState(state ? { state, x: 0, y: 0 } : null)}
              onClickState={(state) => handleClickState(state ? { state, x: 0, y: 0 } : null)}
            />
          ) : (
            <BipartiteMatchGraph
              districtYear={districtYear}
              filters={filters}
              selectedStateId={activeState?.state.id ?? null}
              lockedStateId={lockedState?.state.id ?? null}
              onHoverState={(state) => setHoveredState(state ? { state, x: 0, y: 0 } : null)}
              onClickState={(state) => handleClickState(state ? { state, x: 0, y: 0 } : null)}
            />
          )}
        </div>

        <aside className="sidebar">
          <MatchPanel hoveredState={activeState} districtYear={districtYear} filters={filters} maxHeight={mapContainerHeight} />
        </aside>
      </main>

      {hoveredState && !lockedState && viewTab === 'map' && <StateTooltip hoveredState={hoveredState} districtYear={districtYear} />}

      <footer>
        <p>
          Built by Declan Fitzsimons with Claude Code.
        </p>
      </footer>
    </div>
  );
}

export default App;
