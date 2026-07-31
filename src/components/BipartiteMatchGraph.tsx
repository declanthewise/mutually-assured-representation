import { useEffect, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { StateData, MatchPair } from '../types';
import { FAIR_GREEN, GAP_GOLD, LEAN_DOMAIN, LEAN_RANGE } from '../colors';
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

/** Fair at zero, gold as the gap widens — 0 is a state already at its share. */
const gapScale = d3.scaleLinear<string>()
  .domain([0, 1])
  .range([FAIR_GREEN, GAP_GOLD])
  .clamp(true);

const BOX_W = 116;
const BOX_H = 60;
const ROW_GAP = 6;
const ROW_H = BOX_H + ROW_GAP;
const HEADER_HEIGHT = 19;

/** Baselines of the three equation rows, and the rule above the total. */
const EQ_ROW_Y = [29, 40, 52];
const EQ_RULE_Y = 46;

const LEFT_BOX_X = 20;
const COL_GAP = 28;
const RIGHT_BOX_X = LEFT_BOX_X + BOX_W + COL_GAP;
const VIEW_W = RIGHT_BOX_X + BOX_W + LEFT_BOX_X;

const TOP_PAD = 8;
const BOTTOM_PAD = 14;
/** Room above the parked block: its "Your Pacts" heading, plus a little air. */
const PACT_HEADER_H = 30;

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

  const renderStateBox = (state: StateData, index: number, column: Column, yOffset: number) => {
    const isActive = state.id === activeStateId;
    const partner = partnerById.get(state.id);
    const isMatched = !!partner;
    const partisanColor = leanColorScale(state.partisanLean);
    const leanTextColor = Math.abs(state.partisanLean) > 10 ? '#fff' : '#333';
    const isLeft = column === 'left';

    const boxX = isLeft ? LEFT_BOX_X : RIGHT_BOX_X;
    const boxY = rowTopY(index, yOffset);

    const leanText = formatLean(state.partisanLean);
    const badgeW = leanText.length * 5.5 + 8;
    const badgeH = 13;
    // Left column reads name→badge, right column mirrors it
    const badgeX = isLeft ? BOX_W - 5 - badgeW : 5;
    const nameX = isLeft ? 6 : BOX_W - 6;
    const nameAnchor = isLeft ? 'start' : 'end';

    // The equation the box spells out: where the delegation sits now, less
    // where the state's own PVI says it should sit, leaves the gap. "Now" moves
    // with the pacts, so it's derived from the residual rather than the enacted
    // count — before any pact the two are the same.
    const proportionalR = proportionalRSeats(state);
    const signedGap = residualGaps[state.id] ?? 0;
    const currentR = proportionalR + signedGap;

    // A state's balances read in its own party's seats, matching its column.
    // EVEN districts belong to neither side, so they sit outside both figures —
    // which is also what keeps the subtraction landing exactly on the gap.
    const balanceParty = state.partisanLean > 0 ? 'D' : 'R';
    const assignable = state.districts2022 - (stateSafeSeats[state.id]?.even ?? 0);
    const currentBalance = balanceParty === 'D' ? assignable - currentR : currentR;
    const proportionalBalance = balanceParty === 'D' ? assignable - proportionalR : proportionalR;

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

        {/* Delegation size, on the outer edge of the column */}
        <text
          x={isLeft ? -6 : BOX_W + 6}
          y={BOX_H / 2}
          textAnchor={isLeft ? 'end' : 'start'}
          dominantBaseline="central"
          fontSize={10}
          fill="#999"
        >
          {state.districts2022}
        </text>

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
          fontSize={9}
          fill={leanTextColor}
          fontWeight={600}
        >
          {leanText}
        </text>
        <text
          x={nameX}
          y={10}
          textAnchor={nameAnchor}
          dominantBaseline="central"
          fontSize={10}
          fill="#333"
          fontWeight={isActive ? 600 : 500}
        >
          {state.name}
        </text>

        {/* Current − Proportional = Gap, read top to bottom. */}
        <text x={6} y={EQ_ROW_Y[0]} dominantBaseline="central" fontSize={7} fill="#888">
          Current Balance
        </text>
        <text
          x={BOX_W - 6} y={EQ_ROW_Y[0]}
          textAnchor="end" dominantBaseline="central"
          fontSize={9} fontWeight={700} fill="#333"
        >
          <AnimatedCount value={currentBalance} />{balanceParty}
        </text>

        <text x={6} y={EQ_ROW_Y[1]} dominantBaseline="central" fontSize={7} fill="#888">
          &minus; Proportional Balance
        </text>
        <text
          x={BOX_W - 6} y={EQ_ROW_Y[1]}
          textAnchor="end" dominantBaseline="central"
          fontSize={9} fontWeight={700} fill="#333"
        >
          {proportionalBalance}{balanceParty}
        </text>

        <line
          x1={6}
          y1={EQ_RULE_Y}
          x2={BOX_W - 6}
          y2={EQ_RULE_Y}
          stroke="rgba(0,0,0,0.15)"
          strokeWidth={0.5}
        />

        <text x={6} y={EQ_ROW_Y[2]} dominantBaseline="central" fontSize={7} fill="#888">
          = Representation Gap
        </text>
        <text
          x={BOX_W - 6} y={EQ_ROW_Y[2]}
          textAnchor="end" dominantBaseline="central"
          fontSize={9.5} fontWeight={700}
          fill={gapScale(Math.abs(signedGap) / 8)}
        >
          <AnimatedCount value={Math.abs(signedGap)} />
        </text>
      </g>
    );
  };

  return (
    <div className="bipartite-graph-wrapper">
      <svg viewBox={`0 0 ${VIEW_W} ${totalHeight}`} className="bipartite-graph">
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
            <line
              x1={LEFT_BOX_X}
              x2={RIGHT_BOX_X + BOX_W}
              y1={rowTopY(pactHeader.startRow, PACT_HEADER_H) - 16}
              y2={rowTopY(pactHeader.startRow, PACT_HEADER_H) - 16}
              stroke={FAIR_GREEN}
              strokeWidth={0.75}
              opacity={0.3}
            />
            <text
              x={VIEW_W / 2}
              y={rowTopY(pactHeader.startRow, PACT_HEADER_H) - 6}
              textAnchor="middle"
              fontSize={9}
              fontWeight={700}
              letterSpacing="0.1em"
              fill={FAIR_GREEN}
            >
              YOUR PACTS
            </text>
          </g>
        )}

        <g className="left-column">
          {leftPlacements.map(({ state, row, yOffset }) =>
            renderStateBox(state, row, 'left', yOffset),
          )}
        </g>
        <g className="right-column">
          {rightPlacements.map(({ state, row, yOffset }) =>
            renderStateBox(state, row, 'right', yOffset),
          )}
        </g>
      </svg>
    </div>
  );
}
