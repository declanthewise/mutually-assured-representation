import { useMemo, useState } from 'react';
import { StateData, MatchPair } from '../types';
import { findMatches, isStrongMatch } from '../utils/findMatches';

interface BipartiteMatchGraphProps {
  groupStates: StateData[];
  selectedMatches: MatchPair[];
  onToggleMatch: (pair: MatchPair) => void;
}

function getPartisanColor(state: StateData): string {
  const lean = state.partisanLean;
  const intensity = Math.min(Math.abs(lean) / 20, 1);
  const opacity = 0.3 + intensity * 0.7;

  if (lean === 0) {
    return 'rgba(200, 200, 200, 0.5)';
  } else if (lean > 0) {
    return `rgba(100, 130, 255, ${opacity})`;
  } else {
    return `rgba(255, 100, 100, ${opacity})`;
  }
}

interface PositionedState {
  state: StateData;
  y: number;
}

interface MatchLine {
  fromState: StateData;
  toState: StateData;
  fromY: number;
  toY: number;
  fromX: number;
  toX: number;
  isStrong: boolean;
}

const BOX_WIDTH = 50;
const BOX_HEIGHT = 20;
const LEFT_X = 90;
const RIGHT_X = 220;

function pairKey(a: string, b: string): string {
  return [a, b].sort().join('-');
}

export function BipartiteMatchGraph({
  groupStates,
  selectedMatches,
  onToggleMatch,
}: BipartiteMatchGraphProps) {
  const [activeStateId, setActiveStateId] = useState<string | null>(null);

  const getDistricts = (state: StateData) => state.districts2032;

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
          left.push(state);
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
    const topPadding = 50;
    const bottomPadding = 30;
    const gap = 8;

    const districtStartY = new Map<number, number>();
    let currentY = topPadding;
    for (const d of uniqueDistrictCounts) {
      districtStartY.set(d, currentY);
      currentY += (maxStatesPerDistrict.get(d) ?? 1) * BOX_HEIGHT + gap;
    }
    const totalHeight = currentY - gap + bottomPadding;

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
        statesInGroup.forEach((state, i) => {
          positions.push({ state, y: startY + i * BOX_HEIGHT });
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
      if (getDistricts(state) === 1) continue;

      const matches = findMatches(state, groupStates, '2032');

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
            fromY: fromPos.y + BOX_HEIGHT / 2,
            toY: toPos.y + BOX_HEIGHT / 2,
            fromX,
            toX,
            isStrong: isStrongMatch(state, match, '2032'),
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

  const handleStateClick = (state: StateData) => {
    if (getDistricts(state) === 1) return;

    if (!activeStateId) {
      // Step 1: activate a state to see its matches
      setActiveStateId(state.id);
    } else if (state.id === activeStateId) {
      // Clicking the active state again deactivates it
      setActiveStateId(null);
    } else if (activeMatchIds.has(state.id)) {
      // Step 2: clicking a match partner toggles the pair
      const pair: MatchPair = [activeStateId, state.id];
      onToggleMatch(pair);
    } else {
      // Clicking a non-match state: switch active to that state
      setActiveStateId(state.id);
    }
  };

  const renderStateBox = (pos: PositionedState, x: number, align: 'left' | 'right') => {
    const { state, y } = pos;
    const districts = getDistricts(state);
    const isSingleDistrict = districts === 1;
    const isActive = state.id === activeStateId;
    const isMatchTarget = activeStateId && activeMatchIds.has(state.id) && !isActive;
    const isDimmed = activeStateId && !activeMatchIds.has(state.id);
    const isSelected = selectedPairKeys.has(pairKey(activeStateId ?? '', state.id)) ||
      selectedMatches.some(([a, b]) => a === state.id || b === state.id);

    const boxX = align === 'left' ? x - BOX_WIDTH : x;

    return (
      <g
        key={state.id}
        className={`state-box-group ${isSingleDistrict ? 'single-district' : ''} ${isActive ? 'active' : ''} ${isDimmed ? 'dimmed' : ''}`}
        onClick={() => handleStateClick(state)}
        style={{ cursor: isSingleDistrict ? 'default' : 'pointer' }}
      >
        <rect
          x={boxX}
          y={y}
          width={BOX_WIDTH}
          height={BOX_HEIGHT}
          fill={isSingleDistrict ? 'rgba(200, 200, 200, 0.3)' : getPartisanColor(state)}
          stroke={
            isActive ? '#000' :
            isSelected ? '#c9a227' :
            isMatchTarget ? '#666' :
            isSingleDistrict ? '#ddd' : '#999'
          }
          strokeWidth={isActive ? 2.5 : isSelected ? 2 : 1}
          rx={3}
        />
        {isSelected && (
          <rect
            x={boxX - 2}
            y={y - 2}
            width={BOX_WIDTH + 4}
            height={BOX_HEIGHT + 4}
            fill="none"
            stroke="#c9a227"
            strokeWidth={2}
            rx={4}
            opacity={0.6}
          />
        )}
        <text
          x={boxX + BOX_WIDTH / 2}
          y={y + BOX_HEIGHT / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={11}
          fill={isSingleDistrict ? '#999' : '#333'}
          fontWeight={isActive ? 600 : 500}
        >
          {state.id}
        </text>
      </g>
    );
  };

  const renderMatchLine = (line: MatchLine, index: number) => {
    const { fromState, toState, fromY, toY, fromX, toX, isStrong } = line;

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
        stroke={isPairSelected ? '#c9a227' : isStrong ? '#4caf50' : '#ffd700'}
        strokeWidth={isPairSelected ? 3 : isStrong ? 2 : 1.5}
        strokeOpacity={isPairSelected ? 1 : isRelatedLine ? (isStrong ? 0.8 : 0.6) : 0.15}
        className={`match-line ${isStrong ? 'strong' : 'weak'} ${!isRelatedLine && !isPairSelected ? 'dimmed' : ''}`}
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
        existing.maxY = Math.max(existing.maxY, pos.y + BOX_HEIGHT);
      } else {
        groups.set(d, { minY: pos.y, maxY: pos.y + BOX_HEIGHT });
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
        existing.maxY = Math.max(existing.maxY, pos.y + BOX_HEIGHT);
      } else {
        groups.set(d, { minY: pos.y, maxY: pos.y + BOX_HEIGHT });
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
      <svg viewBox={`0 0 320 ${totalHeight}`} className="bipartite-graph">
        {/* Column labels */}
        <text x={LEFT_X - BOX_WIDTH / 2} y={20} textAnchor="middle" fontSize={14} fontWeight={600} fill="#2166ac">
          D-Leaning
        </text>
        <text x={RIGHT_X + BOX_WIDTH / 2} y={20} textAnchor="middle" fontSize={14} fontWeight={600} fill="#b2182b">
          R-Leaning
        </text>

        {/* Instruction text */}
        <text x={160} y={38} textAnchor="middle" fontSize={10} fill="#999">
          {activeStateId ? 'Click a highlighted match to select the pair' : 'Click a state to see its matches'}
        </text>

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

      <div className="graph-legend">
        <div className="legend-item">
          <span className="legend-line strong"></span>
          <span>Strong match</span>
        </div>
        <div className="legend-item">
          <span className="legend-line weak"></span>
          <span>Weak match</span>
        </div>
        <div className="legend-item">
          <span className="legend-line selected"></span>
          <span>Selected pair</span>
        </div>
      </div>
    </div>
  );
}
