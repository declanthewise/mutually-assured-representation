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
import { computeResidualGaps2032 } from './data/plan2032';
import type { EraId } from './components/BipartiteMatchGraph';
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

  // Which board is on screen. The two keep separate pact lists rather than sharing
  // one, because they are not the same board: the 2032 apportionment drops Rhode
  // Island and moves fourteen delegations, so a 2026 pairing need not even exist
  // there. Keeping them apart also leaves the 2026 run intact behind the 2032 board,
  // which is what the stat bar and the map go on showing — neither answers to 2032,
  // since both are reading enacted maps and there are none.
  const [era, setEra] = useState<EraId>('2026');
  const [matches2026, setMatches2026] = useState<MatchPair[]>([]);
  const [matches2032, setMatches2032] = useState<MatchPair[]>([]);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const topoData = useTopoData();

  const selectedMatches = era === '2032' ? matches2032 : matches2026;
  const setSelectedMatches = era === '2032' ? setMatches2032 : setMatches2026;

  // Each board keeps its own gaps. The 2026 ones are a fact about enacted maps, so
  // the stat bar and the hero map read them whichever board is up; the 2032 ones are
  // what the columns and the results answer to while that board is the one on screen.
  const residualGaps = useMemo(
    () => computeResidualGaps(matches2026),
    [matches2026],
  );

  const residualGaps2032 = useMemo(
    () => computeResidualGaps2032(matches2032),
    [matches2032],
  );

  const boardGaps = era === '2032' ? residualGaps2032 : residualGaps;

  // What the board on screen has left standing — the figure the stat bar and the
  // results panel both measure against that board's own baseline.
  const boardNationalGap = useMemo(
    () => computeNationalRepresentationGap(boardGaps),
    [boardGaps],
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
  }, [setSelectedMatches]);

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
  // columns all read off the match lists, so clearing them resets every one of them.
  // Both are cleared whichever board Retry was pressed on: the opening screen is the
  // 2026 pitch, and arriving there with a 2032 run still standing behind it would put
  // pacts on a board the reader never played.
  const handleStartOver = useCallback(() => {
    setMatches2026([]);
    setMatches2032([]);
    setEra('2026');
    setStarted(false);
    setFinished(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Straight from the 2026 results onto the post-census board, with the 2026 run left
  // where it is behind it — the stat bar and the map go on reporting it, and Retry
  // can still put the whole thing back. No ride home is needed: the results panel is
  // already at the top, and the board it makes way for is taller than what it
  // replaces, so nothing falls out from under the reader.
  const handleTry2032 = useCallback(() => {
    setMatches2032([]);
    setEra('2032');
    setFinished(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className="app">
      <StatBar era={era} nationalRepresentationGap={boardNationalGap} />

      {/* The map gives up some width once the columns arrive, so they sit higher. */}
      <section className={`hero-section${started ? ' compact' : ''}`}>
        <HeroMap
          topoData={topoData}
          onHoverState={setHoveredState}
          era={era}
          selectedMatches={selectedMatches}
          residualGaps={boardGaps}
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
              and one blue state at a time, so the margin in Congress remains unchanged.
            </p>
            <p>
              So pair up the red states and blue states into bipartisan pacts. Each pact will give
              the minority party in each of those two states their representation back. States with
              similar size delegations make the best pacts. See how many disproportionate districts
              you can undraw!
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
                era={era}
                selectedMatches={selectedMatches}
                onToggleMatch={handleToggleMatch}
                residualGaps={boardGaps}
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
            era={era}
            selectedMatches={selectedMatches}
            nationalRepresentationGap={boardNationalGap}
            onRetry={handleStartOver}
            onTry2032={era === '2026' ? handleTry2032 : undefined}
          />
        </div>
      )}

      <footer className="article-footer">
        <p>
          By Declan Fitzsimons. Partisan leans from{' '}
          <a href="https://www.cookpolitical.com/cook-pvi/2026-partisan-voting-index/district-map-and-list" target="_blank" rel="noopener noreferrer">The Cook Political Report</a>.
        </p>
      </footer>

      {hoveredState && <StateTooltip hoveredState={hoveredState} residualGaps={boardGaps} />}
    </div>
  );
}

export default App;
