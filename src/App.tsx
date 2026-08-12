import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
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

/**
 * Ride the page to the top and run `then` once it lands — for anything that
 * would otherwise shorten the page under a reader who is scrolled down it. Go
 * home first and the swap happens at the top, where there is nothing above to
 * fall into the gap; do it the other way round and the browser clamps the
 * scroll to whatever the shorter page allows, dropping the reader mid-page.
 *
 * There's no `scrollend` to lean on in every browser, so watch for the page to
 * land — on a deadline, because a reader who scrolls back down interrupts the
 * ride and `then` can't wait on a trip that isn't happening. Returns a cancel.
 */
function rideHome(then: () => void): () => void {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });

  const deadline = performance.now() + SCROLL_HOME_MS;
  let raf = requestAnimationFrame(function land(now) {
    if (window.scrollY > 0 && now < deadline) {
      raf = requestAnimationFrame(land);
      return;
    }
    then();
  });

  return () => cancelAnimationFrame(raf);
}

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
    let cancelRide = () => {};

    const timeoutId = setTimeout(
      () => {
        cancelRide = rideHome(() => setFinishRow(false));
      },
      // Reduced motion has the boxes arrive at once and the page jump, so the
      // whole sequence collapses to its end state.
      reduced ? 0 : BOX_TRAVEL_MS,
    );

    return () => {
      clearTimeout(timeoutId);
      cancelRide();
    };
  }, [selectedMatches, finishRow]);

  // Finish trades the columns for the results panel, which is a fraction of
  // their height, so it takes the same ride home first — otherwise the page
  // shortens under a reader standing at the button, which is as far down as the
  // page goes. Cancelled on a second click so two rides never run at once.
  const cancelFinishRide = useRef(() => {});

  const handleFinish = useCallback(() => {
    cancelFinishRide.current();
    cancelFinishRide.current = rideHome(() => setFinished(true));
  }, []);

  useEffect(() => () => cancelFinishRide.current(), []);

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
            <span className="app-title-kicker">The Path to Peace, and Proportionality:</span>
            <span className="app-title-name">Mutually Assured Representation</span>
          </h1>
        </header>
      )}

      {/* The pitch, then the button it argues for. Finish lives under the columns. */}
      {!started && (
        <>
          <div className="app-intro">
            <p>
              Gerrymandering has pulled the United States into an arms race between red states and
              blue states. State minority parties are going extinct and the House has never been
              more divided. The only way to stop the escalation is to concurrently implement new
              Congressional district maps that are equally less disproportionate, one red state
              and one blue state at a time, so the balance of power in Congress remains unchanged.
            </p>
            <p>
              So pair up the red states and blue states into bipartisan pacts. Each pact will give
              the minority party in each of those two states their representation back. States with
              similar size delegations make the best pacts. See how many disproportionate districts
              you can undraw in total!
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
            {/* A line each, so the break lands after "column," and nowhere else. */}
            <span>Click a state to see its best matches in the other column,</span>
            <span>then click one of those states to confirm the pact.</span>
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
                onClick={handleFinish}
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
          By Declan Fitzsimons. Partisan leans from{' '}
          <a href="https://www.cookpolitical.com/cook-pvi/2026-partisan-voting-index/district-map-and-list" target="_blank" rel="noopener noreferrer">The Cook Political Report</a>.
        </p>
      </footer>

      {hoveredState && <StateTooltip hoveredState={hoveredState} residualGaps={residualGaps} />}
    </div>
  );
}

export default App;
