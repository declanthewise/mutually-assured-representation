import { useEffect, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { StateData, MatchPair } from '../types';
import { findMatches, getMinoritySeatGain } from '../utils/findMatches';
import { stateSafeSeats } from '../data/districtData/safeSeats';
import { alternateMapSafeSeats } from '../data/districtData/alternateMapLeans';
import type { SafeSeatCounts } from '../data/districtData/safeSeats';

interface BipartiteMatchGraphProps {
  groupStates: StateData[];
  selectedMatches: MatchPair[];
  onToggleMatch: (pair: MatchPair) => void;
}

const leanColorScale = d3.scaleLinear<string>()
  .domain([-20, 0, 20])
  .range(['#c93135', '#f0f0f0', '#2e6da4'])
  .clamp(true);

function getPartisanColor(state: StateData): string {
  return leanColorScale(state.partisanLean);
}

interface PositionedState {
  state: StateData;
  y: number;
  boxHeight: number;
}

interface MatchLine {
  fromState: StateData;
  toState: StateData;
  fromY: number;
  toY: number;
  fromX: number;
  toX: number;
}

const BOX_WIDTH = 110;
const HEADER_HEIGHT = 19;
const SQUARE_SIZE = 5;
const SQUARE_GAP = 0.5;
const SQUARE_PITCH = SQUARE_SIZE + SQUARE_GAP;
const CATEGORY_GAP = 5;
const INNER_GAP = 3;
const LEFT_X = 145;
const RIGHT_X = 235;

function getMaxRows(districts: number): number {
  return Math.max(2, Math.round(Math.sqrt(districts * 0.5)));
}

function getBoxHeight(districts: number): number {
  const maxRows = getMaxRows(districts);
  const squaresHeight = maxRows * SQUARE_PITCH - SQUARE_GAP;
  return HEADER_HEIGHT + squaresHeight + 4;
}

function formatLean(lean: number): string {
  if (lean === 0) return 'EVEN';
  const dir = lean > 0 ? 'D' : 'R';
  return `${dir}+${Math.abs(lean).toFixed(0)}%`;
}

// Match ratings bar colors exactly
const CATEGORY_COLORS = {
  safeD: '#2e6da4',
  leanD: '#6a9dc9',
  even: '#d0d0d0',
  leanR: '#d97a7c',
  safeR: '#c93135',
};

const EDGE_PAD = 4;

function gw(count: number, maxRows: number): number {
  return Math.ceil(count / maxRows) * SQUARE_PITCH - SQUARE_GAP;
}

/**
 * Render merged enacted + alternate seat squares within a single group.
 * For each category, the group size is max(enacted, alt).
 * - Enacted squares: solid fill
 * - Extra alt squares (alt > enacted): white fill, colored border (appended)
 * - Lost enacted squares (enacted > alt): solid fill with white X overlay
 */
function renderMergedSeatSquares(
  enacted: SafeSeatCounts,
  alt: SafeSeatCounts,
  boxX: number,
  y: number,
  maxRows: number,
  boxHeight: number,
): JSX.Element {
  const squaresBottom = y + boxHeight - 2;
  const elements: JSX.Element[] = [];

  const renderGroup = (
    enCount: number,
    altCount: number,
    color: string,
    startX: number,
    key: string,
  ) => {
    const total = Math.max(enCount, altCount);
    for (let i = 0; i < total; i++) {
      const col = Math.floor(i / maxRows);
      const rowFromBottom = i % maxRows;
      const sx = startX + col * SQUARE_PITCH;
      const sy = squaresBottom - SQUARE_SIZE - rowFromBottom * SQUARE_PITCH;

      if (i < enCount) {
        // Enacted square (solid)
        elements.push(
          <rect key={`${key}-${i}`} x={sx} y={sy}
            width={SQUARE_SIZE} height={SQUARE_SIZE} fill={color} />,
        );
        // X mark if this enacted seat is lost in the alt map
        if (i >= altCount) {
          const pad = 0.5;
          elements.push(
            <line key={`${key}-x1-${i}`}
              x1={sx + pad} y1={sy + pad}
              x2={sx + SQUARE_SIZE - pad} y2={sy + SQUARE_SIZE - pad}
              stroke="white" strokeWidth={1} />,
            <line key={`${key}-x2-${i}`}
              x1={sx + SQUARE_SIZE - pad} y1={sy + pad}
              x2={sx + pad} y2={sy + SQUARE_SIZE - pad}
              stroke="white" strokeWidth={1} />,
          );
        }
      } else {
        // Extra alt square (inverted: white fill, colored border)
        elements.push(
          <rect key={`${key}-${i}`} x={sx} y={sy}
            width={SQUARE_SIZE} height={SQUARE_SIZE}
            fill="white" stroke={color} strokeWidth={0.75} />,
        );
      }
    }
  };

  // Use max counts for positioning so groups have room for both maps
  const maxSafeD = Math.max(enacted.safeD, alt.safeD);
  const maxLeanD = Math.max(enacted.leanD, alt.leanD);
  const maxEven = Math.max(enacted.even, alt.even);
  const maxLeanR = Math.max(enacted.leanR, alt.leanR);
  const maxSafeR = Math.max(enacted.safeR, alt.safeR);

  // Left: safeD then leanD
  let leftX = boxX + EDGE_PAD;
  if (maxSafeD > 0) {
    renderGroup(enacted.safeD, alt.safeD, CATEGORY_COLORS.safeD, leftX, 'sd');
    leftX += gw(maxSafeD, maxRows) + CATEGORY_GAP;
  }
  let leanDRight = leftX;
  if (maxLeanD > 0) {
    renderGroup(enacted.leanD, alt.leanD, CATEGORY_COLORS.leanD, leftX, 'ld');
    leanDRight = leftX + gw(maxLeanD, maxRows);
  }

  // Right: safeR then leanR (from the right edge inward)
  let rightX = boxX + BOX_WIDTH - EDGE_PAD;
  if (maxSafeR > 0) {
    rightX -= gw(maxSafeR, maxRows);
    renderGroup(enacted.safeR, alt.safeR, CATEGORY_COLORS.safeR, rightX, 'sr');
    rightX -= CATEGORY_GAP;
  }
  let leanRLeft = rightX;
  if (maxLeanR > 0) {
    rightX -= gw(maxLeanR, maxRows);
    renderGroup(enacted.leanR, alt.leanR, CATEGORY_COLORS.leanR, rightX, 'lr');
    leanRLeft = rightX;
  }

  // Even: centered between leanD right edge and leanR left edge
  if (maxEven > 0) {
    const w = gw(maxEven, maxRows);
    const midpoint = (leanDRight + leanRLeft) / 2;
    renderGroup(enacted.even, alt.even, CATEGORY_COLORS.even, midpoint - w / 2, 'ev');
  }

  return <g>{elements}</g>;
}

function pairKey(a: string, b: string): string {
  return [a, b].sort().join('-');
}

export function BipartiteMatchGraph({
  groupStates,
  selectedMatches,
  onToggleMatch,
}: BipartiteMatchGraphProps) {
  const [activeStateId, setActiveStateId] = useState<string | null>(null);

  const getDistricts = (state: StateData) => state.districts2022;

  // Selected pair keys for quick lookup
  const selectedPairKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const [a, b] of selectedMatches) {
      keys.add(pairKey(a, b));
    }
    return keys;
  }, [selectedMatches]);

  // Split states into D-leaning (left) and R-leaning (right) columns
  const { leftColumn, rightColumn } = useMemo(() => {
    const left: StateData[] = [];
    const right: StateData[] = [];

    for (const state of groupStates) {
      if (state.partisanLean > 0) {
        left.push(state);
      } else if (state.partisanLean < 0) {
        right.push(state);
      } else {
        if (state.id === 'MI') {
          right.push(state);
        } else if (state.id === 'WI') {
          right.push(state);
        }
      }
    }

    left.sort((a, b) => getDistricts(b) - getDistricts(a));
    right.sort((a, b) => getDistricts(b) - getDistricts(a));

    return { leftColumn: left, rightColumn: right };
  }, [groupStates]);

  const uniqueDistrictCounts = useMemo(() => {
    const counts = new Set<number>();
    for (const state of groupStates) {
      counts.add(getDistricts(state));
    }
    return Array.from(counts).sort((a, b) => b - a);
  }, [groupStates]);

  const maxStatesPerDistrict = useMemo(() => {
    const leftCounts = new Map<number, number>();
    const rightCounts = new Map<number, number>();

    for (const state of leftColumn) {
      const d = getDistricts(state);
      leftCounts.set(d, (leftCounts.get(d) ?? 0) + 1);
    }
    for (const state of rightColumn) {
      const d = getDistricts(state);
      rightCounts.set(d, (rightCounts.get(d) ?? 0) + 1);
    }

    const maxPerDistrict = new Map<number, number>();
    for (const d of uniqueDistrictCounts) {
      maxPerDistrict.set(d, Math.max(leftCounts.get(d) ?? 0, rightCounts.get(d) ?? 0));
    }
    return maxPerDistrict;
  }, [leftColumn, rightColumn, uniqueDistrictCounts]);

  const { leftPositions, rightPositions, totalHeight } = useMemo(() => {
    const topPadding = 8;
    const bottomPadding = 8;
    const groupGap = 8;

    // Per-group box height based on district count
    const boxHeightMap = new Map<number, number>();
    for (const d of uniqueDistrictCounts) {
      boxHeightMap.set(d, getBoxHeight(d));
    }

    // Calculate start Y and allocated height for each district count group
    const districtStartY = new Map<number, number>();
    const districtAllocatedHeight = new Map<number, number>();
    let currentY = topPadding;
    for (const d of uniqueDistrictCounts) {
      const maxStates = maxStatesPerDistrict.get(d) ?? 1;
      const bh = boxHeightMap.get(d)!;
      const allocatedHeight = maxStates * bh + (maxStates - 1) * INNER_GAP;
      districtStartY.set(d, currentY);
      districtAllocatedHeight.set(d, allocatedHeight);
      currentY += allocatedHeight + groupGap;
    }
    const totalHeight = currentY - groupGap + bottomPadding;

    const calculatePositions = (states: StateData[]): PositionedState[] => {
      const byDistricts = new Map<number, StateData[]>();
      for (const state of states) {
        const d = getDistricts(state);
        if (!byDistricts.has(d)) byDistricts.set(d, []);
        byDistricts.get(d)!.push(state);
      }

      const positions: PositionedState[] = [];
      for (const [districts, statesInGroup] of byDistricts) {
        const startY = districtStartY.get(districts)!;
        const allocatedHeight = districtAllocatedHeight.get(districts)!;
        const bh = boxHeightMap.get(districts)!;
        const n = statesInGroup.length;
        const groupHeight = n * bh + (n - 1) * INNER_GAP;
        const offset = (allocatedHeight - groupHeight) / 2;
        statesInGroup.forEach((state, i) => {
          positions.push({ state, y: startY + offset + i * (bh + INNER_GAP), boxHeight: bh });
        });
      }

      return positions;
    };

    return {
      leftPositions: calculatePositions(leftColumn),
      rightPositions: calculatePositions(rightColumn),
      totalHeight,
    };
  }, [leftColumn, rightColumn, uniqueDistrictCounts, maxStatesPerDistrict]);

  const positionMap = useMemo(() => {
    const map = new Map<string, PositionedState>();
    for (const pos of leftPositions) map.set(pos.state.id, pos);
    for (const pos of rightPositions) map.set(pos.state.id, pos);
    return map;
  }, [leftPositions, rightPositions]);

  const stateColumn = useMemo(() => {
    const map = new Map<string, 'left' | 'right'>();
    for (const pos of leftPositions) map.set(pos.state.id, 'left');
    for (const pos of rightPositions) map.set(pos.state.id, 'right');
    return map;
  }, [leftPositions, rightPositions]);

  // Match lines: computed only within this group
  const matchLines = useMemo(() => {
    const lines: MatchLine[] = [];
    const seenPairs = new Set<string>();

    const allPositionedStates = [...leftPositions, ...rightPositions];

    for (const { state } of allPositionedStates) {
      const matches = findMatches(state, groupStates);

      for (const match of matches) {
        const pk = pairKey(state.id, match.id);
        if (seenPairs.has(pk)) continue;
        seenPairs.add(pk);

        const fromPos = positionMap.get(state.id);
        const toPos = positionMap.get(match.id);
        const fromCol = stateColumn.get(state.id);
        const toCol = stateColumn.get(match.id);

        if (fromPos && toPos && fromCol && toCol) {
          const fromX = fromCol === 'left' ? LEFT_X : RIGHT_X;
          const toX = toCol === 'left' ? LEFT_X : RIGHT_X;

          lines.push({
            fromState: state,
            toState: match,
            fromY: fromPos.y + fromPos.boxHeight / 2,
            toY: toPos.y + toPos.boxHeight / 2,
            fromX,
            toX,
          });
        }
      }
    }

    return lines;
  }, [leftPositions, rightPositions, positionMap, stateColumn, groupStates]);

  // States connected to the active state
  const activeMatchIds = useMemo(() => {
    const ids = new Set<string>();
    if (!activeStateId) return ids;
    ids.add(activeStateId);
    for (const line of matchLines) {
      if (line.fromState.id === activeStateId) ids.add(line.toState.id);
      else if (line.toState.id === activeStateId) ids.add(line.fromState.id);
    }
    return ids;
  }, [activeStateId, matchLines]);

  // When a state is active, clicking anywhere that isn't a state box deactivates it.
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
    // Stop propagation so the document listener doesn't also fire
    e.stopPropagation();

    if (!activeStateId) {
      // No active state → activate clicked state
      setActiveStateId(state.id);
    } else if (activeMatchIds.has(state.id) && state.id !== activeStateId) {
      // Match partner → lock the match & deactivate
      onToggleMatch([activeStateId, state.id]);
      setActiveStateId(null);
    } else if (state.id !== activeStateId) {
      // Unmatchable state → deactivate first, activate second
      setActiveStateId(state.id);
    } else {
      // Same state → deactivate
      setActiveStateId(null);
    }
  };

  const renderStateBox = (pos: PositionedState, x: number, align: 'left' | 'right') => {
    const { state, y, boxHeight } = pos;
    const isActive = state.id === activeStateId;
    const isMatchTarget = activeStateId && activeMatchIds.has(state.id) && !isActive;
    const isDimmed = activeStateId && !activeMatchIds.has(state.id);
    const isSelected = selectedPairKeys.has(pairKey(activeStateId ?? '', state.id)) ||
      selectedMatches.some(([a, b]) => a === state.id || b === state.id);
    const partisanColor = getPartisanColor(state);
    const dark = Math.abs(state.partisanLean) > 10;
    const leanTextColor = dark ? '#fff' : '#333';
    const borderWidth = isActive ? 3 : isSelected ? 2.5 : 2;
    const dividerPad = 6;

    const boxX = align === 'left' ? x - BOX_WIDTH : x;
    return (
      <g
        key={state.id}
        className={`state-box-group ${isActive ? 'active' : ''} ${isDimmed ? 'dimmed' : ''}`}
        onClick={(e) => handleStateClick(state, e)}
        style={{ cursor: 'pointer' }}
      >
        {/* White fill box */}
        <rect
          x={boxX}
          y={y}
          width={BOX_WIDTH}
          height={boxHeight}
          fill="white"
          rx={3}
        />
        {/* Thick partisan-colored border */}
        <rect
          x={boxX}
          y={y}
          width={BOX_WIDTH}
          height={boxHeight}
          fill="none"
          stroke={
            isActive ? '#000' :
            isSelected ? '#c9a227' :
            isMatchTarget ? '#666' : partisanColor
          }
          strokeWidth={borderWidth}
          rx={3}
        />
        {isSelected && (
          <rect
            x={boxX - 2}
            y={y - 2}
            width={BOX_WIDTH + 4}
            height={boxHeight + 4}
            fill="none"
            stroke="#c9a227"
            strokeWidth={2}
            rx={4}
            opacity={0.6}
          />
        )}
        {/* Divider line (inset from edges) */}
        <line
          x1={boxX + dividerPad}
          y1={y + HEADER_HEIGHT}
          x2={boxX + BOX_WIDTH - dividerPad}
          y2={y + HEADER_HEIGHT}
          stroke="rgba(0,0,0,0.15)"
          strokeWidth={0.5}
        />
        {/* Lean badge and state name — flipped for left (D) vs right (R) */}
        {(() => {
          const leanText = formatLean(state.partisanLean);
          const badgeW = leanText.length * 5.5 + 8;
          const badgeH = 13;
          const badgeY = y + 10 - badgeH / 2;
          const isLeft = align === 'left';
          // Left column: badge on left, name on right
          // Right column: name on left, badge on right
          const badgeX = isLeft ? boxX + 5 : boxX + BOX_WIDTH - 5 - badgeW;
          const nameX = isLeft ? boxX + BOX_WIDTH - 6 : boxX + 6;
          const nameAnchor = isLeft ? 'end' : 'start';
          return (
            <>
              <rect
                x={badgeX}
                y={badgeY}
                width={badgeW}
                height={badgeH}
                fill={partisanColor}
                rx={2.5}
              />
              <text
                x={badgeX + badgeW / 2}
                y={y + 10}
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
                y={y + 10}
                textAnchor={nameAnchor}
                dominantBaseline="central"
                fontSize={10}
                fill="#333"
                fontWeight={isActive ? 600 : 500}
              >
                {state.name}
              </text>
            </>
          );
        })()}

        {stateSafeSeats[state.id] && alternateMapSafeSeats[state.id] &&
          renderMergedSeatSquares(
            stateSafeSeats[state.id],
            alternateMapSafeSeats[state.id],
            boxX,
            y,
            getMaxRows(getDistricts(state)),
            boxHeight,
          )}

        {/* Minority-party seats gained by switching to proportional map */}
        {(() => {
          const gain = getMinoritySeatGain(state);
          if (gain === null) return null;
          const label = (gain >= 0 ? '+' : '') + gain;
          const isLeft = align === 'left';
          const labelX = isLeft ? boxX + BOX_WIDTH + 4 : boxX - 4;
          const anchor = isLeft ? 'start' : 'end';
          return (
            <text
              x={labelX}
              y={y + boxHeight / 2}
              textAnchor={anchor}
              dominantBaseline="central"
              fontSize={8}
              fill="#999"
            >
              {label}
            </text>
          );
        })()}
      </g>
    );
  };

  const renderMatchLine = (line: MatchLine, index: number) => {
    const { fromState, toState, fromY, toY, fromX, toX } = line;

    const isRelatedLine = !activeStateId ||
      fromState.id === activeStateId ||
      toState.id === activeStateId;

    const pk = pairKey(fromState.id, toState.id);
    const isPairSelected = selectedPairKeys.has(pk);

    const controlX = (LEFT_X + RIGHT_X) / 2;

    return (
      <path
        key={`${fromState.id}-${toState.id}-${index}`}
        d={`M ${fromX} ${fromY} C ${controlX} ${fromY}, ${controlX} ${toY}, ${toX} ${toY}`}
        fill="none"
        stroke={isPairSelected ? '#c9a227' : '#ccc'}
        strokeWidth={isPairSelected ? 3 : 1.5}
        strokeOpacity={isPairSelected ? 1 : isRelatedLine ? 0.7 : 0.15}
        className={`match-line ${!isRelatedLine && !isPairSelected ? 'dimmed' : ''}`}
      />
    );
  };

  const leftDistrictLabels = useMemo(() => {
    const groups = new Map<number, { minY: number; maxY: number }>();
    for (const pos of leftPositions) {
      const d = getDistricts(pos.state);
      const existing = groups.get(d);
      if (existing) {
        existing.minY = Math.min(existing.minY, pos.y);
        existing.maxY = Math.max(existing.maxY, pos.y + pos.boxHeight);
      } else {
        groups.set(d, { minY: pos.y, maxY: pos.y + pos.boxHeight });
      }
    }
    return Array.from(groups.entries()).map(([districts, { minY, maxY }]) => ({
      districts,
      centerY: (minY + maxY) / 2,
    }));
  }, [leftPositions]);

  const rightDistrictLabels = useMemo(() => {
    const groups = new Map<number, { minY: number; maxY: number }>();
    for (const pos of rightPositions) {
      const d = getDistricts(pos.state);
      const existing = groups.get(d);
      if (existing) {
        existing.minY = Math.min(existing.minY, pos.y);
        existing.maxY = Math.max(existing.maxY, pos.y + pos.boxHeight);
      } else {
        groups.set(d, { minY: pos.y, maxY: pos.y + pos.boxHeight });
      }
    }
    return Array.from(groups.entries()).map(([districts, { minY, maxY }]) => ({
      districts,
      centerY: (minY + maxY) / 2,
    }));
  }, [rightPositions]);

  if (groupStates.length === 0) return null;

  return (
    <div className="bipartite-graph-wrapper">
      <div style={{ textAlign: 'center', fontSize: 11, color: '#999', marginBottom: 4 }}>
        {activeStateId ? 'Click a highlighted match to select the pair' : 'Click a state to see its matches'}
      </div>
      <svg viewBox={`0 0 390 ${totalHeight}`} className="bipartite-graph">
        {/* District count labels */}
        {leftDistrictLabels.map(({ districts, centerY }) => (
          <text
            key={`left-${districts}`}
            x={LEFT_X - BOX_WIDTH - 8}
            y={centerY}
            textAnchor="end"
            dominantBaseline="central"
            fontSize={10}
            fill="#999"
          >
            {districts}
          </text>
        ))}
        {rightDistrictLabels.map(({ districts, centerY }) => (
          <text
            key={`right-${districts}`}
            x={RIGHT_X + BOX_WIDTH + 8}
            y={centerY}
            textAnchor="start"
            dominantBaseline="central"
            fontSize={10}
            fill="#999"
          >
            {districts}
          </text>
        ))}

        {/* Match lines (behind boxes) */}
        <g className="match-lines">
          {matchLines.map((line, i) => renderMatchLine(line, i))}
        </g>

        {/* State boxes */}
        <g className="left-column">
          {leftPositions.map(pos => renderStateBox(pos, LEFT_X, 'left'))}
        </g>
        <g className="right-column">
          {rightPositions.map(pos => renderStateBox(pos, RIGHT_X, 'right'))}
        </g>
      </svg>
    </div>
  );
}
