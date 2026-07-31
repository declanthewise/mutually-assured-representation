import { useEffect, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { StateData, MatchPair } from '../types';
import { baselineGaps } from '../data/computeRepresentationGap';
import { stateSafeSeats } from '../data/districtLeans';
import { stateData } from '../data/stateData';
import { AnimatedCount } from './AnimatedCount';

/** Single-district states have no map to draw, so they never enter a pact. */
export const matchableStates = stateData.filter(s => s.districts2022 >= 2);
export const matchFootnote =
  'Note: Columns follow each state\'s own partisan lean, since it is the state government that would sign a pact. ' +
  'A pact only returns seats where the two maps are gerrymandered in opposite directions — states already at zero, ' +
  'or the rare state whose map favors the party it does not lean toward, can still pair off pre-emptively for no gain today. ' +
  'Single-district states Alaska, Delaware, North Dakota, South Dakota, Vermont and Wyoming are omitted as they have no representation gap.';

interface BipartiteMatchGraphProps {
  selectedMatches: MatchPair[];
  onToggleMatch: (pair: MatchPair) => void;
  residualGaps: Record<string, number>;
  footnote?: string;
}

const leanColorScale = d3.scaleLinear<string>()
  .domain([-20, 0, 20])
  .range(['#c93135', '#f0f0f0', '#2e6da4'])
  .clamp(true);

const greenGoldScale = d3.scaleLinear<string>()
  .domain([0, 1])
  .range(['#4caf50', '#e8a832'])
  .clamp(true);

const BOX_W = 116;
const BOX_H = 54;
const ROW_GAP = 6;
const ROW_H = BOX_H + ROW_GAP;
const HEADER_HEIGHT = 19;

const LEFT_BOX_X = 20;
const COL_GAP = 28;
const RIGHT_BOX_X = LEFT_BOX_X + BOX_W + COL_GAP;
const VIEW_W = RIGHT_BOX_X + BOX_W + LEFT_BOX_X;

const COLUMN_LABEL_Y = 12;
const TOP_PAD = 26;
const BOTTOM_PAD = 10;

const MATCH_GOLD = '#c9a227';

type Column = 'left' | 'right';

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
  footnote,
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

  // The column opposite the active state re-ranks by closest representation gap;
  // everything else stays in delegation-size order.
  const { leftOrder, rightOrder } = useMemo(() => {
    const activeColumn = activeState ? columnOf.get(activeState.id) : null;
    const left = leftStates.slice();
    const right = rightStates.slice();

    left.sort(activeState && activeColumn === 'right' ? byClosenessTo(activeState) : bySize);
    right.sort(activeState && activeColumn === 'left' ? byClosenessTo(activeState) : bySize);

    return { leftOrder: left, rightOrder: right };
  }, [activeState, columnOf, leftStates, rightStates]);

  const rowCount = Math.max(leftOrder.length, rightOrder.length);
  const totalHeight = TOP_PAD + rowCount * ROW_H - ROW_GAP + BOTTOM_PAD;

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

  const renderStateBox = (state: StateData, index: number, column: Column) => {
    const isActive = state.id === activeStateId;
    const partner = partnerById.get(state.id);
    const isMatched = !!partner;
    const partisanColor = leanColorScale(state.partisanLean);
    const leanTextColor = Math.abs(state.partisanLean) > 10 ? '#fff' : '#333';
    const isLeft = column === 'left';

    const boxX = isLeft ? LEFT_BOX_X : RIGHT_BOX_X;
    const boxY = TOP_PAD + index * ROW_H;

    const leanText = formatLean(state.partisanLean);
    const badgeW = leanText.length * 5.5 + 8;
    const badgeH = 13;
    // Left column reads name→badge, right column mirrors it
    const badgeX = isLeft ? BOX_W - 5 - badgeW : 5;
    const nameX = isLeft ? 6 : BOX_W - 6;
    const nameAnchor = isLeft ? 'start' : 'end';

    const enacted = stateSafeSeats[state.id];
    const repGapSeats = Math.abs(residualGaps[state.id] ?? 0);
    const safeSeats = enacted?.safeSeats ?? 0;

    const tagLabel = partner ? `✓ ${partner.id}` : '';
    const tagW = tagLabel.length * 5.5 + 10;

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
          stroke={isActive ? '#000' : isMatched ? MATCH_GOLD : partisanColor}
          strokeWidth={isActive ? 3 : isMatched ? 2.5 : 2}
          rx={3}
        />
        {isMatched && (
          <rect
            x={-2}
            y={-2}
            width={BOX_W + 4}
            height={BOX_H + 4}
            fill="none"
            stroke={MATCH_GOLD}
            strokeWidth={2}
            rx={4}
            opacity={0.6}
          />
        )}

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

        {enacted && (
          <>
            <text x={6} y={HEADER_HEIGHT + 11} textAnchor="start" dominantBaseline="central" fontSize={9} fontWeight={600}>
              <tspan fill={greenGoldScale(repGapSeats / 8)} fontWeight={700} fontSize={11}>
                <AnimatedCount value={repGapSeats} />
              </tspan>
              <tspan fill="#666" letterSpacing="0.5"> REP. GAP &</tspan>
            </text>
            <text x={6} y={HEADER_HEIGHT + 24} textAnchor="start" dominantBaseline="central" fontSize={9} fontWeight={600}>
              <tspan fill={greenGoldScale(safeSeats / state.districts2022)} fontWeight={700} fontSize={11}>
                <AnimatedCount value={safeSeats} />
              </tspan>
              <tspan fill="#666" letterSpacing="0.5"> SAFE SEATS</tspan>
            </text>
          </>
        )}

        {partner && (
          <>
            <rect
              x={BOX_W - 6 - tagW}
              y={BOX_H - 5 - 12}
              width={tagW}
              height={12}
              fill={MATCH_GOLD}
              rx={2.5}
            />
            <text
              x={BOX_W - 6 - tagW / 2}
              y={BOX_H - 5 - 6}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={8.5}
              fontWeight={700}
              fill="#fff"
            >
              {tagLabel}
            </text>
          </>
        )}
      </g>
    );
  };

  return (
    <div className="bipartite-graph-wrapper">
      <div className="graph-instruction">
        {activeState
          ? `Click a state on the ${columnOf.get(activeState.id) === 'left' ? 'right' : 'left'} to form a pact with ${activeState.name}`
          : 'Click a state to rank the other column by closest representation gap'}
      </div>
      <svg viewBox={`0 0 ${VIEW_W} ${totalHeight}`} className="bipartite-graph">
        <text x={LEFT_BOX_X} y={COLUMN_LABEL_Y} fontSize={9} fontWeight={700} fill="#999" letterSpacing="0.08em">
          DEMOCRATIC-LEANING
        </text>
        <text
          x={RIGHT_BOX_X + BOX_W}
          y={COLUMN_LABEL_Y}
          textAnchor="end"
          fontSize={9}
          fontWeight={700}
          fill="#999"
          letterSpacing="0.08em"
        >
          REPUBLICAN-LEANING
        </text>

        <g className="left-column">
          {leftOrder.map((state, i) => renderStateBox(state, i, 'left'))}
        </g>
        <g className="right-column">
          {rightOrder.map((state, i) => renderStateBox(state, i, 'right'))}
        </g>
      </svg>
      {footnote && <p className="graph-footnote">{footnote}</p>}
    </div>
  );
}
