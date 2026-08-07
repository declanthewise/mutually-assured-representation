import { useState, useCallback, useEffect, useMemo } from 'react';
import { HeroMap } from './components/HeroMap';
import { BipartiteMatchGraph } from './components/BipartiteMatchGraph';
import { ResultsPanel } from './components/ResultsPanel';
import { StatBar } from './components/StatBar';
import { StateTooltip } from './components/StateTooltip';
import { useTopoData } from './map/useTopoData';
import {
  computeResidualGaps,
  computeNationalRepresentationGap,
} from './data/computeRepresentationGap';
import { HoveredState, MatchPair } from './types';

function pairKey(a: string, b: string): string {
  return [a, b].sort().join('-');
}

/** How long to wait for the page to reach the top before giving up on it. */
const SCROLL_HOME_MS = 2000;

/**
 * How long a box takes to reach its new row: the transition on
 * `.bipartite-graph .state-box` in `App.css`. Keep the two in step.
 */
const BOX_TRAVEL_MS = 550;

function App() {
  const [hoveredState, setHoveredState] = useState<HoveredState | null>(null);
  const [selectedMatches, setSelectedMatches] = useState<MatchPair[]>([]);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const topoData = useTopoData();

  const residualGaps = useMemo(
    () => computeResidualGaps(selectedMatches),
    [selectedMatches],
  );

  const nationalRepresentationGap = useMemo(
    () => computeNationalRepresentationGap(residualGaps),
    [residualGaps],
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

  // The Finish button hangs below the columns, so losing it while the page is
  // scrolled down to it takes a strip of the page away from under the reader and
  // everything above drops into the space. Breaking the last pact is three things
  // in a row instead: the two freed states float back up their columns, then the
  // page rides home after them, and only then does the button go. Each waits for
  // the one before, so there's never more than one thing to follow.
  const [finishRow, setFinishRow] = useState(false);

  useEffect(() => {
    if (selectedMatches.length > 0) {
      setFinishRow(true);
      return;
    }
    if (!finishRow) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;

    const timeoutId = setTimeout(
      () => {
        window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });

        // No `scrollend` to lean on in every browser, so watch for the page to
        // land — on a deadline, because a reader who scrolls back down interrupts
        // the ride and the button can't wait on a trip that isn't happening.
        const deadline = performance.now() + SCROLL_HOME_MS;
        raf = requestAnimationFrame(function land(now) {
          if (window.scrollY > 0 && now < deadline) {
            raf = requestAnimationFrame(land);
            return;
          }
          setFinishRow(false);
        });
      },
      // Reduced motion has the boxes arrive at once and the page jump, so the
      // whole sequence collapses to its end state.
      reduced ? 0 : BOX_TRAVEL_MS,
    );

    return () => {
      clearTimeout(timeoutId);
      cancelAnimationFrame(raf);
    };
  }, [selectedMatches, finishRow]);

  // Back to the opening screen with an empty board — the map, the stat bar and the
  // columns all read off selectedMatches, so clearing it resets every one of them.
  const handleStartOver = useCallback(() => {
    setSelectedMatches([]);
    setStarted(false);
    setFinished(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className="app">
      <StatBar nationalRepresentationGap={nationalRepresentationGap} />

      {/* The map gives up some width once the columns arrive, so they sit higher. */}
      <section className={`hero-section${started ? ' compact' : ''}`}>
        <HeroMap
          topoData={topoData}
          onHoverState={setHoveredState}
          selectedMatches={selectedMatches}
          residualGaps={residualGaps}
        />
      </section>

      {/* The title yields the space to the columns once the user starts. */}
      {!started && (
        <header className="app-title">
          <h1>
            <span className="app-title-kicker">The Path to Proportionality:</span>
            <span className="app-title-name">Mutually Assured Representation</span>
          </h1>
        </header>
      )}

      {/* The pitch, then the button it argues for. Finish lives under the columns. */}
      {!started && (
        <>
          <div className="app-intro">
            <p>
              Gerrymandering has turned the United States into an arms race of red states and
              blue states. State minority parties are going extinct. The House won't vote
              themselves out of their own districts. It is up to the states to solve this.
            </p>
            <p>
              So pair them off. A state gerrymandered for the Democrats signs a pact with one
              gerrymandered for the Republicans, and each undraws the same number of seats. The
              trade is even by construction, so the House balance doesn't change. The only casualty
              is gerrymandering.
            </p>
          </div>

          <div className="action-row">
            <button className="start-btn" onClick={() => setStarted(true)}>
              Start
            </button>
          </div>
        </>
      )}

      {started && !finished && (
        <>
          {/* Outside the viewport, so it stays put while the columns rise into it. */}
          <p className="match-instructions">
            {/* Each clause holds together, so the one line the phone breaks it into
                breaks after "column," and nowhere else. */}
            <span>Click a state to see its best matches in the other column,</span>{' '}
            <span>then click one of those states to confirm a pact.</span>
          </p>

          <div className="match-columns-viewport">
            <div className="visualization-wide match-columns">
              <BipartiteMatchGraph
                selectedMatches={selectedMatches}
                onToggleMatch={handleToggleMatch}
                residualGaps={residualGaps}
              />
            </div>
          </div>

          {/* Nothing to finish with until a pact exists, so the button waits for
              one — and outlives the last one by the length of the ride home. */}
          {finishRow && (
            <div className="finish-row">
              <button
                className="finish-btn"
                // Inert on the way out, so the results are never reached with an
                // empty board during those few hundred milliseconds.
                disabled={selectedMatches.length === 0}
                onClick={() => setFinished(true)}
              >
                Finish
              </button>
            </div>
          )}
        </>
      )}

      {finished && (
        <div className="visualization-wide results-wide match-columns">
          <ResultsPanel
            selectedMatches={selectedMatches}
            nationalRepresentationGap={nationalRepresentationGap}
            onRetry={handleStartOver}
          />
        </div>
      )}

      <footer className="article-footer">
        <p>
          By Declan Fitzsimons. Data: 2026 district and 2025 state partisan leans come from{' '}
          <a href="https://www.cookpolitical.com/cook-pvi/2026-partisan-voting-index/district-map-and-list" target="_blank" rel="noopener noreferrer">The Cook Political Report</a>.
        </p>
      </footer>

      {hoveredState && <StateTooltip hoveredState={hoveredState} residualGaps={residualGaps} />}
    </div>
  );
}

export default App;
