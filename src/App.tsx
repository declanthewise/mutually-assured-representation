import {
  useState,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react';
import { HeroMap } from './components/HeroMap';
import {
  BipartiteMatchGraph,
  ResultsPanel,
  baselinePool,
  PACT_LINGER_MS,
  ROW_TRAVEL_MS,
} from './components/BipartiteMatchGraph';
import { useTopoData } from './map/useTopoData';
import {
  computeResidualGaps,
  computeNationalRepresentationGap,
} from './data/computeRepresentationGap';
import { computeResidualGaps2032 } from './data/plan2032';
import type { EraId } from './components/BipartiteMatchGraph';
import { MatchPair } from './types';
import { FAIR_BLACK, GAP_ORANGE } from './colors';

function pairKey(a: string, b: string): string {
  return [a, b].sort().join('-');
}

/** Single-digit counts read as words in the headline; anything larger stays a numeral. */
const SPELLED = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
] as const;

const spellCount = (n: number) => SPELLED[n] ?? String(n);

/** How long to wait for the page to reach the top before giving up on it. */
const SCROLL_HOME_MS = 2000;

/** The shared visual spacing around the instructions and results headline. */
const HEADER_TOP_GAP = 14;
const HEADER_BOTTOM_GAP = 12;

/**
 * Ride the page to the top and run `then` once it lands. Swaps that change the
 * page happen at the top, where there is nothing above to fall into the gap and
 * an arriving view can enter from its natural starting point.
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
  // Which board is on screen. The two keep separate pact lists rather than sharing
  // one, because they are not the same board: the 2032 apportionment drops Rhode
  // Island and moves fourteen delegations, so a 2026 pairing need not even exist
  // there. Keeping them apart also leaves the 2026 run intact behind the 2032 board,
  // so Retry can put the whole thing back.
  const [era, setEra] = useState<EraId>('2026');
  const [matches2026, setMatches2026] = useState<MatchPair[]>([]);
  const [matches2032, setMatches2032] = useState<MatchPair[]>([]);
  const [started, setStarted] = useState(false);
  const [starting, setStarting] = useState(false);
  const [finished, setFinished] = useState(false);
  const topoData = useTopoData();

  const selectedMatches = era === '2032' ? matches2032 : matches2026;
  const setSelectedMatches = era === '2032' ? setMatches2032 : setMatches2026;

  // Each board keeps its own gaps: the 2026 ones are a fact about enacted maps, the
  // 2032 ones only what a pact has drawn. The map, the columns and the results all
  // read whichever board is on screen.
  const residualGaps = useMemo(
    () => computeResidualGaps(matches2026),
    [matches2026],
  );

  const residualGaps2032 = useMemo(
    () => computeResidualGaps2032(matches2032),
    [matches2032],
  );

  const boardGaps = era === '2032' ? residualGaps2032 : residualGaps;

  // What the board on screen has left standing, across every state — the figure the
  // results panel measures against that board's own baseline.
  const boardNationalGap = useMemo(
    () => computeNationalRepresentationGap(boardGaps),
    [boardGaps],
  );

  // What the headline counts: the gap the board opened with, and how much of it the
  // pacts closed. Both come off whichever board is on screen — 104 against the enacted
  // maps, 182 against the maps 2032 would bring if nobody signed anything.
  const pool = baselinePool(era);
  const seatsClosed = pool - boardNationalGap;

  // What the states that signed left crooked between them — the pacted states' residual
  // gaps and nobody else's. On the 2032 board that is the honest second half of what a
  // run drew: a signatory draws its whole map, so every district its pact didn't hand
  // the minority goes to its own majority. The states nobody paired are not in it,
  // because nothing here has drawn their maps either way.
  const pactedResidualGap = useMemo(() => {
    let total = 0;
    for (const pair of selectedMatches) {
      for (const id of pair) total += Math.abs(boardGaps[id] ?? 0);
    }
    return total;
  }, [selectedMatches, boardGaps]);

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

  // The instructions are not taken away when the first pact is signed — the columns
  // climb over them. When the linger lapses the sealed pair drops to "Your Pacts" and
  // the states behind it rise a row to fill the gap; the whole board rises past the
  // paragraph on the same beat and the same curve, so what the reader follows is one
  // motion that carries on rather than a block of type disappearing on its own. The
  // paragraph doesn't move or fade: it goes under the board, the way the title goes
  // under the map.
  //
  // The wait is the graph's own `PACT_LINGER_MS`, imported rather than copied, so the
  // rise starts on the frame the pair leaves. It isn't cut under reduced motion because
  // the linger isn't either — the board holds still for it there too, and a column that
  // rose while the pair was still standing at the head of it would be answering nothing.
  const [columnsRisen, setColumnsRisen] = useState(false);

  useEffect(() => {
    if (selectedMatches.length === 0) {
      // Breaking every pact puts the paragraph back, and the columns ride back down
      // over the same 550ms — the freed states are travelling anyway, so the board is
      // in motion regardless and this is the same motion run backwards.
      setColumnsRisen(false);
      return;
    }
    if (columnsRisen) return;
    const timeoutId = setTimeout(() => setColumnsRisen(true), PACT_LINGER_MS);
    return () => clearTimeout(timeoutId);
  }, [selectedMatches, columnsRisen]);

  // How far there is to climb: the paragraph's own height plus the 12px over it, which
  // together are all the room between the map and the columns. Measured rather than
  // written down — it is two lines on a desktop and four on a phone, and it re-wraps
  // under the reader as the window changes. `.match-columns-viewport` already sits at
  // -12px, so this is the whole of that gap taken back.
  const instructionsRef = useRef<HTMLParagraphElement>(null);
  const [instructionsH, setInstructionsH] = useState(0);

  useLayoutEffect(() => {
    const el = instructionsRef.current;
    if (!el) return;
    const measure = () => setInstructionsH(el.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [started, finished]);

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
      reduced ? 0 : ROW_TRAVEL_MS,
    );

    return () => {
      clearTimeout(timeoutId);
      cancelRide();
    };
  }, [selectedMatches, finishRow]);

  // Start sits below the fold on a laptop, so ride back to the map while the opening
  // screen is still intact. Only once the viewport lands does the board replace the
  // pitch; its instructions then reveal downward from the map's foot in CSS.
  const startRideRef = useRef<(() => void) | null>(null);

  const handleStart = useCallback(() => {
    if (startRideRef.current) return;
    setStarting(true);
    startRideRef.current = rideHome(() => {
      startRideRef.current = null;
      setStarted(true);
      setStarting(false);
    });
  }, []);

  useEffect(() => () => startRideRef.current?.(), []);

  // Reset the scroll while the tall board is still intact, so the shortened results
  // page never clamps the old offset on its way in. The map is pinned on both sides
  // of the swap, so it doesn't move for this at all.
  const handleFinish = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    setFinished(true);
  }, []);

  // A board/results swap can change the document's scroll range. Keep the new
  // layout at the top before paint as well as resetting the outgoing layout.
  useLayoutEffect(() => {
    if (started) window.scrollTo({ top: 0, behavior: 'instant' });
  }, [started, finished, era]);

  // Back to the earlier board with an empty run — the map and the columns both read
  // off the match lists, so clearing them resets both.
  // Both lists are cleared whichever board Retry was pressed on: arriving at the
  // earlier board with a 2032 run still standing behind it would put pacts on a board
  // the reader never played.
  // It goes straight to that board and not to the opening screen. The pitch and Start
  // are there to explain a game nobody has played yet, and anybody pressing Retry has
  // played it and read its results: what they asked for is another go, so `started`
  // stays true and the columns are what they land on. It is the same act as Retry 2032
  // one screen over, and the same act off either results panel — the 2032 results reach
  // it as "Retry 2028".
  const handleStartOver = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    setMatches2026([]);
    setMatches2032([]);
    setEra('2026');
    setFinished(false);
    // The board being left may have risen over its instructions after its first pact.
    // Reset that in the same render, so the fresh board's instructions stand in their
    // own space rather than starting behind the still-raised columns.
    setColumnsRisen(false);
  }, []);

  // Onto the post-census board with an empty 2032 run: from the 2026 results, where it
  // is "Try 2032", and from the 2032 results, where the same thing is "Retry 2032" —
  // one handler, because opening that board and playing it again are the same act. The
  // 2026 run is left standing behind either, untouched. Reset the scroll before
  // opening the board, including when a long results roster was scrolled down.
  const handleOpen2032 = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    setMatches2032([]);
    setEra('2032');
    setFinished(false);
    // The 2026 board may have risen over its instructions after the first pact.
    // Reset that position in the same render that opens 2032, so the new
    // instructions can reveal to their full height instead of starting behind
    // the still-raised columns and dropping out only on the following effect.
    setColumnsRisen(false);
  }, []);

  return (
    <div className="app">
      <main className="app-content">
      {/* The map gives up some width once the columns arrive, and pins from that
          moment to the end of the run — over the board, and over the results roster
          that reports it. Only the opening screen scrolls it away.
          It used to come unpinned at Finish, which on a phone is a jump the page
          can't land: the browser's own toolbar is coming back on the same frame,
          no height API on the device can see how tall it is, and the map came to
          rest tucked partly behind it. Staying pinned removes the moment rather
          than trying to time it. */}
      <section className={`hero-section${started ? ' compact pinned' : ''}`}>
        <HeroMap
          topoData={topoData}
          era={era}
          selectedMatches={selectedMatches}
          residualGaps={boardGaps}
        />
      </section>

      {/* Under the map, which is where it reads best, and it yields the space to the
          columns once the user starts. */}
      {!started && (
        <header className="app-title">
          <h1>
            <span className="app-title-kicker">The Path to Peace, and Proportionality:</span>
            <span className="app-title-name">Mutually Assured Representation</span>
          </h1>
        </header>
      )}

      {/* The pitch, then the button it argues for. See Results lives under the columns. */}
      {!started && (
        <>
          <div className="app-intro">
            <p>
              Gerrymandering has pulled the United States into an arms race between red states and
              blue states. The only way to stop the escalation is to concurrently implement new
              Congressional district maps that are equally less disproportionate, one red state
              and one blue state at a time, so the margin in Congress remains unchanged.
            </p>
            <p>
              So pair up the red states and blue states into bipartisan pacts. Each pact will 
              simultaneously give the minority party in each of those two states their representation
              back. Click Start below to see how many of the{' '}
              <span className="headline-figure" style={{ color: GAP_ORANGE }}>
                {pool}
              </span>{' '}
              disproportionate districts you can undraw!
            </p>
          </div>

          <div className="action-row">
            <button className="start-btn" disabled={starting} onClick={handleStart}>
              Start
            </button>
          </div>
        </>
      )}

      {started && !finished && (
        <>
          {/* Outside the columns viewport, so it stays put while the columns rise into it —
              and, once a pact is signed, over it. It is there to get that first pact
              made, and after it the reader has done the thing it describes, so the
              board takes the space back by climbing over the paragraph rather than by
              the paragraph being whisked away. It stays in the flow and stays still;
              the viewport below is opaque and rides above it. */}
          {/* Each board says its own thing here. The 2026 paragraph teaches the game,
              because it is the first board anybody sees. Nobody reaches 2032 without
              having played 2026 and read its results, so those words would only be the
              rules read back: what that reader needs is what has changed — the
              delegations, and a reason to look at the two route marks, which are the one
              thing on a box that says a map could be redrawn over the objection of
              whoever draws it now. It is also the only place the page names the census
              the board is built on; the results panel deliberately doesn't. */}
          <div className="map-header-reveal">
            <p className="match-instructions" ref={instructionsRef}>
              {era === '2032' ? (
                <>
                  Now try with projected delegate counts after the 2030 Census and
                  reapportionment. Look for the ballot initiative or governor veto symbols
                  to make even stronger matches!
                </>
              ) : (
                <>
                  Click a state to see its best matches at the top of the opposite column, then
                  click one of those states to confirm the pact. States with equal size delegations
                  and similar, but opposite, partisanship make the best matches.
                </>
              )}
            </p>
          </div>

          {/* The climb itself: an explicit header-sized gap at rest, and the whole
              distance back to the map once the pair has parked. The distance is
              measured and the duration is the boxes' own, handed over as the same
              `--row-travel-ms` the graph sets on its svg, so the board and its rows move
              as one thing. */}
          <div
            className={`match-columns-viewport${columnsRisen ? ' risen' : ''}`}
            style={{
              marginTop: columnsRisen
                ? -(HEADER_TOP_GAP + instructionsH)
                : HEADER_BOTTOM_GAP,
              ['--row-travel-ms' as string]: `${ROW_TRAVEL_MS}ms`,
            }}
          >
            <div className="visualization-wide match-columns">
              <BipartiteMatchGraph
                era={era}
                selectedMatches={selectedMatches}
                onToggleMatch={handleToggleMatch}
                residualGaps={boardGaps}
              />
            </div>
          </div>

          {/* Nothing to report until a pact exists, so the button waits for
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
                See Results
              </button>
            </div>
          )}
        </>
      )}

      {finished && (
        <>
          {/* The run said in a sentence, up here with the pitch and the instructions
              rather than inside the panel: it is the page speaking, where everything
              below it is the board reporting itself in its own boxes. So it is set as
              they are — the page's prose, ranged left on the prose measure, wrapping
              where the width says to. It used to break by hand, a clause to a line,
              which put "stand," alone on a line of its own once the type came down to
              prose size.

              The 2032 board makes no margin claim: that clause is the 2026 board's, and
              it stopped being true here once an unclosed gap began going to the state's
              own majority — an uneven pact moves the House. What this headline says
              instead is what the run drew, both halves of it: the districts the pacts
              handed the minority, and the districts the same signatures left crooked.
              Both are the pacting states' own, since a signatory draws its whole map and
              every district its pact didn't close goes to its majority. That is why the
              second figure is `pactedResidualGap` and not the national one — the states
              nobody paired have no map here to be crooked. */}
          <div className="map-header-reveal">
            {era === '2032' ? (
              <p className="results-headline">
                Your {spellCount(selectedMatches.length)}{' '}
                {selectedMatches.length === 1 ? 'pact' : 'pacts'} created{' '}
                <span className="headline-figure" style={{ color: FAIR_BLACK }}>
                  {seatsClosed}
                </span>{' '}
                minority party districts in those states, with{' '}
                <span className="headline-figure" style={{ color: GAP_ORANGE }}>
                  {pactedResidualGap}
                </span>{' '}
                disproportionate districts leftover.
              </p>
            ) : seatsClosed > 0 ? (
              <p className="results-headline">
                Your {spellCount(selectedMatches.length)}{' '}
                {selectedMatches.length === 1 ? 'pact' : 'pacts'} returned{' '}
                <span className="headline-figure" style={{ color: FAIR_BLACK }}>
                  {seatsClosed}
                </span>{' '}
                of{' '}
                <span className="headline-figure" style={{ color: GAP_ORANGE }}>
                  {pool}
                </span>{' '}
                disproportionate districts, and the U.S. House district margin is unchanged.
              </p>
            ) : (
              <p className="results-headline">
                No seats returned yet — all{' '}
                <span className="headline-figure" style={{ color: GAP_ORANGE }}>
                  {pool}
                </span>{' '}
                disproportionate districts stand, and the U.S. House district margin is
                unchanged.
              </p>
            )}
          </div>

          {/* Retry means "this board again". On 2026 that is the opening screen, which
              is that board's own pitch; on 2032 there is no pitch to go back to, so it
              is the post-census board with an empty run — the same act as Try 2032 one
              screen earlier, and the same handler. The 2032 results also offer the
              earlier board again as Retry 2028. */}
          <div className="results-viewport">
            <div className="visualization-wide match-columns">
              <ResultsPanel
                era={era}
                selectedMatches={selectedMatches}
                residualGaps={boardGaps}
                onRetry={era === '2032' ? handleOpen2032 : handleStartOver}
                onRetry2028={era === '2032' ? handleStartOver : undefined}
                onTry2032={era === '2026' ? handleOpen2032 : undefined}
              />
            </div>
          </div>
        </>
      )}

      </main>

      <footer className="article-footer">
        <p>
          By Declan Fitzsimons. PVI℠ scores from{' '}
          <a href="https://www.cookpolitical.com/cook-pvi/2026-partisan-voting-index/district-map-and-list" target="_blank" rel="noopener noreferrer">The Cook Political Report</a>.
        </p>
      </footer>
    </div>
  );
}

export default App;
