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

/**
 * How much of the graph's own air above its first row (`TOP_PAD`, 24px) the columns
 * claw back, so the instructions don't sit in a band twice as deep as the one over
 * them. It used to be half of it, which left 12px under the paragraph against the 12px
 * over it — even, but four short of what the results headline leaves under itself
 * before its first box. The two screens swap one for the other, so they now agree at
 * 16, and the paragraph's band is the wider below than above by exactly that.
 */
const CLAW_BACK = 8;

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
  // Which board is on screen. The two keep separate pact lists rather than sharing
  // one, because they are not the same board: the 2032 apportionment drops Rhode
  // Island and moves fourteen delegations, so a 2026 pairing need not even exist
  // there. Keeping them apart also leaves the 2026 run intact behind the 2032 board,
  // so Retry can put the whole thing back.
  const [era, setEra] = useState<EraId>('2026');
  const [matches2026, setMatches2026] = useState<MatchPair[]>([]);
  const [matches2032, setMatches2032] = useState<MatchPair[]>([]);
  const [started, setStarted] = useState(false);
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

  // Start swaps the pitch for the columns, and the reader is usually standing at the
  // button when they press it — Start sits below the fold on a laptop, so reaching it
  // means scrolling there. The board has to arrive with its head *under* the map
  // rather than behind it: the map is pinned, so from down the page the instructions
  // and the first row of boxes land in the band the map is covering.
  //
  // So the page goes home, instantly and in the same frame as the swap. Nothing on
  // screen moves for a smooth ride to show: the map is pinned and doesn't shift, and
  // everything below it is being replaced this frame anyway. Finish now does the same
  // thing for the same reason. `rideHome` is left for the one case that isn't a swap:
  // the page getting *shorter* on its own under a reader standing at the bottom of it,
  // which is what breaking the last pact does to the Finish button.
  const handleStart = useCallback(() => {
    window.scrollTo(0, 0);
    setStarted(true);
  }, []);

  // Finish trades the columns for the results panel, and the reader is standing at the
  // button when they press it, that being as far down as the page goes. So the page
  // goes home instantly and in the same frame as the swap, exactly as Start does and
  // for the same reason: the scroll happens first, so there is no taller page left to
  // fall out from under anybody, and the headline is already at the head of the page
  // when the reader arrives rather than dropping in once the page has stopped moving.
  //
  // It used to ride home smoothly and swap on landing (`rideHome`, still used above).
  // What that rode through was the board the reader has just finished with, and it put
  // the panel's arrival a frame after the journey rather than at the end of it.
  const handleFinish = useCallback(() => {
    window.scrollTo(0, 0);
    setFinished(true);
  }, []);

  // Back to the opening screen with an empty board — the map and the columns both
  // read off the match lists, so clearing them resets both.
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

  // Onto the post-census board with an empty 2032 run: from the 2026 results, where it
  // is "Try 2032", and from the 2032 results, where the same thing is "Retry 2032" —
  // one handler, because opening that board and playing it again are the same act. The
  // 2026 run is left standing behind either, untouched. No ride home is needed: the
  // results panel is already at the top, and the board it makes way for is taller than
  // what it replaces, so nothing falls out from under the reader.
  const handleOpen2032 = useCallback(() => {
    setMatches2032([]);
    setEra('2032');
    setFinished(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className="app">
      {/* Sticky to the top of the viewport, so the clouds stay in view while the
          columns are scrolled — see `.hero-section` in `App.css`. The map gives up
          some width once the columns arrive, so they sit higher. */}
      <section className={`hero-section${started ? ' compact' : ''}`}>
        <HeroMap
          topoData={topoData}
          era={era}
          selectedMatches={selectedMatches}
          residualGaps={boardGaps}
        />
      </section>

      {/* Under the map, which is where it reads best, and it yields the space to the
          columns once the user starts. The map being sticky means the title passes
          behind it on the way up — see the page layout note in `CLAUDE.md`. */}
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
              blue states. The only way to stop the escalation is to concurrently implement new
              Congressional district maps that are equally less disproportionate, one red state
              and one blue state at a time, so the margin in Congress remains unchanged.
            </p>
            <p>
              So pair up the red states and blue states into bipartisan pacts. Each pact will give
              the minority party in each of those two states their representation back. States with
              similar size delegations make the best pacts. Click Start below to see how many of
              the{' '}
              <span className="headline-figure" style={{ color: GAP_ORANGE }}>
                {pool}
              </span>{' '}
              disproportionate districts you can undraw!
            </p>
          </div>

          <div className="action-row">
            <button className="start-btn" onClick={handleStart}>
              Start
            </button>
          </div>
        </>
      )}

      {started && !finished && (
        <>
          {/* Outside the viewport, so it stays put while the columns rise into it —
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
                click one of those states to confirm the pact. States of similar delegate counts,
                with equal and opposite partisanship, make the best matches.
              </>
            )}
          </p>

          {/* The climb itself: the viewport's own -12px claw-back at rest, and the whole
              gap between map and columns once the pair has parked. The distance is
              measured and the duration is the boxes' own, handed over as the same
              `--row-travel-ms` the graph sets on its svg, so the board and its rows move
              as one thing. */}
          <div
            className={`match-columns-viewport${columnsRisen ? ' risen' : ''}`}
            style={{
              marginTop: columnsRisen ? -(12 + instructionsH) : -CLAW_BACK,
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

          {/* Retry means "this board again". On 2026 that is the opening screen, which
              is that board's own pitch; on 2032 there is no pitch to go back to, so it
              is the post-census board with an empty run — the same act as Try 2032 one
              screen earlier, and the same handler. */}
          <div className="visualization-wide match-columns">
            <ResultsPanel
              era={era}
              selectedMatches={selectedMatches}
              residualGaps={boardGaps}
              onRetry={era === '2032' ? handleOpen2032 : handleStartOver}
              onTry2032={era === '2026' ? handleOpen2032 : undefined}
            />
          </div>
        </>
      )}

      <footer className="article-footer">
        <p>
          By Declan Fitzsimons. Partisan leans from{' '}
          <a href="https://www.cookpolitical.com/cook-pvi/2026-partisan-voting-index/district-map-and-list" target="_blank" rel="noopener noreferrer">The Cook Political Report</a>.
        </p>
      </footer>
    </div>
  );
}

export default App;
