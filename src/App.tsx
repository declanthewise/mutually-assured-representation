import { useState } from 'react';
import { USMap } from './components/USMap';
import { StateTooltip } from './components/StateTooltip';
import { MatchPanel } from './components/MatchPanel';
import { Legend } from './components/Legend';
import { HoveredState } from './types';

function App() {
  const [hoveredState, setHoveredState] = useState<HoveredState | null>(null);

  return (
    <div className="app">
      <header>
        <h1>Gerrymandering Ceasefire</h1>
        <p className="subtitle">
          Find states with equal and opposite gerrymandering for interstate de-escalation pacts
        </p>
      </header>

      <main>
        <div className="map-container">
          <USMap
            onHoverState={setHoveredState}
            hoveredState={hoveredState}
          />
          <Legend />
        </div>

        <aside className="sidebar">
          <MatchPanel hoveredState={hoveredState} />
        </aside>
      </main>

      {hoveredState && <StateTooltip hoveredState={hoveredState} />}

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
