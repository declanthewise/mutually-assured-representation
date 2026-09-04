import { CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { BranchControl, StateData, MatchPair } from '../types';
import {
  EVEN_GRAY,
  FAIR_BLACK,
  GAP_ORANGE,
  LEAN_DOMAIN,
  LEAN_RANGE,
  PARTY_COLORS,
  ROUTE_GRAY,
  UNDERREP_DOMAIN,
  UNDERREP_RANGE,
} from '../colors';
import { baselineGaps, fairSplit } from '../data/computeRepresentationGap';
import {
  gapSize2032Of,
  isDemocraticSide2032,
  matchable2032States,
  minorityFair2032,
} from '../data/plan2032';
import { holdsDemocraticBranches, stateData, stateDataById } from '../data/stateData';
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

/**
 * The box's border: how much of what the state owes its squeezed party it hasn't
 * drawn, as a fraction of the debt — the box's own gap row over its top row.
 *
 * A fraction because the gap is counted in whole districts and delegations run
 * from 2 to 52, so the raw figure says nothing comparable across the board. The
 * border is about how hard the map is wrung, not how many districts that came to;
 * how many is what the three rows say, and what the map's clouds are sized by.
 *
 * Against the *debt* rather than against the delegation, which is what puts the
 * big states where they belong — see UNDERREP_DOMAIN, which plateaus at half the
 * debt, so a state giving the squeezed party less than half its share reads solid.
 */
const underrepColorScale = d3.scaleLinear<string>()
  .domain(UNDERREP_DOMAIN)
  .range(UNDERREP_RANGE)
  .clamp(true);

const BOX_W = 140;
const BOX_H = 60;
const BOX_R = 3;
const ROW_GAP = 6;
const ROW_H = BOX_H + ROW_GAP;
const HEADER_HEIGHT = 19;

/** Source Sans 3 caps fill 0.66em — the figure every cap measure here is taken at. */
const CAP_RATIO = 0.66;

/**
 * The alphabetic baseline that stands a run's caps centered on `y` — what
 * `dominant-baseline: central` is asked for and, on a line of more than one run,
 * doesn't reliably give. See the header line below, and the count row in BoxBody.
 */
function capBaseline(y: number, size: number): number {
  return y + (size * CAP_RATIO) / 2;
}

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
const NAME_BASELINE_Y = capBaseline(HEADER_MID_Y, NAME_SIZE);

/**
 * Names too long to stand beside their own route marks, and what they stand as
 * instead.
 *
 * The header is a budget, and it is **per state**: the badge is pinned to the right
 * edge, the pyramid sits a fixed step left of that, the route marks take only the
 * width the state's own marks need, and the name gets what is left from x=6. So the
 * budget runs from 64.3 units for a two-mark state with a wide lean badge up to 83
 * for a state with no marks at all and a narrow one. That is the whole reason this
 * list is four names and not ten: North Carolina draws neither mark and has 3.5 units
 * to spare, where against a fixed two-mark strip it would have been eleven short.
 *
 * Measured in the app at weight 600 — the weight the active box wears, so the one box
 * that could collide is the one being pointed at. South Carolina clears by 1.2 units
 * and North Carolina by 3.5, so re-measure the moment the marks, the pyramid or the
 * badge changes size.
 *
 * Only two of the four ever render: ND and SD are single-district states, which
 * neither board seats. The rule is to shorten the leading word where there is one to
 * shorten and clip where there isn't. The full name stays on the element's `title`,
 * and everywhere else — the map, the tooltip, the results list — is untouched.
 */
const HEADER_ABBREVIATIONS: Record<string, string> = {
  MA: 'Mass.',
  ND: 'N. Dakota',
  NH: 'N. Hampshire',
  SD: 'S. Dakota',
};

const headerName = (state: StateData) => HEADER_ABBREVIATIONS[state.id] ?? state.name;

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
 * It shares the header row with the state name and the route marks, and the four of
 * them spend the row between them: the badge is pinned right, the pyramid sits a fixed
 * step left of it, the marks take only the width the state's own marks need, and the
 * name takes what is left. The name is what gives first — four of them are shortened
 * to fit, in HEADER_ABBREVIATIONS.
 */
const PYRAMID_W = 11;
const PYRAMID_H = 10;
const PYRAMID_GAP = 3.5;

/**
 * The two route marks, in the strip between the district count and the pyramid: what
 * could change this state's map over the objection of whoever draws it now. A
 * citizens' initiative that can reach map-drawing, and a governor's veto that costs
 * something. Both are narrow readings — see `types.ts`, and `data/mapDrawingRules.md`
 * for the state-by-state working.
 *
 * **The strip is only as wide as the marks a state actually has**, and a state with
 * neither gives the whole of it back to its name. Reserving both slots on every box
 * would line the marks up down a column, which is worth something, but it costs 13.7
 * units of every header to hold space for a mark that isn't there — and the states
 * that pay most are the ones with no marks to line up, which is where the reservation
 * buys nothing at all. North Carolina has neither mark and, given the room, fits its
 * whole name.
 *
 * The veto sits nearest the pyramid, because it belongs to the figure at that
 * pyramid's apex, and the initiative outside it, which is where it comes from. With
 * one mark there is no gap to leave: it takes the place against the pyramid whichever
 * one it is.
 *
 * The two are different widths because their shapes are — a figure is round and a
 * pair of boxes is narrow — and forcing both into one square would only pad the
 * narrower with air.
 */
const ROUTE_H = 9;
const ROUTE_PERSON_W = 7;
const ROUTE_BALLOT_W = 4.2;
const ROUTE_GAP = 2.5;

/** The strip's width for one state: 0, one mark, or both with a gap between them. */
function routeBlockWidth(state: StateData): number {
  const widths = [
    state.hasBallotInitiative ? ROUTE_BALLOT_W : 0,
    state.governorCanVeto ? ROUTE_PERSON_W : 0,
  ].filter(w => w > 0);

  if (widths.length === 0) return 0;
  return widths.reduce((a, b) => a + b, 0) + ROUTE_GAP * (widths.length - 1);
}
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
 * How long a box takes to slide from one row to another — the columns' own curve,
 * spent in `App.css` and named here because the pieces that hang off a row have to
 * wait exactly this long for the boxes to arrive. Handed over as `--row-travel-ms`
 * so there is one figure rather than a literal in each file.
 */
const ROW_TRAVEL_MS = 550;

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
 * What the sequence waits out before its first row moves: the two boxes reaching the
 * head of their columns, and then the link closing between them.
 *
 * A swell that starts on the click runs while its own box is still travelling, so the
 * figure the click is about is magnified on a box sliding under it — on a long trip up
 * the column it can be half over before the box has stopped. And a swell that starts
 * on arrival talks over the closing, which is the pact being made: the box would be
 * explaining what the trade came to while the two states were still reaching for each
 * other. Nothing the box has to say is true until the halves touch, so nothing it says
 * begins until they do.
 */
const SEAL_LEAD_MS = ROW_TRAVEL_MS + SEAL_COUNT_MS;

/**
 * Where the gap row sits in the sequence: one whole cycle in, so it follows the pact
 * row rather than sharing a line with it.
 */
const GAP_ROW_OFFSET_MS = SWELL_CYCLE_MS;

/**
 * When the **first** count starts, measured from the seal — the lead, then the pact
 * row's own rise. This is the moment the trade lands, and everything the pact causes
 * happens on it: the two borders and the link between them come up in their new
 * colors, and on the map the arc draws and the badges fly.
 *
 * The colors are read off the residual gap, which the second count is still to spell
 * out. They come up here anyway, because a pact takes effect all at once and this is
 * where it does — the gap row that follows is the accounting, not the event. Holding
 * them back for it left the board still and colorless through the one beat that had
 * news.
 *
 * Handed to CSS as `--pact-count-ms`, and to `HeroMap` as the delay its flight leaves
 * on, so the graph and the map answer the same click at the same instant.
 */
export const PACT_COUNT_AT_MS = SEAL_LEAD_MS + SWELL_MS;

/**
 * How long a sealed pact holds its place before taking its seat under "Your Pacts":
 * the pair rides to the head of the columns, and then **two full swells, one after the
 * other**. The pact row rears up and counts to what the trade delivered, folds away,
 * and the gap row does the same with what that left behind. Read in that order they
 * are cause and consequence, which is the sentence the box is making.
 *
 * They cannot overlap, and that is a geometric fact rather than a preference: both
 * rows swell toward `SWELL_ROW_Y`, the middle of the box, so a fold running into the
 * next rise would put two magnified rows on the same line. Each waits for the last to
 * be fully home.
 *
 * **The lead is what the two boxes spend arriving.** A swell that starts on the click
 * runs while its own box is still travelling, so the figure the click is about is
 * magnified on a box sliding under it — and on a long trip up the column it can be
 * half over before the box has stopped. The seats coming back are the point of the
 * click, so they are spelled out at a size that can't be missed on two boxes standing
 * level and still, which is also when the link between them closes.
 *
 * **Both boards run the same sequence.** 2026 used to show only the gap, on the
 * grounds that its middle row was restating what the gap row already said. But a pact
 * moves that row too — New York goes from 6 of its 11 to 8 — and it is the trade
 * itself, where the gap is only what the trade failed to close. One figure each, in
 * the order they happen, on either board.
 *
 * It comes to 4350ms, which is a long time to hold a board still, and it is two
 * figures' worth.
 */
const PACT_LINGER_MS = SEAL_LEAD_MS + SWELL_CYCLE_MS * 2;


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
 * The pact row at full swell. It grows less far than the gap row at both ends, and the
 * reason is that it carries more: a longer label, and a count that keeps its party.
 *
 * The row is 128 units wide, x=6 to x=134, label left and count right. Measured in the
 * app at the weights they are set in, "Minority Districts (Pact)" runs 9.67 units per
 * unit of font size against "Representation Gap"'s 8.26, and the widest count either
 * row can hold is two digits and a letter — "18D", the largest trade on the 2032 board
 * — at 1.653 per unit against a bare "18"'s 1.024.
 *
 * So the gap row's 11-and-28 is not available here at any pairing. At 9 and 19 the two
 * come to 87.0 and 31.4, clearing by 9.6 — a shade more than the 8.4 the gap row lives
 * on. Nothing bigger fits: 9 and 20 leaves 8.0, and 9.5 and 19 leaves 4.8.
 *
 * **The party letter stays.** It used to be dropped on the way up, which bought a
 * label at 10 and a count at 21, and it was the wrong thing to sell — the letter names
 * the party every figure in the box is about, and a row that sheds it mid-swell is
 * answering a question it has stopped asking. Paying for it out of both sizes instead
 * costs a point of label and two of count, and the row still magnifies by more than
 * two to one.
 */
const PACT_SWELL_LABEL_SIZE = 9;
const PACT_SWELL_COUNT_SIZE = 19;

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
 * unrelated facts. That veto now has a mark of its own, immediately to the left.
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

/**
 * The route marks for one state, laid left to right from the top-left of a
 * routeBlockWidth × ROUTE_H box and each simply absent when the state hasn't got it.
 * The x accumulates rather than being indexed, which is what closes the gap when only
 * one mark is drawn.
 *
 * Each mark **depicts its subject rather than its truth**: a ballot for the initiative,
 * a person for the governor. An earlier pass drew a tick and a prohibition sign, which
 * were individually clearer and together wrong — a tick beside a strike-through reads
 * as one question answered yes and no, not as two powers a state either has or hasn't.
 * Truth is carried by presence, which is why nothing is drawn for a state without one.
 *
 * The ballot is two stacked boxes with the top one ticked: a choice being made, which
 * is what an initiative is, and the only one of these shapes that has to be drawn in
 * outline. At ROUTE_BALLOT_W it renders about 5px across, so the strokes are held at
 * 0.8 units and the tick overhangs its box the way a hand-drawn one does — inside the
 * lines it would close up. The figure opposite is head and shoulders in solid
 * ROUTE_GRAY, the governor as a person rather than as an act, since the act is what the
 * mark's absence would have to depict and a mark can only show what is there.
 */
function RouteMarks({ state }: { state: StateData }) {
  const marks = [];
  let x = 0;

  if (state.hasBallotInitiative) {
    marks.push(
      <g key="ballot" transform={`translate(${x}, 0)`}>
        <title>Citizens can put map-drawing on the ballot</title>
        {/* Heavier than a hairline on purpose: the figure opposite is solid, and two
            marks of the same color have to carry the same weight or the outlined one
            reads as the fainter fact rather than the other fact. */}
        <g fill="none" stroke={ROUTE_GRAY} strokeWidth={0.9}>
          <rect x={0.45} y={0.45} width={3.3} height={3.3} rx={0.6} />
          <rect x={0.45} y={5.25} width={3.3} height={3.3} rx={0.6} />
        </g>
        <path
          d="M1.15,2.1 L1.95,3.0 L3.35,1.0"
          fill="none"
          stroke={ROUTE_GRAY}
          strokeWidth={1}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>,
    );
    x += ROUTE_BALLOT_W + ROUTE_GAP;
  }

  if (state.governorCanVeto) {
    marks.push(
      <g key="veto" transform={`translate(${x}, 0)`} fill={ROUTE_GRAY}>
        <title>The governor&apos;s veto is a real check on the map</title>
        <circle cx={3.5} cy={2.1} r={2.1} />
        <path d="M0.3,9 C0.3,6 1.8,4.9 3.5,4.9 C5.2,4.9 6.7,6 6.7,9 Z" />
      </g>,
    );
  }

  return <>{marks}</>;
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
  const elapsed = useSettleElapsed(settling, PACT_LINGER_MS);

  // Reduced motion keeps the beat and drops the swell: the counts still wait their
  // turn and still run, they just don't rear up to be looked at.
  const reduced =
    settling && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // The boxes arriving and the link closing, which the whole sequence waits out — see
  // SEAL_LEAD_MS. Nothing to wait for under reduced motion, where a box reaches its
  // row and the link closes inside a millisecond.
  const lead = reduced ? 0 : SEAL_LEAD_MS;

  /** How far the row starting at `offset` into the sequence has taken the box over. */
  const swellOf = (offset: number) =>
    settling && !reduced ? swellAt(elapsed - lead - offset) : 0;

  // Two figures, in the order they happen: the pact row takes its turn, and the gap
  // row follows a whole cycle later. They share a centre line and cannot be up at
  // once — see PACT_LINGER_MS. Both boards run it, because a pact moves both rows on
  // either of them; 2026 is filling one in and 2032 writing it from nothing, which is
  // a difference in what the rows say and not in when they say it.
  const gapOffset = GAP_ROW_OFFSET_MS;
  const midSize = swellOf(0);
  const gapSize = swellOf(gapOffset);

  const atMid = (rest: number, full: number) => rest + (full - rest) * midSize;
  const atGap = (rest: number, full: number) => rest + (full - rest) * gapSize;

  // Each count waits for the lead and then for its own row to finish rising. The
  // first is PACT_COUNT_AT_MS, which is the figure CSS and the map are both given.
  //
  // **Off a seal there is no count at all.** The one thing that moves these figures
  // without one is the × breaking a pact, and that is an undo: the state goes back to
  // what it was, and a number easing there would read as a second event rather than
  // as the first being taken back. The borders drop their color the same way — see
  // `.state-box.settling` in App.css, which is why that transition is scoped.
  const duration = settling ? SEAL_COUNT_MS : 0;
  const midDelay = settling ? lead + SWELL_MS : 0;
  const gapDelay = settling ? lead + gapOffset + SWELL_MS : 0;

  // A row gets out of the way of whichever *other* row is up.
  const fadeFor = (swell: number) => 1 - swell;

  // The row carries two runs at one size, so the size is named once.
  const midCountSize = atMid(9, PACT_SWELL_COUNT_SIZE);

  // On the 2032 board the middle row is the pact and nothing else, so it says so
  // whether or not one has been signed yet. On the 2026 board it is the enacted map
  // until a pact replaces it — and that is a change the row should be seen to make,
  // so the old parenthetical is kept on screen and dissolved into the new one.
  const midLabel = is2032 || isMatched ? 'Pact' : eraId;

  // The label the row is leaving behind, drawn over the one it is arriving at and
  // faded out by the swell that is lifting them both. Only the 2026 board has one:
  // 2032's middle row is `(Pact)` before anybody signs anything.
  //
  // Only the ending changes, so only the ending crosses over: the two readings fade
  // against each other while "Minority Districts" is drawn once, at full strength,
  // and never dips. Crossfading two whole labels was tried and is wrong twice over —
  // the shared prefix goes through both layers at part opacity and lightens visibly at
  // the halfway point, and before the fade starts the two endings sit stacked and
  // legible as neither.
  const midLabelWas = !is2032 && isMatched && settling && !reduced ? eraId : null;

  // How much of it is left. Off its own clock rather than off `1 - midSize`, because
  // the swell is symmetric — it comes back down when the row folds, and the old
  // reading came back with it. This only runs one way. Linear, where the size it rides
  // on is eased: a dissolve wants an even hand-over, and easing one of two crossfading
  // layers is what makes a crossfade dip.
  const midLabelWasOpacity = Math.max(0, 1 - Math.max(0, elapsed - lead) / SWELL_MS);

  // Both blank until this state has a pact, and on 2032 each holds its blank until its
  // own row starts to rise. A figure that arrives before the row has moved is a figure
  // nothing has drawn attention to: the `0R` a 2032 pact row would otherwise show from
  // the click sat there through the boxes' trip and the link's closing, saying a state
  // had been measured and found empty, when what it was waiting to say is that a pact
  // was about to fill it. Now each row's first reading appears as its own swell takes
  // it, and the gap row holds out a whole cycle longer so the pact row's turn isn't
  // answered underneath before it has finished.
  //
  // The lead counts in both: the sequence is offset by the boxes' trip and the closing,
  // so each turn is that much later than its bare place in the sequence.
  const midBlank = is2032 && (!isMatched || (settling && elapsed < lead));
  const gapBlank = is2032 && (!isMatched || (settling && elapsed < lead + gapOffset));

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
        {/* Three runs on one line, and every one of them a *parent* run: a `<tspan>`
            carrying visible glyphs under `dominant-baseline="central"` is dropped half
            a unit off the line its own text sits on, which at this size is a
            parenthetical visibly sagging away from the words before it. Nothing said
            on the tspan recovers it — `dominant-baseline: auto`, `inherit` and
            `alignment-baseline: baseline` all sag alike — because the shift is the
            parent's `central` being resolved a second time against the run's own
            baseline table. So the prefix is drawn alone, and each ending is its own
            text that walks the pen out to meet it. Same trick, same reason, as the
            drooping party letter on the count below. */}
        <text
          x={6}
          y={atMid(EQ_ROW_Y[1], SWELL_ROW_Y)}
          dominantBaseline="central"
          fontSize={atMid(EQ_LABEL_SIZE, PACT_SWELL_LABEL_SIZE)}
          fill="#888"
        >
          Minority Districts
        </text>
        <text
          x={6}
          y={atMid(EQ_ROW_Y[1], SWELL_ROW_Y)}
          dominantBaseline="central"
          fontSize={atMid(EQ_LABEL_SIZE, PACT_SWELL_LABEL_SIZE)}
          fill="#888"
          fillOpacity={midLabelWas === null ? 1 : 1 - midLabelWasOpacity}
        >
          {/* Advances the pen without painting anything, so an ending lands exactly
              where the prefix leaves off at any size the swell is passing through —
              and nothing has to measure the prefix to put it there. */}
          <tspan fill="none">{'Minority Districts '}</tspan>({midLabel})
        </text>
        {midLabelWas !== null && (
          <text
            x={6}
            y={atMid(EQ_ROW_Y[1], SWELL_ROW_Y)}
            dominantBaseline="central"
            fontSize={atMid(EQ_LABEL_SIZE, PACT_SWELL_LABEL_SIZE)}
            fill="#888"
            // Gone by the time the row is up: the rise is the row becoming something
            // else, so the two readings hand over across it.
            fillOpacity={midLabelWasOpacity}
          >
            <tspan fill="none">{'Minority Districts '}</tspan>({midLabelWas})
          </text>
        )}
        <AnimatedCount value={current} delay={midDelay} duration={duration}>
          {shown => (
            <text
              x={BOX_W - 6}
              // Stated outright, as on the header line. The figure and its party
              // letter are one run now — they were two while the letter was sized
              // separately, and `central` resolved per run against each run's own
              // baseline table, dropping the tspan half a device pixel below the
              // digits it belongs to: at this size a visibly drooping R.
              y={capBaseline(atMid(EQ_ROW_Y[1], SWELL_ROW_Y), midCountSize)}
              textAnchor="end"
              fontSize={midCountSize}
              fontWeight={700}
              fill={PARTY_COLORS[minorityParty]}
            >
              {midBlank ? '' : `${shown}${minorityParty}`}
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

/**
 * Puts the states in `pinned` at the head of their column, leaving everything below
 * in whatever order the ranking already gave it.
 *
 * This is what a sealed pact rides to the top on. The state that was clicked first
 * is already at the head of its own column — that is what clicking it did — but its
 * partner was picked out of the opposite column and could have come from anywhere
 * down it. Pinning both puts them level across the gutter for the length of the
 * linger, which is the only place the link between them can be drawn as one flat
 * line closing on itself, and the only arrangement that reads as two states meeting.
 *
 * There is exactly one pinned state per column, so the pair never has to be ordered
 * against itself and `next` decides everything that is actually a ranking.
 */
function headedBy(pinned: Set<string>, next: (a: StateData, b: StateData) => number) {
  return (a: StateData, b: StateData): number => {
    const pinnedA = pinned.has(a.id);
    if (pinnedA !== pinned.has(b.id)) return pinnedA ? -1 : 1;
    return next(a, b);
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
    const timeoutId = setTimeout(() => setSeal(null), PACT_LINGER_MS);
    return () => clearTimeout(timeoutId);
  }, [eraId, seal]);

  const layoutMatches = seal ? seal.matches : selectedMatches;
  const anchorId = seal ? seal.anchorId : activeStateId;

  /** The two states mid-linger, which head their columns until it lapses. */
  const sealedPair = useMemo(() => (seal ? new Set(seal.pair) : null), [seal]);

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

    const rank = anchorState ? byClosenessTo(anchorState, era) : bySize(era);
    // The pair mid-linger is not in `layoutMatches` yet, so it is still flowing —
    // and it goes to the top of both columns while its gaps count down.
    const order = sealedPair ? headedBy(sealedPair, rank) : rank;

    const planColumn = (states: StateData[]) => {
      return {
        flowing: states.filter(s => !matchedIds.has(s.id)).sort(order),
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
  }, [anchorState, era, leftStates, rightStates, layoutMatches, sealedPair]);

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
  //
  // The anchor and not the active state, so a sealed pact is followed too: the
  // click that seals one clears the active state but sends both partners to the top
  // of their columns, and the whole point of the linger is that it be watched.
  useEffect(() => {
    const placed = anchorId ? rowById.get(anchorId) : null;
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
  }, [anchorId, rowById]);

  /** Where a state sits on the underrepresentation ramp, for a gap it is carrying. */
  const underrepColorFor = (state: StateData, signedGap: number) => {
    const owed = era.minorityFairOf(state);
    return underrepColorScale(owed ? signedGap / owed : 0);
  };

  /**
   * The color a state's border wore before the pact now being sealed — which is its
   * baseline, since a box in a pact is inert and so cannot have been clicked into
   * another one. The sign is the column's: a D-drawn (or D-leaning) map is negative.
   *
   * This is what each half of a closing link is drawn in, so a half leaves its box
   * the color the box still is at that moment — the border only starts draining once
   * the boxes have arrived, which is also when the halves start out.
   */
  const preSealColorOf = (state: StateData) => {
    const size = era.gapSizeOf(state);
    return underrepColorFor(state, era.isDemocraticSide(state) ? -size : size);
  };

  /** The color a state's border wears now: what the pacts have left it at. */
  const borderColorOf = (state: StateData) => underrepColorFor(state, residualGaps[state.id] ?? 0);

  /**
   * The state at one end of a link: its own end's box, not whichever of the pair
   * happens to be stored first. A pact is `[anchor, partner]` in click order and the
   * anchor can be on either side, so the side is looked up rather than assumed.
   */
  const sideOf = (a: string, b: string, side: Column): StateData | undefined =>
    stateDataById[columnOf.get(a) === side ? a : b];

  /** What that end's half is drawn in, before its pact and after it. */
  const halfColorOf = (a: string, b: string, side: Column, after: boolean) => {
    const state = sideOf(a, b, side);
    if (!state) return EVEN_GRAY;
    return after ? borderColorOf(state) : preSealColorOf(state);
  };

  const renderStateBox = (state: StateData, index: number, column: Column, yOffset: number) => {
    const isActive = state.id === activeStateId;
    const isHovered = state.id === hoveredStateId;
    /** Mid-linger: sealed, at the head of its column, not yet parked. */
    const isSettling = !!seal?.pair.includes(state.id);
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
    // Everything right of the name hangs off the badge, so the name's budget moves
    // with the width of the lean. See HEADER_ABBREVIATIONS for what doesn't fit it.
    const pyramidX = badgeX - PYRAMID_GAP - PYRAMID_W;

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

    // The border reads the *residual* gap over the debt, so a pact drains its own
    // color: a state the pacts have made whole comes to rest on the neutral, and
    // one still owing more than half its share stays solid. Before any pact this is
    // the baseline — today's map on the 2026 board, and on the 2032 board the whole
    // minority share, since a clean sheet owes its minority all of it and has drawn
    // none of it. That is why the 2032 board opens at a flat solid on every box and
    // only acquires shading as it is pacted: the border is the one mark there with
    // anything to say before a pact, its lower two rows being blank by design.
    //
    const underrepColor = borderColorOf(state);

    return (
      <g
        key={state.id}
        className={
          `state-box ${isActive ? 'active' : ''} ${isMatched ? 'matched' : ''}` +
          `${isSettling ? ' settling' : ''}`
        }
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
          className="state-box-border"
          // Two marks on one stroke, kept apart so they can be read at once.
          //
          // **Color is the state's condition**: how far short its squeezed party
          // is, deep blue for a map that owes Republicans most of what it owes
          // them, deep red the other way, through EVEN_GRAY where a state is at
          // its proportional share. It is a fraction of the delegation, so the
          // depth is comparable between a state of 4 districts and one of 52.
          //
          // **Weight is the interface's own** — under the pointer, picked up and
          // looking for a partner, or holding the board through its linger — and it
          // thickens without touching the color, so a box can say "you have hold of
          // me" and "I am still four districts short" in the same breath. Black used
          // to carry the first of those and painted over the second, which cost most
          // exactly where the color had just changed: a sealed pact went black at the
          // moment its border had news.
          //
          // The weight goes when the box **leaves for "Your Pacts"**, not when the
          // pact is made. The linger is the one stretch the pair is meant to be
          // watched — that is what it exists for, and both boxes are at the head of
          // their columns with the link closing between them — so they hold the
          // emphasis right through it and give it up on the way down. Parked, they
          // are settled: the only move left is the ×, and the border is left saying
          // nothing but what the pact made of the state.
          // A sealing box holds the color it walked in with until the link's two
          // halves meet, and then fades to what the pact left it at. The wait is a
          // transition delay in App.css; the stroke here is the new color from the
          // click, which is what the delay holds off.
          stroke={underrepColor}
          strokeWidth={isActive || isHovered || isSettling ? 3 : 2}
          rx={BOX_R}
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
          transform={`translate(${pyramidX}, ${HEADER_MID_Y - PYRAMID_H / 2})`}
        >
          <ControlPyramid state={state} />
        </g>

        <g
          transform={
            `translate(${pyramidX - PYRAMID_GAP - routeBlockWidth(state)}, ` +
            `${HEADER_MID_Y - ROUTE_H / 2})`
          }
        >
          <RouteMarks state={state} />
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
          {headerName(state) !== state.name && <title>{state.name}</title>}
          {headerName(state)}
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
          settling={isSettling}
        />
      </g>
    );
  };

  return (
    <div className="bipartite-graph-wrapper">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_W} ${totalHeight}`}
        className="bipartite-graph"
        // The clock App.css needs, so neither file keeps its own copy of a figure the
        // other reads. A seal waits for the boxes to arrive (`--row-travel-ms`) and
        // closes the link across the gutter (`--seal-count-ms`). The colors the pact
        // left behind then come up on the first count — `--pact-count-ms` for when it
        // starts, `--seal-count-ms` again for how long it runs — on the link and on
        // both borders at once, and on the map's arc with them. Handed to CSS rather
        // than set on the elements so the reduced-motion block can cut it together.
        //
        // The closing carries no length with it: the halves declare `pathLength={1}`,
        // so the dash offset is a fraction and the keyframe needs to know nothing about
        // the gutter's width.
        style={
          {
            '--seal-count-ms': `${SEAL_COUNT_MS}ms`,
            '--row-travel-ms': `${ROW_TRAVEL_MS}ms`,
            '--pact-count-ms': `${PACT_COUNT_AT_MS}ms`,
          } as CSSProperties
        }
      >
        {/* Links first, so the boxes sit on top of where they meet. */}
        {/* The parked pacts, plus the one still lingering — that pair is not in
            `layoutMatches` yet, but it is at the head of both columns and its link
            is the mark that says so. Both phases carry the same key, so the pact
            keeps one element across them: it closes at the top of the board, then
            rides the same transform down to its place under "Your Pacts" when the
            linger lapses, instead of vanishing there and reappearing here. */}
        <g className="match-links">
          {[
            ...layoutMatches.map(pair => ({ pair, sealing: false })),
            ...(seal ? [{ pair: seal.pair, sealing: true }] : []),
          ].map(({ pair: [a, b], sealing }) => {
            const placedA = rowById.get(a);
            const placedB = rowById.get(b);
            if (!placedA || !placedB) return null;

            // Every pact spans the gutter, and both halves sit on the same row —
            // parked at the bottom, or level at the top mid-linger — so the link is
            // always flat and the whole fitting can ride a single transform. That's
            // what lets it travel with its boxes: a line's endpoints can't be
            // transitioned, but a transform can.
            const y = rowTopY(placedA.row, placedA.yOffset) + BOX_H / 2;
            return (
              <g
                key={[a, b].slice().sort().join('-')}
                className={sealing ? 'match-link sealing' : 'match-link'}
                style={{ transform: `translate(0px, ${y}px)` }}
              >
                {/* Two halves rather than one line, so a sealing pact can draw them
                    inward and have them meet in the middle — which is the picture the
                    whole board is of. Each is drawn from its own box's edge, so the
                    dash that hides it runs the right way without either half knowing
                    which side it is.

                    **The link is its two states, before and after.** A half closes in
                    the color its box wore walking in — that box's own depth on the
                    underrepresentation ramp, not a flat party red or blue — so what
                    reaches across the gutter is two gerrymanders and not an idea about
                    them. On meeting, the color each box has been left at comes up in
                    place, and that is what the link keeps. So a pact that disarmed both
                    partners rests on EVEN_GRAY the whole way across, which is the
                    ramp's own word for a state at its proportional share; one that only
                    got halfway leaves color on the side still short of it. The link
                    reads out what it bought.

                    That is four lines and not two — the before drawn in, the after laid
                    over it and faded up — because a stroke has one color and the change
                    has to happen without moving. They cover exactly, being the same
                    width and ends, so parked, with no animation on either, the after is
                    simply opaque and the before is hidden under it. */}
                <line
                  className="pact-half"
                  x1={LEFT_BOX_X + BOX_W}
                  y1={0}
                  x2={LINK_MID_X}
                  y2={0}
                  stroke={halfColorOf(a, b, 'left', false)}
                  strokeWidth={2}
                  strokeLinecap="round"
                  pathLength={1}
                />
                <line
                  className="pact-half"
                  x1={RIGHT_BOX_X}
                  y1={0}
                  x2={LINK_MID_X}
                  y2={0}
                  stroke={halfColorOf(a, b, 'right', false)}
                  strokeWidth={2}
                  strokeLinecap="round"
                  pathLength={1}
                />
                <line
                  className="pact-fade"
                  x1={LEFT_BOX_X + BOX_W}
                  y1={0}
                  x2={LINK_MID_X}
                  y2={0}
                  stroke={halfColorOf(a, b, 'left', true)}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
                <line
                  className="pact-fade"
                  x1={RIGHT_BOX_X}
                  y1={0}
                  x2={LINK_MID_X}
                  y2={0}
                  stroke={halfColorOf(a, b, 'right', true)}
                  strokeWidth={2}
                  strokeLinecap="round"
                />

                {/* Dissolving the pact is a property of the pair, not of either
                    state, so the control sits on the link that joins them. It waits
                    for the linger: until then the pact is still being made, and there
                    is nothing to take back yet. */}
                {!sealing && (
                  <g
                    className="pact-remove"
                    transform={`translate(${LINK_MID_X}, 0)`}
                    onClick={e => {
                      e.stopPropagation();
                      setActiveStateId(null);
                      // A parked box takes no pointer events, so one that was hovered
                      // when it parked never got its `leave`. Freed here, it would
                      // rejoin the flowing rows still wearing the emphasis it had.
                      setHoveredStateId(null);
                      setSeal(null);
                      onToggleMatch([a, b]);
                    }}
                  >
                    <title>Break this pact</title>
                    <circle r={REMOVE_R} fill="white" stroke={GAP_ORANGE} strokeWidth={1.5} />
                    <path
                      d={`M${-REMOVE_TICK} ${-REMOVE_TICK}L${REMOVE_TICK} ${REMOVE_TICK}
                          M${REMOVE_TICK} ${-REMOVE_TICK}L${-REMOVE_TICK} ${REMOVE_TICK}`}
                      stroke={GAP_ORANGE}
                      strokeWidth={1.5}
                      strokeLinecap="round"
                    />
                  </g>
                )}
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
