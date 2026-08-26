import { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { BranchControl, StateData, MatchPair } from '../types';
import { EVEN_GRAY, FAIR_BLACK, GAP_ORANGE, LEAN_DOMAIN, LEAN_RANGE, PARTY_COLORS } from '../colors';
import { baselineGaps, fairSplit } from '../data/computeRepresentationGap';
import {
  gapSize2032Of,
  isDemocraticSide2032,
  matchable2032States,
  minorityFair2032,
} from '../data/plan2032';
import { holdsDemocraticBranches, stateData } from '../data/stateData';
import { AnimatedCount, COUNT_DURATION_MS } from './AnimatedCount';

/** Single-district states have no map to draw, so they never enter a pact. */
export const matchableStates = stateData.filter(s => s.districts2022 >= 2);

export type EraId = '2026' | '2032';

/**
 * The two boards this graph can draw. Everything below the era — the columns, the
 * parked pacts, the swell, the scroll-following, the hover arbitration — is the same
 * board furniture either way, so the era supplies only the four questions the
 * furniture asks about a state, and the box body reads the era to know which rows it
 * owes.
 *
 * Both boards carry a representation gap, and both measure it the same way against
 * an enacted map. They differ only in which map: today's in 2026, and in 2032 today's
 * carried to the projected delegation at the same rate. See plan2032.ts.
 */
interface Era {
  states: StateData[];
  /** Districts the state's delegation holds on this board. */
  districtsOf: (s: StateData) => number;
  /** Which column: D-drawn (2026) or D-leaning (2032) on the left. */
  isDemocraticSide: (s: StateData) => boolean;
  /** The box's top row — minority districts the fair map gives. */
  minorityFairOf: (s: StateData) => number;
  /** Magnitude of the state's gerrymander — the weight it carries into a pact. */
  gapSizeOf: (s: StateData) => number;
}

const ERAS: Record<EraId, Era> = {
  '2026': {
    states: matchableStates,
    districtsOf: s => s.districts2022,
    isDemocraticSide,
    minorityFairOf: minorityProportionalOf,
    gapSizeOf,
  },
  '2032': {
    states: matchable2032States,
    districtsOf: s => s.districts2032,
    isDemocraticSide: isDemocraticSide2032,
    minorityFairOf: minorityFair2032,
    gapSizeOf: gapSize2032Of,
  },
};

interface BipartiteMatchGraphProps {
  era: EraId;
  selectedMatches: MatchPair[];
  onToggleMatch: (pair: MatchPair) => void;
  /** What each state's gap comes to once the pacts are honored, on the board shown. */
  residualGaps: Record<string, number>;
}

const leanColorScale = d3.scaleLinear<string>()
  .domain(LEAN_DOMAIN)
  .range(LEAN_RANGE)
  .clamp(true);

const BOX_W = 140;
const BOX_H = 60;
const ROW_GAP = 6;
const ROW_H = BOX_H + ROW_GAP;
const HEADER_HEIGHT = 19;

/** Source Sans 3 caps fill 0.66em — the figure every cap measure here is taken at. */
const CAP_RATIO = 0.66;

/**
 * The header line: the state name, the district count trailing it, the control
 * pyramid and the lean badge, all standing on one midline.
 *
 * The name is placed by its alphabetic baseline rather than by
 * `dominant-baseline`, because the name and the count are two runs of different
 * sizes that have to share a baseline. `central` centers each run on its own em
 * box, which leaves the smaller count's baseline about a third of a unit above
 * the name's — it resets the baseline table's font size along with the baseline.
 * SVG 1.1 spares a `dominant-baseline: auto` tspan that, by having it keep the
 * parent's baseline table *and* font size, and Chrome obliges; WebKit resolves
 * `auto` to `alphabetic` and drops the count a whole baseline instead. So neither
 * reading of the shorthand is any use, and the baseline is stated outright.
 */
const HEADER_MID_Y = 10;
const NAME_SIZE = 9.5;
const NAME_BASELINE_Y = HEADER_MID_Y + (NAME_SIZE * CAP_RATIO) / 2;

/** Baselines of the three equation rows, and the rule above the total. */
const EQ_ROW_Y = [29, 40, 52];
const EQ_RULE_Y = 46;

/**
 * The three row labels, which read as one column and so share a size. The cap is
 * the longest label against the widest count: "Minority Districts (Proportional)"
 * runs ~0.41 units per character per unit of font size, and a two-digit count
 * ("13D") leaves it about 108 units of the row. That puts the ceiling near 8.3.
 *
 * "(Fair)" replaced "(Proportional)" and gave eight characters back. The three that
 * remain — "(Fair)", "(2026)" and the 2032 board's "(Pact)" — are all within a
 * character of each other, so the row that sets the budget is whichever carries the
 * widest count.
 */
const EQ_LABEL_SIZE = 8;



/**
 * The control pyramid: the governor as the apex, the two chambers as the course
 * beneath. A state signs a pact only when the whole pyramid is one color, so a
 * two-tone pyramid is a state that can't act alone, and which piece is off-color
 * says which branch is the holdout.
 *
 * It shares the header row with the state name, so the long names set the width
 * budget. "New Hampshire (2)" is the tightest: at 11 wide the pyramid clears the
 * end of that name by about 10 units. Re-measure if the name font or the badge
 * grows — the pyramid is what gives first.
 */
const PYRAMID_W = 11;
const PYRAMID_H = 10;
const PYRAMID_GAP = 3.5;
/** Height of the apex course, as a fraction of the whole. */
const PYRAMID_APEX = 0.44;
/** Mortar between the courses, and between the two chambers. */
const PYRAMID_MORTAR = 0.9;

const LEFT_BOX_X = 12;
const COL_GAP = 28;
const RIGHT_BOX_X = LEFT_BOX_X + BOX_W + COL_GAP;
const VIEW_W = RIGHT_BOX_X + BOX_W + LEFT_BOX_X;

/** The break-pact button, centered in the gutter the links cross. */
const LINK_MID_X = LEFT_BOX_X + BOX_W + COL_GAP / 2;
const REMOVE_R = 8;
const REMOVE_TICK = 3;

/**
 * Air around a section heading: 24px, in a viewBox that renders at
 * `max-width: 420px`, so the px figure converts at that scale. "Your Pacts"
 * takes two of them above it — with no rule to break the run, the gap itself is
 * what tells the parked block from the flowing rows, so it has to be plainly
 * wider than the one between two rows.
 */
const UNITS_PER_PX = VIEW_W / 420;
const SECTION_PAD = 24 * UNITS_PER_PX;

/**
 * Air above the first row. The columns are headed by the instructions in
 * `App.tsx`, which are HTML and keep their own spacing; this is only the gap
 * between them and the boxes.
 */
const TOP_PAD = SECTION_PAD;
const BOTTOM_PAD = 14;

/** Air kept around the active box when the view follows it, in CSS px. */
const SCROLL_MARGIN = 12;

/**
 * How long the gap row takes to swell out over its box, and later to fold back.
 * Unhurried on purpose: at this size it reads as the row growing into the space
 * it's being given, where a quicker one read as a jump to another layout.
 */
const SWELL_MS = 400;

/**
 * How long a count runs while a pact is being sealed: half the pace of an ordinary
 * one. A gap of two or three seats is only that many digits, and at the usual speed
 * they'd be gone before the eye settled on them.
 *
 * **Both boards run at this pace**, though only 2026 swells. On that board it is the
 * figure the row grew to show; on 2032 the row stays put and the same pace carries two
 * counts in sequence. A count means the same thing on either board, so it should take
 * the same time to say it — the ordinary pace read as a flicker there, with nothing
 * growing to explain why the number had moved.
 */
const SEAL_COUNT_MS = COUNT_DURATION_MS * 2;

/**
 * A beat after the count lands, before the box gives up its place. The figure it
 * settled on is the one to take away, and without this the row starts shrinking on
 * the same frame it arrives at — read as part of the fall rather than as the number
 * the fall was for. The 2032 board keeps it for the same reason, to let the pair of
 * figures be read before the boxes go.
 */
const SEAL_HOLD_MS = 300;

/**
 * One row's turn in the spotlight: rise, count, beat, fold. Every swell on either
 * board is one of these, and a row's place in the sequence is just an offset into it.
 */
const SWELL_CYCLE_MS = SWELL_MS + SEAL_COUNT_MS + SEAL_HOLD_MS + SWELL_MS;

/**
 * How long a sealed 2026 pact holds its place before taking its seat under "Your
 * Pacts": the gap row swells to fill the box, its count runs down at that size,
 * stands there a beat, and folds back. The boxes leave the moment the row is
 * home. The seats coming back are the point of the click, so they're spelled out
 * on the two boxes the user is already looking at, at a size that can't be
 * missed, before either box moves an inch.
 */
const PACT_LINGER_MS = SWELL_CYCLE_MS;

/**
 * The 2032 board's linger: **two full swells, one after the other**. The pact row
 * rears up and counts to what was traded, folds away, and then the gap row does the
 * same with what that left behind. Read in that order they are cause and consequence,
 * which is the sentence the box is making.
 *
 * They cannot overlap, and that is a geometric fact rather than a preference: both
 * rows swell toward `SWELL_ROW_Y`, the middle of the box, so a fold running into the
 * next rise would put two magnified rows on the same line. Each waits for the last to
 * be fully home.
 *
 * It comes to 3800ms, which is a long time to hold a board still — twice the 2026
 * linger, because there are two figures to show rather than one to change.
 */
const SEQUENCE_LINGER_MS = SWELL_CYCLE_MS * 2;

/** How long a sealed pact holds the board still, per board. */
const LINGER_MS: Record<EraId, number> = {
  '2026': PACT_LINGER_MS,
  '2032': SEQUENCE_LINGER_MS,
};

/**
 * The gap row at full swell, centered in everything the header line leaves — the
 * name and its badge keep the strip above, and the row takes the rest. It stays
 * the row it was: label left, count right, both on one center line, each keeping
 * the edge it's anchored to. So it grows in place rather than rearranging itself
 * on the way out and back.
 *
 * Source Sans 3 caps fill 0.66em, so the count's ink runs 30–49 there, about
 * eleven units clear top and bottom. Width is what's tight: "Representation Gap"
 * runs ~0.41 units per character per unit of font size, reaching x≈87 at 11, and
 * a two-digit count at 28 comes back to about x=106. Whichever grows, that's the
 * gap to keep.
 */
const GAP_COUNT_SIZE = 9.5;
const SWELL_LABEL_SIZE = 11;
const SWELL_COUNT_SIZE = 28;
const SWELL_ROW_Y = (HEADER_HEIGHT + BOX_H) / 2;

/**
 * The 2032 pact row at full swell. Its label grows like the gap row's, but not as far,
 * and the party letter is what pays for it.
 *
 * "Minority Districts (Pact)" is much longer than "Representation Gap" — 106 units
 * against 91 at a size of 11 — so it simply cannot be set at 11 in this box: the label
 * alone would end at x=112, leaving a two-digit count 8.3 units to live in, smaller
 * than the 9 it rests at. The gap row's 11 is not available here at any count size.
 *
 * 10 is, and only because the count sheds its "R"/"D" on the way up. The letter costs
 * 0.63 units per unit of font size, which at 21 is thirteen units of row — with it,
 * a label at 10 and a count at 21 overlap by 3; without it they clear by 10. Held to
 * `PARTY_FADE_SWELL` the letter is gone before that bites, and at the moment it goes
 * the pair still clear by 8.4, which is exactly the margin the gap row lives on.
 *
 * Losing it costs nothing that isn't said elsewhere: the row rests as "14R", the fair
 * row above it names the same party, and the box's border and badge are that party's
 * colour. What it buys is the two swells reading alike — a caption growing over a bare
 * figure — which is the whole point of matching them.
 */
const PACT_SWELL_LABEL_SIZE = 10;
const PACT_SWELL_COUNT_SIZE = 21;

/**
 * How far into the pact row's swell its party letter has gone entirely.
 *
 * It shrinks rather than merely fading, so the number slides right into full alignment
 * as it goes instead of leaving a thirteen-unit hole against the row's right edge. The
 * slide happens inside the first third of the rise, while the whole row is growing
 * anyway, so it reads as the row consolidating onto one figure.
 */
const PARTY_FADE_SWELL = 0.7;

/**
 * The "Your Pacts" heading. Spacing is measured to the top of its ink, not its
 * em box — Source Sans 3 caps fill 0.66em, and the ~3.5 units of slack above
 * them would otherwise read as extra air over the heading.
 */
const PACT_LABEL_SIZE = 9;
const PACT_LABEL_CAP = PACT_LABEL_SIZE * CAP_RATIO;
const PACT_LABEL_GAP = 14;

/** Room above the parked block: that heading and the air it stands in. */
const PACT_HEADER_H = SECTION_PAD * 2 + PACT_LABEL_CAP + PACT_LABEL_GAP - ROW_GAP;

type Column = 'left' | 'right';

/** The board as it stood when a pact was sealed, held while the counts run. */
interface Seal {
  /** The state the columns were ranked around, so they don't re-rank mid-count. */
  anchorId: string | null;
  /** The pacts parked at the time — the new one isn't among them yet. */
  matches: MatchPair[];
  /** The pair just sealed: the two boxes whose gaps are running down. */
  pair: MatchPair;
}

const BRANCH_COLORS: Record<BranchControl, string> = {
  dem: PARTY_COLORS.D,
  rep: PARTY_COLORS.R,
  // Nobody's to command — the same gray an EVEN district gets, for the same reason.
  split: EVEN_GRAY,
};

const BRANCH_LABELS: Record<BranchControl, string> = {
  dem: 'D',
  rep: 'R',
  split: 'no majority',
};

/**
 * The control pyramid for one state, drawn from its apex at the top-center of a
 * PYRAMID_W × PYRAMID_H box. A slice at height y is as wide as the triangle is
 * there, which is what keeps the courses reading as one pyramid rather than as
 * stacked bars. The chambers always sit senate-left, house-right, so the same
 * branch is in the same place on every box.
 *
 * Every state gets one, and every one stands the same way up. The mark says who
 * holds each branch and nothing else — it used to invert where the governor has
 * no veto over the congressional map, which asked one small shape to carry two
 * unrelated facts. `governorCanVeto` is still in the data; nothing draws it.
 */
function ControlPyramid({ state }: { state: StateData }) {
  const mid = PYRAMID_W / 2;
  const halfWidthAt = (y: number) => (y / PYRAMID_H) * mid;

  const apexY = PYRAMID_H * PYRAMID_APEX;
  const courseY = apexY + PYRAMID_MORTAR;
  const apexHalf = halfWidthAt(apexY);
  const courseHalf = halfWidthAt(courseY);
  const seam = PYRAMID_MORTAR / 2;

  const piece = (branch: BranchControl, points: string, label: string) => (
    <polygon points={points} fill={BRANCH_COLORS[branch]}>
      <title>{`${label}: ${BRANCH_LABELS[branch]}`}</title>
    </polygon>
  );

  return (
    <>
      {piece(
        state.governorParty,
        `${mid},0 ${mid + apexHalf},${apexY} ${mid - apexHalf},${apexY}`,
        'Governor',
      )}

      {state.houseParty === null ? (
        // Nebraska: one chamber, so the course runs the full width of the base.
        piece(
          state.senateParty,
          `${mid - courseHalf},${courseY} ${mid + courseHalf},${courseY} ` +
            `${PYRAMID_W},${PYRAMID_H} 0,${PYRAMID_H}`,
          'Legislature',
        )
      ) : (
        <>
          {piece(
            state.senateParty,
            `${mid - courseHalf},${courseY} ${mid - seam},${courseY} ` +
              `${mid - seam},${PYRAMID_H} 0,${PYRAMID_H}`,
            'Senate',
          )}
          {piece(
            state.houseParty,
            `${mid + seam},${courseY} ${mid + courseHalf},${courseY} ` +
              `${PYRAMID_W},${PYRAMID_H} ${mid + seam},${PYRAMID_H}`,
            'House',
          )}
        </>
      )}
    </>
  );
}

/** Ease-out: quick off the mark, easing into place. */
const easeOut = (t: number) => 1 - (1 - t) ** 3;

/** How far the gap row has taken over its box: 0 at rest, 1 filling it. */
function swellAt(ms: number): number {
  if (ms <= 0) return 0;
  if (ms < SWELL_MS) return easeOut(ms / SWELL_MS);

  const folding = ms - (SWELL_MS + SEAL_COUNT_MS + SEAL_HOLD_MS);
  if (folding <= 0) return 1;
  return folding >= SWELL_MS ? 0 : 1 - easeOut(folding / SWELL_MS);
}

/**
 * The clock a settling box runs on, in milliseconds since the pact was sealed.
 *
 * Rows read their own swell off it at their own offset, which is what lets the 2032
 * board run two of them back to back from one timer. It drives geometry rather than a
 * CSS animation because a row's two halves grow on different curves — the label a
 * caption, the count filling what's left — and because each count has to be held back
 * until there is room for it to run in.
 */
function useSettleElapsed(settling: boolean, totalMs: number): number {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!settling) {
      setElapsed(0);
      return;
    }
    const start = performance.now();
    let raf = requestAnimationFrame(function tick(now) {
      const t = now - start;
      setElapsed(t);
      if (t < totalMs) raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, [settling, totalMs]);

  return settling ? elapsed : 0;
}

interface BoxBodyProps {
  /** Names the middle row's map — the enacted 2026 one, or the one 2032 would bring. */
  eraId: EraId;
  /** The party whose squeezed districts both counts are in. */
  minorityParty: 'D' | 'R';
  proportional: number;
  current: number;
  /** Signed, so zero can be told from a gap that only narrowed. */
  gap: number;
  isMatched: boolean;
  settling: boolean;
}

/**
 * Everything below the header line: where the state's own PVI says its minority
 * districts should sit, where they actually do, and the gap between them — read top
 * to bottom.
 *
 * **A pact plays out differently on the two boards**, because they are answering
 * different questions. The 2026 box already holds all three figures, so what a pact
 * changes is the gap: that row swells to fill the box, the subtraction above it fades
 * out of the way, and the count runs *down* to whatever survives. One figure changes,
 * so it is magnified to be watched.
 *
 * The 2032 box has nothing to change — its lower two rows start blank, since there is
 * no 2032 map until a pact draws one — so it has two figures to fill instead. They run
 * **in sequence and at rest**: the pact row counts up to what was traded, then the gap
 * row counts up to what that left behind. Read in that order they are cause and
 * consequence, which is the sentence the box is making. Neither needs magnifying,
 * because neither is displacing a figure already on screen.
 *
 * A blank rather than a zero, on both of those rows. Zero is a measurement, and before
 * a pact there is nothing measured; a column of `0R` down an untouched board would
 * read as forty-three states that had been looked at and found empty.
 *
 * The animation lives in here rather than in the parent so that a frame of it
 * re-renders two boxes instead of forty-four.
 */
function BoxBody({
  eraId,
  minorityParty,
  proportional,
  current,
  gap,
  isMatched,
  settling,
}: BoxBodyProps) {
  const is2032 = eraId === '2032';
  const elapsed = useSettleElapsed(settling, LINGER_MS[eraId]);

  // Reduced motion keeps the beat and drops the swell: the counts still wait their
  // turn and still run, they just don't rear up to be looked at.
  const reduced =
    settling && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** How far the row starting at `offset` into the sequence has taken the box over. */
  const swellOf = (offset: number) =>
    settling && !reduced ? swellAt(elapsed - offset) : 0;

  // 2026 changes one figure, so only the gap row rears up and it goes first. 2032
  // fills two, so the pact row takes its turn and the gap row follows a whole cycle
  // later — they share a centre line and cannot be up at once.
  const gapOffset = is2032 ? SWELL_CYCLE_MS : 0;
  const midSize = is2032 ? swellOf(0) : 0;
  const gapSize = swellOf(gapOffset);

  const atMid = (rest: number, full: number) => rest + (full - rest) * midSize;
  const atGap = (rest: number, full: number) => rest + (full - rest) * gapSize;

  // Each count waits for its own row to finish rising. On 2026 both run together,
  // since the middle row is only restating what the gap row is already showing.
  const duration = settling ? SEAL_COUNT_MS : COUNT_DURATION_MS;
  const midDelay = settling ? SWELL_MS : 0;
  const gapDelay = settling ? gapOffset + SWELL_MS : 0;

  // A row gets out of the way of whichever *other* row is up.
  const fadeFor = (swell: number) => 1 - swell;

  // How much of the pact count's party letter is left. Gone by PARTY_FADE_SWELL, which
  // is what lets that row's label grow at all — see PACT_SWELL_LABEL_SIZE.
  const partyLetter = Math.max(0, 1 - midSize / PARTY_FADE_SWELL);

  // On the 2032 board the middle row is the pact and nothing else, so it says so
  // whether or not one has been signed yet. On the 2026 board it is the enacted map
  // until a pact replaces it.
  const midLabel = is2032 || isMatched ? 'Pact' : eraId;

  // Both blank until this state has a pact, and on 2032 the gap holds out further
  // still — until its own turn comes round, so the pact row's swell isn't answered
  // underneath before it has finished making its point.
  const midBlank = is2032 && !isMatched;
  const gapBlank = is2032 && (!isMatched || (settling && elapsed < gapOffset));

  // The 2026 gap is a standing figure that a pact reduces, so it counts down to what
  // survives. The 2032 gap doesn't exist until a pact creates it, so it counts up from
  // nothing to what the pact left behind — which means feeding zero while unmatched
  // rather than the baseline the state would owe.
  const gapValue = is2032 && !isMatched ? 0 : Math.abs(gap);

  return (
    <>
      {/* The proportional share — the one figure that is true before anybody signs
          anything, and the only row on the 2032 board that starts with a number. */}
      <g opacity={fadeFor(Math.max(midSize, gapSize))}>
        <text x={6} y={EQ_ROW_Y[0]} dominantBaseline="central" fontSize={EQ_LABEL_SIZE} fill="#888">
          Minority Districts (Fair)
        </text>
        <text
          x={BOX_W - 6} y={EQ_ROW_Y[0]}
          textAnchor="end" dominantBaseline="central"
          fontSize={9} fontWeight={700} fill={PARTY_COLORS[minorityParty]}
        >
          {proportional}{minorityParty}
        </text>
      </g>

      {/* What the map delivers: the enacted count in 2026, the pact's own in 2032. */}
      <g opacity={fadeFor(gapSize)}>
        <text
          x={6}
          y={atMid(EQ_ROW_Y[1], SWELL_ROW_Y)}
          dominantBaseline="central"
          fontSize={atMid(EQ_LABEL_SIZE, PACT_SWELL_LABEL_SIZE)}
          fill="#888"
        >
          Minority Districts ({midLabel})
        </text>
        <AnimatedCount value={current} delay={midDelay} duration={duration}>
          {shown => (
            <text
              x={BOX_W - 6}
              y={atMid(EQ_ROW_Y[1], SWELL_ROW_Y)}
              textAnchor="end"
              dominantBaseline="central"
              fontSize={atMid(9, PACT_SWELL_COUNT_SIZE)}
              fontWeight={700}
              fill={PARTY_COLORS[minorityParty]}
            >
              {midBlank ? '' : shown}
              {/* Sized as well as faded, so the figure closes up the space it leaves
                  rather than sitting short of the row's edge. */}
              {!midBlank && (
                <tspan
                  fontSize={atMid(9, PACT_SWELL_COUNT_SIZE) * partyLetter}
                  opacity={partyLetter}
                >
                  {minorityParty}
                </tspan>
              )}
            </text>
          )}
        </AnimatedCount>
      </g>

      <line
        x1={6}
        y1={EQ_RULE_Y}
        x2={BOX_W - 6}
        y2={EQ_RULE_Y}
        stroke="rgba(0,0,0,0.15)"
        strokeWidth={0.5}
        opacity={fadeFor(Math.max(midSize, gapSize))}
      />

      <g opacity={fadeFor(midSize)}>
        <text
          x={6}
          y={atGap(EQ_ROW_Y[2], SWELL_ROW_Y)}
          dominantBaseline="central"
          fontSize={atGap(EQ_LABEL_SIZE, SWELL_LABEL_SIZE)}
          fill="#888"
        >
          Representation Gap
        </text>
        <AnimatedCount value={gapValue} delay={gapDelay} duration={duration}>
          {shown => (
            <text
              x={BOX_W - 6}
              y={atGap(EQ_ROW_Y[2], SWELL_ROW_Y)}
              textAnchor="end"
              dominantBaseline="central"
              fontSize={atGap(GAP_COUNT_SIZE, SWELL_COUNT_SIZE)}
              fontWeight={700}
              // Black belongs to the figure on screen, not the one being counted
              // towards: a gap falling to zero wears orange the whole way down and
              // turns black as it lands, and a gap that was already zero is black
              // throughout, because nothing is falling.
              fill={shown === 0 ? FAIR_BLACK : GAP_ORANGE}
            >
              {gapBlank ? '' : shown}
            </text>
          )}
        </AnimatedCount>
      </g>
    </>
  );
}

/** A state, the row it occupies in its column, and any push from the heading. */
interface Placement {
  state: StateData;
  row: number;
  yOffset: number;
}

function formatLean(lean: number): string {
  if (lean === 0) return 'EVEN';
  const dir = lean > 0 ? 'D' : 'R';
  return `${dir}+${Math.abs(lean).toFixed(0)}%`;
}


/**
 * Which side of the graph a state sits on: the D-drawn maps on the left, the
 * R-drawn on the right.
 *
 * The column is the gerrymander the state has to give up, because that's what a
 * pact trades — so every pairing across the gutter is a real trade. Statewide lean
 * is a close proxy for that and used to be what the split read: 43 of the 44
 * multi-district states sit on the side their own PVI names. Nevada is the one
 * that doesn't, R+1 with a D-drawn map, and reading the gap directly puts it with
 * the states it can actually disarm.
 *
 * Three states carry no gap and so hold no gerrymander to name a side (ME, MN, NE).
 * They fall back to the lean, which settles all three — none of them is EVEN.
 *
 * The third test, on who holds the branches, is currently unexercised: it's there
 * for a state that is gap 0 *and* exactly EVEN, and no state is both. Michigan is
 * EVEN but its fair map of 6R and 7D against an enacted 6R and 5D leaves its
 * Democrats two districts short, so the gap places it. The test stays because the
 * data moves, and because fairSplit() asks the same question of the same states —
 * see holdsDemocraticBranches(), which is where the reasoning lives now.
 *
 * The gap read here is the baseline, never the residual: sealing a pact must not
 * move its own partners out from under it.
 */
function isDemocraticSide(state: StateData): boolean {
  const gap = baselineGaps[state.id] ?? 0;
  if (gap !== 0) return gap < 0;
  if (state.partisanLean !== 0) return state.partisanLean > 0;
  return holdsDemocraticBranches(state);
}

/**
 * The box's top row: districts the state's own PVI says the minority party should
 * hold. Which party that is follows the state's side of the graph, so reading the
 * figure across the gutter compares an R share to a D share — the trade a pact
 * actually makes. On the left that's the R share, which is the side a D-drawn map
 * squeezes, so the row names the party the pact would hand seats back to.
 */
function minorityProportionalOf(state: StateData): number {
  const fair = fairSplit(state);
  return isDemocraticSide(state) ? fair.rSeats : fair.dSeats;
}

/**
 * Render order, held fixed no matter how the ranking moves.
 *
 * React reorders keyed children by re-inserting the nodes that moved, and a
 * re-inserted node loses its running CSS transition — so any box whose DOM
 * position changed would jump to its new row instead of sliding. React only
 * moves the ones that slipped backwards in the list, which is why the boxes
 * floating down were the ones landing without an animation. Keeping document
 * order constant leaves nothing but the transform to change, and every box
 * animates in both directions.
 */
function inDomOrder(placements: Placement[]): Placement[] {
  return placements.slice().sort((a, b) => a.state.id.localeCompare(b.state.id));
}

/**
 * How many seats a state's gerrymander holds, whichever way it leans. Magnitude,
 * because the sign is already spent on the columns: it's what put the state on
 * its side of the gutter, so within a side every gap points the same way and only
 * the size is left to say anything. It's also roughly what a pact spends, since
 * each trade is capped by the lesser partner, so the sizes are what want to match.
 *
 * Baseline, never the residual, for the same reason the column split is: a
 * sealed pact must not re-rank the states still choosing partners.
 */
function gapSizeOf(state: StateData): number {
  return Math.abs(baselineGaps[state.id] ?? 0);
}

/**
 * The resting order, with nothing selected: biggest delegation first, then the
 * biggest gerrymander, then alphabetical.
 *
 * There's no anchor to be near, so this isn't closeness — it's weight. The board
 * opens with the states that carry the most, and a size on its own doesn't settle
 * that: eight districts drawn straight and eight drawn three seats off are not
 * equally worth reading first. Alphabetical is left to settle states alike in
 * both, which is all it was ever fit to decide.
 */
function bySize(era: Era) {
  return (a: StateData, b: StateData): number =>
    era.districtsOf(b) - era.districtsOf(a) ||
    era.gapSizeOf(b) - era.gapSizeOf(a) ||
    a.name.localeCompare(b.name);
}

/**
 * How far apart two delegations are, as a ratio rather than a seat count: 38 and
 * 52 are 1.37 apart, 3 and 2 are 1.5. Sizes here run 2 to 52, and across that
 * range a fixed seat difference means nothing consistent — at the bottom one seat
 * is half the delegation, at the top it's rounding. So "alike in size" has to be
 * scale-free or it isn't one test.
 *
 * It only differs from a nominal difference when candidates straddle the anchor;
 * where every candidate is smaller (or every one larger) both are monotone in
 * size and rank identically. Across the 44 matchable states it moves exactly one
 * column head, and moves it right: nominal gave Texas(38) New York(26) over
 * California(52), on 12 seats against 14, while California's own column headed
 * with Texas — the two sides of the marquee pairing disagreeing about each other.
 */
function sizeRatio(target: StateData, era: Era) {
  const targetSize = era.districtsOf(target);
  return (state: StateData): number => {
    const r = era.districtsOf(state) / targetSize;
    return r >= 1 ? r : 1 / r;
  };
}

/**
 * Closest delegation size first, then closest proportional minority share, then
 * closest representation gap, then alphabetical.
 *
 * The gap ranks last of the real keys, which is the whole of what it's allowed to
 * say. The durable pact is between alike states — a state can redraw its way out
 * of its gap, but not out of its size or its lean — so those terms lead, and the
 * gap only settles states already alike in both. Where it does settle them, it
 * settles them usefully: the pact spends the lesser of the two gaps, so the
 * nearest-sized gap is the one that leaves fewest seats on the table.
 *
 */
function byClosenessTo(target: StateData, era: Era) {
  const sizeApart = sizeRatio(target, era);
  const targetMinority = era.minorityFairOf(target);
  const targetGap = era.gapSizeOf(target);
  return (a: StateData, b: StateData): number => {
    // The state that was clicked heads its own column. It scores zero on every key
    // below, but so does any state of the same size, share and gap — three 2-district
    // states would otherwise settle it alphabetically, which is how Rhode Island
    // ended up below Hawaii and New Hampshire.
    if (a.id === target.id) return -1;
    if (b.id === target.id) return 1;

    // Equal ratios compare equal: IEEE division is correctly rounded, so two
    // mathematically identical ratios (12/9 and 16/12, say) land on the same
    // double however they were reached.
    const sizeDiff = sizeApart(a) - sizeApart(b);
    if (sizeDiff !== 0) return sizeDiff;

    const minorityDiff =
      Math.abs(era.minorityFairOf(a) - targetMinority) -
      Math.abs(era.minorityFairOf(b) - targetMinority);
    if (minorityDiff !== 0) return minorityDiff;

    const gapDiff = Math.abs(era.gapSizeOf(a) - targetGap) - Math.abs(era.gapSizeOf(b) - targetGap);
    if (gapDiff !== 0) return gapDiff;

    return a.name.localeCompare(b.name);
  };
}

export function BipartiteMatchGraph({
  era: eraId,
  selectedMatches,
  onToggleMatch,
  residualGaps,
}: BipartiteMatchGraphProps) {
  const era = ERAS[eraId];
  const [activeStateId, setActiveStateId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Which box the pointer is over, tracked here rather than left to CSS `:hover`.
  // A click re-ranks both columns, so the box under the cursor slides away without
  // the cursor moving — and a browser leaves `:hover` where it was until the
  // pointer next moves. A deselected box would sit there still wearing the black
  // it had just given up, indistinguishable from the active box it no longer was.
  // A tap does the same on touch, where nothing moves the pointer afterwards at all.
  const [hoveredStateId, setHoveredStateId] = useState<string | null>(null);

  // Where the pointer last actually was, which is what tells a hover from a
  // re-ranking. Moving the board under a still cursor raises the same enter and
  // move events a real pointer would, and each box the board drags past claims the
  // hover and gives it up a frame later — a run of black borders flickering down
  // the column behind a click, ending on whichever box the scroll happened to
  // leave under the cursor. Those synthetic events carry the coordinates the
  // pointer already had, so comparing against them separates the two cases: same
  // point means the content moved and the hover isn't the pointer's to give.
  const pointerAt = useRef<{ x: number; y: number } | null>(null);

  /** Take the hover, but only if the pointer moved here under its own steam. */
  const takeHover = (stateId: string, e: React.PointerEvent) => {
    const last = pointerAt.current;
    if (last && last.x === e.clientX && last.y === e.clientY) return;
    pointerAt.current = { x: e.clientX, y: e.clientY };
    setHoveredStateId(id => (id === stateId ? id : stateId));
  };

  // A sealed pact turns its boxes black and starts their gap counts falling, but
  // the board holds still for a beat before the pair leaves for "Your Pacts" —
  // otherwise both boxes slide out from under the numbers they just changed.
  // Only the layout waits: it reads the pre-pact board, the same anchor and the
  // same list of pacts, so nothing but the counts moves.
  const [seal, setSeal] = useState<Seal | null>(null);

  useEffect(() => {
    if (!seal) return;
    const timeoutId = setTimeout(() => setSeal(null), LINGER_MS[eraId]);
    return () => clearTimeout(timeoutId);
  }, [eraId, seal]);

  const layoutMatches = seal ? seal.matches : selectedMatches;
  const anchorId = seal ? seal.anchorId : activeStateId;

  /** stateId → the state it is currently paired with */
  const partnerById = useMemo(() => {
    const map = new Map<string, StateData>();
    const byId = new Map(era.states.map(s => [s.id, s]));
    for (const [a, b] of selectedMatches) {
      const stateA = byId.get(a);
      const stateB = byId.get(b);
      if (stateA && stateB) {
        map.set(a, stateB);
        map.set(b, stateA);
      }
    }
    return map;
  }, [era, selectedMatches]);

  // Sides follow the direction of the state's gerrymander, so a pairing across the
  // gutter always has seats to trade — see pactSeatsReturned(), which pays out
  // nothing on two states drawn the same way. A state carrying no gap has no
  // gerrymander to place it, and falls back to lean and then to who holds its
  // branches; see isDemocraticSide(). It can still be paired, but a partner with
  // nothing to give up returns nothing.
  const { leftStates, rightStates, columnOf } = useMemo(() => {
    const left: StateData[] = [];
    const right: StateData[] = [];
    const column = new Map<string, Column>();

    for (const state of era.states) {
      if (era.isDemocraticSide(state)) {
        left.push(state);
        column.set(state.id, 'left');
      } else {
        right.push(state);
        column.set(state.id, 'right');
      }
    }

    return { leftStates: left, rightStates: right, columnOf: column };
  }, [era]);

  const anchorState = useMemo(
    () => (anchorId ? era.states.find(s => s.id === anchorId) ?? null : null),
    [anchorId, era],
  );

  // Matched states leave the running order for good and park at the bottom,
  // both partners on the same row so their link runs flat. The unmatched half of
  // *both* columns re-ranks against the anchor, so its own column brings the
  // nearest alternatives up beside it (the anchor itself sorts first, being zero
  // from itself) while the opposite column offers its closest partners. The anchor
  // is the active state, except during a pact's linger, when it's the state that
  // was active when the pact was sealed.
  const { leftPlacements, rightPlacements, rowCount, pactHeader } = useMemo(() => {
    const matchedIds = new Set<string>();
    const pactIndexOf = new Map<string, number>();
    layoutMatches.forEach(([a, b], i) => {
      matchedIds.add(a).add(b);
      pactIndexOf.set(a, i);
      pactIndexOf.set(b, i);
    });

    const planColumn = (states: StateData[]) => {
      const isRanking = !!anchorState;
      return {
        flowing: states
          .filter(s => !matchedIds.has(s.id))
          .sort(isRanking ? byClosenessTo(anchorState, era) : bySize(era)),
        // Pact order, so both columns park their halves in the same sequence.
        parked: states
          .filter(s => matchedIds.has(s.id))
          .sort((x, y) => (pactIndexOf.get(x.id) ?? 0) - (pactIndexOf.get(y.id) ?? 0)),
      };
    };

    const left = planColumn(leftStates);
    const right = planColumn(rightStates);
    const rows = Math.max(
      left.flowing.length + left.parked.length,
      right.flowing.length + right.parked.length,
    );

    const headed = layoutMatches.length > 0;
    const offset = headed ? PACT_HEADER_H : 0;

    const place = (plan: { flowing: StateData[]; parked: StateData[] }): Placement[] => [
      ...plan.flowing.map((state, i) => ({ state, row: i, yOffset: 0 })),
      ...plan.parked.map((state, i) => ({
        state,
        row: rows - plan.parked.length + i,
        yOffset: offset,
      })),
    ];

    return {
      leftPlacements: place(left),
      rightPlacements: place(right),
      rowCount: rows,
      pactHeader: headed ? { startRow: rows - layoutMatches.length } : null,
    };
  }, [anchorState, era, leftStates, rightStates, layoutMatches]);

  const totalHeight =
    TOP_PAD + rowCount * ROW_H - ROW_GAP + BOTTOM_PAD + (pactHeader ? PACT_HEADER_H : 0);

  /** Where each state landed, so the links know which row to sit on. */
  const rowById = useMemo(() => {
    const map = new Map<string, { row: number; yOffset: number }>();
    for (const { state, row, yOffset } of [...leftPlacements, ...rightPlacements]) {
      map.set(state.id, { row, yOffset });
    }
    return map;
  }, [leftPlacements, rightPlacements]);

  // Clicking outside any box clears the active selection.
  useEffect(() => {
    if (!activeStateId) return;
    const deactivate = () => setActiveStateId(null);
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', deactivate, { once: true });
    }, 0);
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', deactivate);
    };
  }, [activeStateId]);

  const handleStateClick = (state: StateData, e: React.MouseEvent) => {
    e.stopPropagation();

    // The click is about to move this box, so whatever the pointer was over it is
    // no longer over. The next pointer move re-establishes it; until then the
    // border says only what the click made it.
    setHoveredStateId(null);

    // Any further click ends the previous pact's linger early: the user has moved
    // on, and the board should answer this click rather than the last one.
    setSeal(null);

    if (!activeStateId) {
      setActiveStateId(state.id);
      return;
    }
    if (state.id === activeStateId) {
      setActiveStateId(null);
      return;
    }
    if (columnOf.get(state.id) === columnOf.get(activeStateId)) {
      // Same side — can't pair, so re-aim at the newly clicked state
      setActiveStateId(state.id);
      return;
    }
    // Opposite side — seal the pact (overriding either state's previous one).
    // The board freezes as it stands, both partners included, until the linger
    // lapses; the gaps they return are already falling on the two boxes.
    setSeal({
      anchorId: activeStateId,
      matches: selectedMatches,
      pair: [activeStateId, state.id],
    });
    onToggleMatch([activeStateId, state.id]);
    setActiveStateId(null);
  };

  const rowTopY = (row: number, yOffset: number) => TOP_PAD + row * ROW_H + yOffset;

  /** Top of the first parked pact — everything in the heading hangs off it. */
  const pactTopY = pactHeader ? rowTopY(pactHeader.startRow, PACT_HEADER_H) : 0;

  // A clicked state sorts to the head of its own column, which is usually above
  // where it was standing — so follow it up, or the click appears to make the box
  // vanish. The row is read from the plan rather than the DOM because the box is
  // still mid-transition to it. Nothing moves if it's already on screen.
  useEffect(() => {
    const placed = activeStateId ? rowById.get(activeStateId) : null;
    if (!placed || !svgRef.current) return;

    const svgBox = svgRef.current.getBoundingClientRect();
    const scale = svgBox.width / VIEW_W;
    const top = svgBox.top + rowTopY(placed.row, placed.yOffset) * scale;
    const bottom = top + BOX_H * scale;

    // The stat bar is sticky at the top of the viewport and would cover the row.
    const statBar = document.querySelector('.stat-bar-wrapper');
    const headroom = (statBar?.getBoundingClientRect().height ?? 0) + SCROLL_MARGIN;
    if (top >= headroom && bottom <= window.innerHeight - SCROLL_MARGIN) return;

    window.scrollBy({
      top: top - headroom,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  }, [activeStateId, rowById]);

  const renderStateBox = (state: StateData, index: number, column: Column, yOffset: number) => {
    const isActive = state.id === activeStateId;
    const isHovered = state.id === hoveredStateId;
    const partner = partnerById.get(state.id);
    const isMatched = !!partner;
    const partisanColor = leanColorScale(state.partisanLean);
    const leanTextColor = Math.abs(state.partisanLean) > 10 ? '#fff' : '#333';
    const isLeft = column === 'left';

    const boxX = isLeft ? LEFT_BOX_X : RIGHT_BOX_X;
    const boxY = rowTopY(index, yOffset);

    // Both columns read name→badge, so the two sides scan the same way.
    const leanText = formatLean(state.partisanLean);
    const badgeW = leanText.length * 5 + 8;
    const badgeH = 13;
    const badgeX = BOX_W - 5 - badgeW;

    // Only the minority party's districts are shown: the side the map squeezes, or
    // on the 2032 board would squeeze. Which party that is follows the column, so
    // every row on the box reads in the same party.
    const minorityParty = isLeft ? 'R' : 'D';
    const fairMinority = era.minorityFairOf(state);

    // The equation the box spells out: the districts the state's own PVI says the
    // squeezed party should hold, the districts the era's map gives it, and the gap
    // between them. The middle row moves with the pacts, so it's the fair count less
    // whatever gap survives them — before any pact that is the era's own baseline,
    // the enacted count in 2026 and nothing at all in 2032.
    const signedGap = residualGaps[state.id] ?? 0;
    const currentMinority = fairMinority - Math.abs(signedGap);

    return (
      <g
        key={state.id}
        className={`state-box ${isActive ? 'active' : ''} ${isMatched ? 'matched' : ''}`}
        style={{ transform: `translate(${boxX}px, ${boxY}px)` }}
        // A parked pact is settled: the only move left on it is the × that breaks it.
        onClick={isMatched ? undefined : e => handleStateClick(state, e)}
        // `move` as well as `enter`, so a pointer left inside the box by a click
        // takes the hover back on its next twitch rather than waiting to cross the
        // border again. It sets the same id it already holds, which React drops
        // without a render, so the stream of moves costs nothing.
        //
        // Both go through takeHover, which turns away the enters the board raises
        // by moving. Leaving needs no such test: a box the board carries out from
        // under the cursor really has stopped being under it, and dropping the
        // hover is the whole reason this isn't `:hover`.
        onPointerEnter={e => takeHover(state.id, e)}
        onPointerMove={e => takeHover(state.id, e)}
        onPointerLeave={() => setHoveredStateId(id => (id === state.id ? null : id))}
      >
        <rect x={0} y={0} width={BOX_W} height={BOX_H} fill="white" rx={3} />
        <rect
          x={0}
          y={0}
          width={BOX_W}
          height={BOX_H}
          fill="none"
          // One weight on every box, so the border says what it says by color
          // alone: partisan lean at rest, black once the box is picked up or
          // sealed, and black under the pointer to say it can be. A thicker
          // stroke only made the same point twice.
          stroke={isActive || isMatched || isHovered ? FAIR_BLACK : partisanColor}
          strokeWidth={2}
          rx={3}
        />

        <line
          x1={6}
          y1={HEADER_HEIGHT}
          x2={BOX_W - 6}
          y2={HEADER_HEIGHT}
          stroke="rgba(0,0,0,0.15)"
          strokeWidth={0.5}
        />

        <g
          transform={`translate(${badgeX - PYRAMID_GAP - PYRAMID_W}, ${HEADER_MID_Y - PYRAMID_H / 2})`}
        >
          <ControlPyramid state={state} />
        </g>

        <rect
          x={badgeX}
          y={HEADER_MID_Y - badgeH / 2}
          width={badgeW}
          height={badgeH}
          fill={partisanColor}
          rx={2.5}
        />
        <text
          x={badgeX + badgeW / 2}
          y={HEADER_MID_Y}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={8.5}
          fill={leanTextColor}
          fontWeight={600}
        >
          {leanText}
        </text>
        <text
          x={6}
          y={NAME_BASELINE_Y}
          fontSize={NAME_SIZE}
          fill="#333"
          fontWeight={isActive ? 600 : 500}
        >
          {state.name}
          {/* No baseline of its own: it inherits the line's, which is the point. */}
          <tspan dx={3} fontSize={8.5} fontWeight={500} fill="#999">
            ({era.districtsOf(state)})
          </tspan>
        </text>

        <BoxBody
          eraId={eraId}
          minorityParty={minorityParty}
          proportional={fairMinority}
          current={currentMinority}
          gap={signedGap}
          isMatched={isMatched}
          // The two boxes that just signed put their gap up in lights before
          // going anywhere; the linger they're holding still for is the length
          // of that.
          settling={!!seal?.pair.includes(state.id)}
        />
      </g>
    );
  };

  return (
    <div className="bipartite-graph-wrapper">
      <svg ref={svgRef} viewBox={`0 0 ${VIEW_W} ${totalHeight}`} className="bipartite-graph">
        {/* Links first, so the boxes sit on top of where they meet. */}
        {/* Parked pacts only: the link is where the pair came to rest, so it waits
            out the linger with them rather than reaching across the flowing rows. */}
        <g className="match-links">
          {layoutMatches.map(([a, b]) => {
            const placedA = rowById.get(a);
            const placedB = rowById.get(b);
            if (!placedA || !placedB) return null;

            // Every pact spans the gutter, and both halves park on the same row, so
            // the link is always flat and the whole fitting — line and button — can
            // ride a single transform. That's what lets it travel with its boxes
            // when a pact below it breaks and the block above slides down: a line's
            // endpoints can't be transitioned, but a transform can.
            const y = rowTopY(placedA.row, placedA.yOffset) + BOX_H / 2;
            return (
              <g
                key={[a, b].slice().sort().join('-')}
                className="match-link"
                style={{ transform: `translate(0px, ${y}px)` }}
              >
                <line
                  x1={LEFT_BOX_X + BOX_W}
                  y1={0}
                  x2={RIGHT_BOX_X}
                  y2={0}
                  stroke={FAIR_BLACK}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
                {/* Dissolving the pact is a property of the pair, not of either
                    state, so the control sits on the link that joins them. */}
                <g
                  className="pact-remove"
                  transform={`translate(${LINK_MID_X}, 0)`}
                  onClick={e => {
                    e.stopPropagation();
                    setActiveStateId(null);
                    // A parked box takes no pointer events, so one that was hovered
                    // when it parked never got its `leave`. Freed here, it would
                    // rejoin the flowing rows still wearing the pact's black.
                    setHoveredStateId(null);
                    setSeal(null);
                    onToggleMatch([a, b]);
                  }}
                >
                  <title>Break this pact</title>
                  <circle r={REMOVE_R} fill="white" stroke={FAIR_BLACK} strokeWidth={1.5} />
                  <path
                    d={`M${-REMOVE_TICK} ${-REMOVE_TICK}L${REMOVE_TICK} ${REMOVE_TICK}
                        M${REMOVE_TICK} ${-REMOVE_TICK}L${-REMOVE_TICK} ${REMOVE_TICK}`}
                    stroke={GAP_ORANGE}
                    strokeWidth={1.5}
                    strokeLinecap="round"
                  />
                </g>
              </g>
            );
          })}
        </g>

        {/* Hung off the top of the parked block, which moves a row whenever a pact
            is broken. It's drawn relative to that top and carried there by a
            transform, so the heading floats down with the block instead of
            ratcheting to the new row ahead of it. */}
        {pactHeader && (
          <g className="pact-heading" style={{ transform: `translate(0px, ${pactTopY}px)` }}>
            <text
              x={VIEW_W / 2}
              y={-PACT_LABEL_GAP}
              textAnchor="middle"
              fontSize={PACT_LABEL_SIZE}
              fontWeight={700}
              letterSpacing="0.1em"
              fill={FAIR_BLACK}
            >
              YOUR PACTS
            </text>
          </g>
        )}

        <g className="left-column">
          {inDomOrder(leftPlacements).map(({ state, row, yOffset }) =>
            renderStateBox(state, row, 'left', yOffset),
          )}
        </g>
        <g className="right-column">
          {inDomOrder(rightPlacements).map(({ state, row, yOffset }) =>
            renderStateBox(state, row, 'right', yOffset),
          )}
        </g>
      </svg>
    </div>
  );
}
