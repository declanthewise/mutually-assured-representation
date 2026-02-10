import { useState, useCallback } from 'react';
import { HeroMap } from './components/HeroMap';
import { ResultMap } from './components/ResultMap';
import { BipartiteMatchGraph } from './components/BipartiteMatchGraph';
import { RatingsBar } from './components/RatingsBar';
import { StateTooltip } from './components/StateTooltip';
import { useTopoData } from './hooks/useTopoData';
import { districtGroups } from './data/districtGroups';
import { HoveredState, MatchPair } from './types';

function pairKey(a: string, b: string): string {
  return [a, b].sort().join('-');
}

function App() {
  const [hoveredState, setHoveredState] = useState<HoveredState | null>(null);
  const [selectedMatches, setSelectedMatches] = useState<MatchPair[]>([]);
  const topoData = useTopoData();

  const handleToggleMatch = useCallback((pair: MatchPair) => {
    const pk = pairKey(pair[0], pair[1]);
    setSelectedMatches(prev => {
      const exists = prev.some(([a, b]) => pairKey(a, b) === pk);
      if (exists) {
        return prev.filter(([a, b]) => pairKey(a, b) !== pk);
      }
      return [...prev, pair];
    });
  }, []);

  return (
    <article className="article">
      <header className="article-header">
        <h1>
          <span className="headline-kicker">How to Stop Gerrymandering:</span>
          <span className="headline-title">Mutually Assured Representation</span>
        </h1>
        <p className="article-subtitle">
          An interactive guide to matching Democratic states with Republican states one pair at a time, to draw down their arms and redistrict in unison
        </p>
      </header>

      <section className="hero-section">
        {topoData && (
          <HeroMap topoData={topoData} onHoverState={setHoveredState} />
        )}
      </section>

      <section className="article-body">
        <p>
          Every ten years, state legislatures redraw congressional districts.
          In most states, the party in power draws maps that favor their own
          candidates — a practice known as <strong>gerrymandering</strong>.
        </p>
        <p>
          The result is a distorted House of Representatives where
          the party balance doesn't reflect the popular vote. Both parties
          gerrymander where they can, and neither side wants to disarm alone.
        </p>
        <p>
          But what if two states with <em>equal and opposite</em> partisan
          advantages agreed to reform together? A blue state that gains
          extra Democratic seats could pair with a red state that gains
          the same number of extra Republican seats. If both adopt
          independent redistricting commissions, neither party loses
          net seats nationally.
        </p>
        <p>
          That's the idea behind <strong>Mutually Assured Representation</strong>:
          identify matching pairs of states where de-escalation is a fair deal
          for both sides. Below, we've grouped states by size and found the
          best matches within each group.
        </p>
        <p>
          <strong>Click a state</strong> in any of the match graphs below to see
          its potential partners, then <strong>click a partner</strong> to select
          that pair. Your selections will appear on the de-escalation map at the bottom.
        </p>
      </section>

      <RatingsBar />

      {districtGroups.map(group => (
        <section key={group.key} className="match-section">
          <div className="article-text">
            <h2>{group.label} <span className="group-range">({group.range} districts)</span></h2>
            <p>{group.description}</p>
            {group.key === 'single' && (
              <p className="single-district-list">
                {group.states.map(s => s.name).join(', ')}, and Rhode Island (loses its 2nd district by 2032).
              </p>
            )}
          </div>
          {group.key !== 'single' && (
            <div className="visualization-wide">
              <BipartiteMatchGraph
                groupStates={group.states}
                selectedMatches={selectedMatches}
                onToggleMatch={handleToggleMatch}
              />
            </div>
          )}
        </section>
      ))}

      <section className="result-section">
        <div className="article-text">
          <h2>Your De-escalation Map</h2>
          <p>
            The map below shows the match pairs you've selected. Gold arcs connect
            paired states — each arc represents one potential interstate pact.
          </p>
          {selectedMatches.length > 0 && (
            <button
              className="clear-matches-btn"
              onClick={() => setSelectedMatches([])}
            >
              Clear all selections
            </button>
          )}
        </div>
        <div className="visualization-full">
          {topoData && (
            <ResultMap topoData={topoData} selectedMatches={selectedMatches} />
          )}
        </div>
      </section>

      <footer className="article-footer">
        <p>
          Data: <a href="https://en.wikipedia.org/wiki/Cook_Partisan_Voting_Index" target="_blank" rel="noopener noreferrer">Cook PVI</a> for partisan lean.{' '}
          2032 district projections from{' '}
          <a href="https://www.brennancenter.org/our-work/analysis-opinion/big-changes-ahead-voting-maps-after-next-census" target="_blank" rel="noopener noreferrer">Brennan Center</a>{' '}
          using Census Bureau Vintage 2025 estimates.{' '}
          Matching criteria: opposite partisan lean (within 5%), similar district count (within 30%).
        </p>
        <p>
          Built by Declan Fitzsimons.
        </p>
      </footer>

      {hoveredState && <StateTooltip hoveredState={hoveredState} />}
    </article>
  );
}

export default App;
