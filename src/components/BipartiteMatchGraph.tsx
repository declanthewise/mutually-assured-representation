import { useEffect, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { StateData, MatchPair } from '../types';
import { DIVIDER_GRAY, FAIR_GREEN, GAP_GOLD, LEAN_DOMAIN, LEAN_RANGE, PARTY_COLORS } from '../colors';
import { baselineGaps, proportionalRSeats } from '../data/computeRepresentationGap';
import { stateSafeSeats } from '../data/districtLeans';
import { stateData } from '../data/stateData';
import { AnimatedCount } from './AnimatedCount';

/** Single-district states have no map to draw, so they never enter a pact. */
export const matchableStates = stateData.filter(s => s.districts2022 >= 2);

interface BipartiteMatchGraphProps {
  selectedMatches: MatchPair[];
  onToggleMatch: (pair: MatchPair) => void;
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

/** Baselines of the three equation rows, and the rule above the total. */
const EQ_ROW_Y = [29, 40, 52];
const EQ_RULE_Y = 46;

const LEFT_BOX_X = 12;
const COL_GAP = 28;
const RIGHT_BOX_X = LEFT_BOX_X + BOX_W + COL_GAP;
const VIEW_W = RIGHT_BOX_X + BOX_W + LEFT_BOX_X;

/**
 * Both section rules — the one splitting the map from the columns, and the one
 * above "Your Pacts" — are the same divider: 160px wide, 1px, 24px of air on
 * each side. They're drawn in a viewBox that renders at `max-width: 420px`,
 * so the px figures convert at that scale.
 */
const UNITS_PER_PX = VIEW_W / 420;
const RULE_W = 160 * UNITS_PER_PX;
const RULE_PAD = 24 * UNITS_PER_PX;
const RULE_STROKE = 1 * UNITS_PER_PX;

/** The top rule sits flush with the viewBox edge; its air above is CSS margin. */
const TOP_RULE_Y = RULE_STROKE / 2;
const TOP_PAD = TOP_RULE_Y + RULE_PAD;
const BOTTOM_PAD = 14;

/**
 * The heading under the pact rule. Spacing is measured to the top of its ink,
 * not its em box — Source Sans 3 caps fill 0.66em, and the ~3.5 units of slack
 * above them would otherwise read as extra air under the rule.
 */
const PACT_LABEL_SIZE = 9;
const PACT_LABEL_CAP = PACT_LABEL_SIZE * 0.66;
const PACT_LABEL_GAP = 14;

/** Room above the parked block: the rule, its padding, and that heading. */
const PACT_HEADER_H = RULE_PAD * 2 + PACT_LABEL_CAP + PACT_LABEL_GAP - ROW_GAP;

type Column = 'left' | 'right';

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


/** Seats the enacted map denies the minority party — the number shown on each box. */
function repGapOf(state: StateData): number {
  return Math.abs(baselineGaps[state.id] ?? 0);
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

/** The section rule, centered on the columns. Both dividers are this line. */
function sectionRule(y: number) {
  return (
    <line
      x1={(VIEW_W - RULE_W) / 2}
      x2={(VIEW_W + RULE_W) / 2}
      y1={y}
      y2={y}
      stroke={DIVIDER_GRAY}
      strokeWidth={RULE_STROKE}
    />
  );
}

function bySize(a: StateData, b: StateData): number {
  return b.districts2022 - a.districts2022 || a.name.localeCompare(b.name);
}

/** Closest representation gap first; ties broken by closest delegation size. */
function byClosenessTo(target: StateData) {
  const targetGap = repGapOf(target);
  return (a: StateData, b: StateData): number => {
    const gapDiff = Math.abs(repGapOf(a) - targetGap) - Math.abs(repGapOf(b) - targetGap);
    if (gapDiff !== 0) return gapDiff;
    const sizeDiff =
      Math.abs(a.districts2022 - target.districts2022) -
      Math.abs(b.districts2022 - target.districts2022);
    if (sizeDiff !== 0) return sizeDiff;
    return bySize(a, b);
  };
}

export function BipartiteMatchGraph({
  selectedMatches,
  onToggleMatch,
  residualGaps,
}: BipartiteMatchGraphProps) {
  const [activeStateId, setActiveStateId] = useState<string | null>(null);

  /** stateId → the state it is currently paired with */
  const partnerById = useMemo(() => {
    const map = new Map<string, StateData>();
    const byId = new Map(matchableStates.map(s => [s.id, s]));
    for (const [a, b] of selectedMatches) {
      const stateA = byId.get(a);
      const stateB = byId.get(b);
      if (stateA && stateB) {
        map.set(a, stateB);
        map.set(b, stateA);
      }
    }
    return map;
  }, [selectedMatches]);

  // Sides follow the state's own partisan lean, because it's the state government
  // that signs a pact — not its congressional delegation. Usually the map leans the
  // same way the state does; where it doesn't (Nevada, R+1 but D-gerrymandered) the
  // pairing is still allowed but returns no seats, since both sides would be handing
  // seats to the same party. See pactSeatsReturned().
  const { leftStates, rightStates, columnOf } = useMemo(() => {
    const left: StateData[] = [];
    const right: StateData[] = [];
    const column = new Map<string, Column>();

    for (const state of matchableStates) {
      if (state.partisanLean > 0) {
        left.push(state);
        column.set(state.id, 'left');
      } else {
        right.push(state);
        column.set(state.id, 'right');
      }
    }

    return { leftStates: left, rightStates: right, columnOf: column };
  }, []);

  const activeState = useMemo(
    () => (activeStateId ? matchableStates.find(s => s.id === activeStateId) ?? null : null),
    [activeStateId],
  );

  // Matched states leave the running order for good and park at the bottom,
  // both partners on the same row so their link runs flat. Only the unmatched
  // half of a column re-ranks against the active state.
  const { leftPlacements, rightPlacements, rowCount, pactHeader } = useMemo(() => {
    const activeColumn = activeState ? columnOf.get(activeState.id) : null;
    const matchedIds = new Set(partnerById.keys());
    const pactIndexOf = new Map<string, number>();
    selectedMatches.forEach(([a, b], i) => {
      pactIndexOf.set(a, i);
      pactIndexOf.set(b, i);
    });

    const planColumn = (states: StateData[], column: Column) => {
      const isRanking = !!activeState && activeColumn !== column;
      return {
        flowing: states
          .filter(s => !matchedIds.has(s.id))
          .sort(isRanking ? byClosenessTo(activeState) : bySize),
        // Pact order, so both columns park their halves in the same sequence.
        parked: states
          .filter(s => matchedIds.has(s.id))
          .sort((x, y) => (pactIndexOf.get(x.id) ?? 0) - (pactIndexOf.get(y.id) ?? 0)),
      };
    };

    const left = planColumn(leftStates, 'left');
    const right = planColumn(rightStates, 'right');
    const rows = Math.max(
      left.flowing.length + left.parked.length,
      right.flowing.length + right.parked.length,
    );

    const headed = selectedMatches.length > 0;
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
      pactHeader: headed ? { startRow: rows - selectedMatches.length } : null,
    };
  }, [activeState, columnOf, leftStates, rightStates, partnerById, selectedMatches]);

  const totalHeight =
    TOP_PAD + rowCount * ROW_H - ROW_GAP + BOTTOM_PAD + (pactHeader ? PACT_HEADER_H : 0);

  /** Where each state landed, so the links know which rows to span. */
  const rowById = useMemo(() => {
    const map = new Map<string, { row: number; yOffset: number; column: Column }>();
    for (const { state, row, yOffset } of leftPlacements) {
      map.set(state.id, { row, yOffset, column: 'left' });
    }
    for (const { state, row, yOffset } of rightPlacements) {
      map.set(state.id, { row, yOffset, column: 'right' });
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
    // Opposite side — seal the pact (overriding either state's previous one)
    onToggleMatch([activeStateId, state.id]);
    setActiveStateId(null);
  };

  const rowTopY = (row: number, yOffset: number) => TOP_PAD + row * ROW_H + yOffset;

  /** Top of the first parked pact — everything in the heading hangs off it. */
  const pactTopY = pactHeader ? rowTopY(pactHeader.startRow, PACT_HEADER_H) : 0;

  const renderStateBox = (state: StateData, index: number, column: Column, yOffset: number) => {
    const isActive = state.id === activeStateId;
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

    // The equation the box spells out: where the delegation sits now, less
    // where the state's own PVI says it should sit, leaves the gap. "Now" moves
    // with the pacts, so it's derived from the residual rather than the enacted
    // count — before any pact the two are the same.
    const proportionalR = proportionalRSeats(state);
    const signedGap = residualGaps[state.id] ?? 0;
    const currentR = proportionalR + signedGap;

    // EVEN districts belong to neither side, so they sit outside both party
    // counts — which is what keeps the subtraction landing exactly on the gap.
    const assignable = state.districts2022 - (stateSafeSeats[state.id]?.even ?? 0);

    // Only the minority party's districts are shown: the side the enacted map
    // squeezes. Which party that is follows the state's own lean, matching the
    // column, so the two rows always read in the same party.
    const minorityParty = isLeft ? 'R' : 'D';
    const minorityOf = (rSeats: number) => (isLeft ? rSeats : assignable - rSeats);

    const seatCount = (y: number, value: React.ReactNode) => (
      <text
        x={BOX_W - 6} y={y}
        textAnchor="end" dominantBaseline="central"
        fontSize={9} fontWeight={700} fill={PARTY_COLORS[minorityParty]}
      >
        {value}{minorityParty}
      </text>
    );

    return (
      <g
        key={state.id}
        className={`state-box ${isActive ? 'active' : ''} ${isMatched ? 'matched' : ''}`}
        style={{ transform: `translate(${boxX}px, ${boxY}px)` }}
        onClick={e => handleStateClick(state, e)}
      >
        <rect x={0} y={0} width={BOX_W} height={BOX_H} fill="white" rx={3} />
        <rect
          x={0}
          y={0}
          width={BOX_W}
          height={BOX_H}
          fill="none"
          stroke={isActive ? '#000' : isMatched ? FAIR_GREEN : partisanColor}
          strokeWidth={isActive ? 3 : isMatched ? 2.5 : 2}
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

        <rect x={badgeX} y={10 - badgeH / 2} width={badgeW} height={badgeH} fill={partisanColor} rx={2.5} />
        <text
          x={badgeX + badgeW / 2}
          y={10}
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
          y={10}
          dominantBaseline="central"
          fontSize={9.5}
          fill="#333"
          fontWeight={isActive ? 600 : 500}
        >
          {state.name}
          <tspan dx={3} fontSize={8.5} fontWeight={500} fill="#999">
            ({state.districts2022})
          </tspan>
        </text>

        {/* Where the state's PVI says the delegation should sit, where it does,
            and the gap between them — read top to bottom. */}
        <text x={6} y={EQ_ROW_Y[0]} dominantBaseline="central" fontSize={7} fill="#888">
          Fair Minority Districts
        </text>
        {seatCount(EQ_ROW_Y[0], minorityOf(proportionalR))}

        <text x={6} y={EQ_ROW_Y[1]} dominantBaseline="central" fontSize={7} fill="#888">
          2026 Minority Districts
        </text>
        {seatCount(EQ_ROW_Y[1], <AnimatedCount value={minorityOf(currentR)} />)}

        <line
          x1={6}
          y1={EQ_RULE_Y}
          x2={BOX_W - 6}
          y2={EQ_RULE_Y}
          stroke="rgba(0,0,0,0.15)"
          strokeWidth={0.5}
        />

        <text x={6} y={EQ_ROW_Y[2]} dominantBaseline="central" fontSize={7} fill="#888">
          Representation Gap
        </text>
        <text
          x={BOX_W - 6} y={EQ_ROW_Y[2]}
          textAnchor="end" dominantBaseline="central"
          fontSize={9.5} fontWeight={700}
          fill={signedGap === 0 ? FAIR_GREEN : GAP_GOLD}
        >
          <AnimatedCount value={Math.abs(signedGap)} />
        </text>
      </g>
    );
  };

  return (
    <div className="bipartite-graph-wrapper">
      <svg viewBox={`0 0 ${VIEW_W} ${totalHeight}`} className="bipartite-graph">
        {/* The break from the map above — same rule as the pact heading's. */}
        {sectionRule(TOP_RULE_Y)}

        {/* Links first, so the boxes sit on top of where they meet. */}
        <g className="match-links">
          {selectedMatches.map(([a, b]) => {
            const placedA = rowById.get(a);
            const placedB = rowById.get(b);
            if (!placedA || !placedB) return null;
            const [onLeft, onRight] = placedA.column === 'left' ? [placedA, placedB] : [placedB, placedA];
            return (
              <line
                key={[a, b].slice().sort().join('-')}
                x1={LEFT_BOX_X + BOX_W}
                y1={rowTopY(onLeft.row, onLeft.yOffset) + BOX_H / 2}
                x2={RIGHT_BOX_X}
                y2={rowTopY(onRight.row, onRight.yOffset) + BOX_H / 2}
                stroke={FAIR_GREEN}
                strokeWidth={2}
                strokeLinecap="round"
              />
            );
          })}
        </g>

        {pactHeader && (
          <g className="pact-heading">
            {sectionRule(pactTopY - (RULE_PAD + PACT_LABEL_CAP + PACT_LABEL_GAP))}
            <text
              x={VIEW_W / 2}
              y={pactTopY - PACT_LABEL_GAP}
              textAnchor="middle"
              fontSize={PACT_LABEL_SIZE}
              fontWeight={700}
              letterSpacing="0.1em"
              fill={FAIR_GREEN}
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
