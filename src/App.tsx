import { useState } from 'react';
import { USMap } from './components/USMap';
import { StateTooltip } from './components/StateTooltip';
import { MatchPanel } from './components/MatchPanel';
import { Legend } from './components/Legend';
import { StateTable } from './components/StateTable';
import { HoveredState } from './types';
import { DistrictYear } from './utils/findMatches';

function App() {
  const [hoveredState, setHoveredState] = useState<HoveredState | null>(null);
  const [districtYear, setDistrictYear] = useState<DistrictYear>('current');

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
            <div className="year-toggle">
              <span className="year-label">District counts:</span>
              <div className="toggle-buttons">
                <button
                  className={districtYear === 'current' ? 'active' : ''}
                  onClick={() => setDistrictYear('current')}
                >
                  Current
                </button>
                <button
                  className={districtYear === '2030' ? 'active' : ''}
                  onClick={() => setDistrictYear('2030')}
                >
                  2030 Projected
                </button>
              </div>
            </div>
          </div>
          <USMap
            onHoverState={setHoveredState}
            hoveredState={hoveredState}
          />
          <Legend />
        </div>

        <aside className="sidebar">
          <MatchPanel hoveredState={hoveredState} districtYear={districtYear} />
        </aside>
      </main>

      {hoveredState && <StateTooltip hoveredState={hoveredState} districtYear={districtYear} />}

      <section className="table-section">
        <StateTable districtYear={districtYear} onDistrictYearChange={setDistrictYear} />
      </section>

      <footer>
        <p>
          Data from <a href="https://planscore.org" target="_blank" rel="noopener noreferrer">PlanScore</a> (2024 election results).
          Efficiency gap measures wasted votes between parties.
        </p>
      </footer>
    </div>
  );
}

export default App;
