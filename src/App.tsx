import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { HeroMap } from './components/HeroMap';
import { BipartiteMatchGraph, matchFootnote } from './components/BipartiteMatchGraph';
import { RatingsBar } from './components/RatingsBar';
import { StateTooltip } from './components/StateTooltip';
import { useTopoData } from './hooks/useTopoData';
import { computeAdjustedSafeSeats } from './utils/computeTruceAdjustment';
import { HoveredState, MatchPair } from './types';

function pairKey(a: string, b: string): string {
  return [a, b].sort().join('-');
}

function App() {
  const [hoveredState, setHoveredState] = useState<HoveredState | null>(null);
  const [selectedMatches, setSelectedMatches] = useState<MatchPair[]>([]);
  const [started, setStarted] = useState(false);
  const columnsRef = useRef<HTMLDivElement>(null);
  const topoData = useTopoData();

  const adjustedSafeSeats = useMemo(
    () => computeAdjustedSafeSeats(selectedMatches),
    [selectedMatches],
  );

  const handleToggleMatch = useCallback((pair: MatchPair) => {
    const pk = pairKey(pair[0], pair[1]);
    setSelectedMatches(prev => {
      const exists = prev.some(([a, b]) => pairKey(a, b) === pk);
      if (exists) {
        return prev.filter(([a, b]) => pairKey(a, b) !== pk);
      }
      // A state can only hold one pact — drop any it is already part of
      const filtered = prev.filter(([a, b]) =>
        a !== pair[0] && b !== pair[0] && a !== pair[1] && b !== pair[1]
      );
      return [...filtered, pair];
    });
  }, []);

  // Ride the columns' entrance animation up the page
  useEffect(() => {
    if (!started) return;
    columnsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [started]);

  return (
    <div className="app">
      <RatingsBar adjustedSafeSeats={adjustedSafeSeats} />

      <section className="hero-section">
        <HeroMap
          topoData={topoData}
          onHoverState={setHoveredState}
          selectedMatches={selectedMatches}
          adjustedSafeSeats={adjustedSafeSeats}
        />
      </section>

      <div className="action-row">
        {!started ? (
          <button className="start-btn" onClick={() => setStarted(true)}>
            Start
          </button>
        ) : (
          selectedMatches.length > 0 && (
            <button className="clear-matches-btn" onClick={() => setSelectedMatches([])}>
              Clear all pacts
            </button>
          )
        )}
      </div>

      {started && (
        <div className="match-columns-viewport" ref={columnsRef}>
          <div className="visualization-wide match-columns">
            <BipartiteMatchGraph
              selectedMatches={selectedMatches}
              onToggleMatch={handleToggleMatch}
              footnote={matchFootnote}
            />
          </div>
        </div>
      )}

      <footer className="article-footer">
        <p>
          By Declan Fitzsimons. Data: <a href="https://en.wikipedia.org/wiki/Cook_Partisan_Voting_Index" target="_blank" rel="noopener noreferrer">Cook PVI</a> for 2025 partisan leans.{' '}
          <a href="https://davesredistricting.org/" target="_blank" rel="noopener noreferrer">Dave's Redistricting App</a> for 2022 proportional districts.
        </p>
      </footer>

      {hoveredState && <StateTooltip hoveredState={hoveredState} />}
    </div>
  );
}

export default App;
