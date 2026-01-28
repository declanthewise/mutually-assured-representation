import { useMemo } from 'react';
import { StateData } from '../types';
import { stateData } from '../data/stateData';
import { findMatches, isStrongMatch, DistrictYear } from '../utils/findMatches';
import type { MatchFilters } from '../App';

interface BipartiteMatchGraphProps {
  districtYear: DistrictYear;
  filters: MatchFilters;
  onHoverState?: (state: StateData | null) => void;
  onClickState?: (state: StateData | null) => void;
  selectedStateId?: string | null;
  lockedStateId?: string | null;
}

/**
 * Get background color for a state based on partisan lean.
 * D-leaning (positive) = blue, R-leaning (negative) = red.
 */
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

export function BipartiteMatchGraph({
  districtYear,
  filters,
  onHoverState,
  onClickState,
  selectedStateId,
  lockedStateId,
}: BipartiteMatchGraphProps) {
  const getDistricts = (state: StateData) =>
    districtYear === '2032' ? state.districts2032 : state.districts;

  // Split states into D-leaning (left) and R-leaning (right) columns
  const { leftColumn, rightColumn } = useMemo(() => {
    const left: StateData[] = [];
    const right: StateData[] = [];

    for (const state of stateData) {
      if (state.partisanLean > 0) {
        left.push(state);
      } else if (state.partisanLean < 0) {
        right.push(state);
      } else {
        // Special case: MI (lean=0) -> D column, WI (lean=0) -> R column
        if (state.id === 'MI') {
          left.push(state);
        } else if (state.id === 'WI') {
          right.push(state);
        }
      }
    }

    // Sort by district count descending
    left.sort((a, b) => getDistricts(b) - getDistricts(a));
    right.sort((a, b) => getDistricts(b) - getDistricts(a));

    return { leftColumn: left, rightColumn: right };
  }, [districtYear]);

  // Get all unique district counts (sorted descending) for row positions
  const uniqueDistrictCounts = useMemo(() => {
    const counts = new Set<number>();
    for (const state of stateData) {
      counts.add(getDistricts(state));
    }
    return Array.from(counts).sort((a, b) => b - a);
  }, [districtYear]);

  // Count max states per district count in either column (for spacing calculation)
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

  // Calculate positions for states - vertically stacked within each district count
  const { leftPositions, rightPositions, totalHeight } = useMemo(() => {
    const topPadding = 50;
    const bottomPadding = 30;
    const gap = 8; // gap between district groups

    // Calculate starting Y for each district count
    const districtStartY = new Map<number, number>();
    let currentY = topPadding;
    for (const d of uniqueDistrictCounts) {
      districtStartY.set(d, currentY);
      currentY += (maxStatesPerDistrict.get(d) ?? 1) * BOX_HEIGHT + gap;
    }
    const totalHeight = currentY - gap + bottomPadding; // remove last gap, add bottom padding

    const calculatePositions = (states: StateData[]): PositionedState[] => {
      // Group states by district count
      const byDistricts = new Map<number, StateData[]>();
      for (const state of states) {
        const d = getDistricts(state);
        if (!byDistricts.has(d)) byDistricts.set(d, []);
        byDistricts.get(d)!.push(state);
      }

      const positions: PositionedState[] = [];
      for (const [districts, statesInGroup] of byDistricts) {
        const startY = districtStartY.get(districts)!;

        // Stack states vertically within the group
        statesInGroup.forEach((state, i) => {
          positions.push({
            state,
            y: startY + i * BOX_HEIGHT,
          });
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

  // Build lookup maps for positions
  const positionMap = useMemo(() => {
    const map = new Map<string, PositionedState>();
    for (const pos of leftPositions) {
      map.set(pos.state.id, pos);
    }
    for (const pos of rightPositions) {
      map.set(pos.state.id, pos);
    }
    return map;
  }, [leftPositions, rightPositions]);

  // Track which column each state is in
  const stateColumn = useMemo(() => {
    const map = new Map<string, 'left' | 'right'>();
    for (const pos of leftPositions) {
      map.set(pos.state.id, 'left');
    }
    for (const pos of rightPositions) {
      map.set(pos.state.id, 'right');
    }
    return map;
  }, [leftPositions, rightPositions]);

  // Calculate all match lines
  const matchLines = useMemo(() => {
    const lines: MatchLine[] = [];
    const seenPairs = new Set<string>();

    const allPositionedStates = [...leftPositions, ...rightPositions];

    for (const { state } of allPositionedStates) {
      // Skip single-district states
      if (getDistricts(state) === 1) continue;

      const matches = findMatches(state, stateData, districtYear);
      const filteredMatches = matches.filter(match => {
        if (filters.bothVeto && !(state.governorCanVeto && match.governorCanVeto)) {
          return false;
        }
        if (filters.bothBallot && !(state.hasBallotInitiative && match.hasBallotInitiative)) {
          return false;
        }
        return true;
      });

      for (const match of filteredMatches) {
        // Create a canonical pair key to avoid duplicates
        const pairKey = [state.id, match.id].sort().join('-');
        if (seenPairs.has(pairKey)) continue;
        seenPairs.add(pairKey);

        const fromPos = positionMap.get(state.id);
        const toPos = positionMap.get(match.id);
        const fromColumn = stateColumn.get(state.id);
        const toColumn = stateColumn.get(match.id);

        if (fromPos && toPos && fromColumn && toColumn) {
          // Calculate actual X positions
          const fromX = fromColumn === 'left' ? LEFT_X : RIGHT_X;
          const toX = toColumn === 'left' ? LEFT_X : RIGHT_X;

          lines.push({
            fromState: state,
            toState: match,
            fromY: fromPos.y + BOX_HEIGHT / 2,
            toY: toPos.y + BOX_HEIGHT / 2,
            fromX,
            toX,
            isStrong: isStrongMatch(state, match, districtYear),
          });
        }
      }
    }

    return lines;
  }, [leftPositions, rightPositions, positionMap, stateColumn, districtYear, filters]);

  // Determine which state is currently active (selected or locked)
  const activeStateId = lockedStateId ?? selectedStateId;

  // Get the set of states that are related to the active state
  const relatedStateIds = useMemo(() => {
    const related = new Set<string>();
    if (!activeStateId) return related;

    related.add(activeStateId);
    for (const line of matchLines) {
      if (line.fromState.id === activeStateId) {
        related.add(line.toState.id);
      } else if (line.toState.id === activeStateId) {
        related.add(line.fromState.id);
      }
    }
    return related;
  }, [activeStateId, matchLines]);

  const handleStateHover = (state: StateData | null) => {
    if (!lockedStateId) {
      onHoverState?.(state);
    }
  };

  const handleStateClick = (state: StateData) => {
    if (getDistricts(state) === 1) return;
    onClickState?.(lockedStateId === state.id ? null : state);
  };

  const renderStateBox = (pos: PositionedState, x: number, align: 'left' | 'right') => {
    const { state, y } = pos;
    const districts = getDistricts(state);
    const isSingleDistrict = districts === 1;
    const isActive = state.id === activeStateId;
    const isRelated = relatedStateIds.has(state.id);
    const isDimmed = activeStateId && !isRelated;

    const boxX = align === 'left' ? x - BOX_WIDTH : x;

    return (
      <g
        key={state.id}
        className={`state-box-group ${isSingleDistrict ? 'single-district' : ''} ${isActive ? 'active' : ''} ${isDimmed ? 'dimmed' : ''}`}
        onMouseEnter={() => !isSingleDistrict && handleStateHover(state)}
        onMouseLeave={() => handleStateHover(null)}
        onClick={() => handleStateClick(state)}
        style={{ cursor: isSingleDistrict ? 'default' : 'pointer' }}
      >
        <rect
          x={boxX}
          y={y}
          width={BOX_WIDTH}
          height={BOX_HEIGHT}
          fill={isSingleDistrict ? 'rgba(200, 200, 200, 0.3)' : getPartisanColor(state)}
          stroke={isActive ? '#000' : isSingleDistrict ? '#ddd' : '#999'}
          strokeWidth={isActive ? 2 : 1}
          rx={3}
        />
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

    // Determine if this line is related to the active state
    const isRelatedLine = !activeStateId ||
      fromState.id === activeStateId ||
      toState.id === activeStateId;

    // Use bezier curve for smoother lines
    const controlX = (LEFT_X + RIGHT_X) / 2;

    return (
      <path
        key={`${fromState.id}-${toState.id}-${index}`}
        d={`M ${fromX} ${fromY} C ${controlX} ${fromY}, ${controlX} ${toY}, ${toX} ${toY}`}
        fill="none"
        stroke={isStrong ? '#4caf50' : '#ffd700'}
        strokeWidth={isStrong ? 2 : 1.5}
        strokeOpacity={isRelatedLine ? (isStrong ? 0.8 : 0.6) : 0.15}
        className={`match-line ${isStrong ? 'strong' : 'weak'} ${!isRelatedLine ? 'dimmed' : ''}`}
      />
    );
  };

  // Get district counts and their center Y positions for each column
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

  return (
    <div className="bipartite-graph-wrapper">
      <svg viewBox={`0 0 320 ${totalHeight}`} className="bipartite-graph">
        {/* Column labels */}
        <text x={LEFT_X - BOX_WIDTH / 2} y={20} textAnchor="middle" fontSize={14} fontWeight={600} fill="#2166ac">
          D-Leaning States
        </text>
        <text x={RIGHT_X + BOX_WIDTH / 2} y={20} textAnchor="middle" fontSize={14} fontWeight={600} fill="#b2182b">
          R-Leaning States
        </text>

        {/* District count labels for left column */}
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

        {/* District count labels for right column */}
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

        {/* Match lines (render first so they're behind boxes) */}
        <g className="match-lines">
          {matchLines.map((line, i) => renderMatchLine(line, i))}
        </g>

        {/* Left column (D-leaning) */}
        <g className="left-column">
          {leftPositions.map(pos => renderStateBox(pos, LEFT_X, 'left'))}
        </g>

        {/* Right column (R-leaning) */}
        <g className="right-column">
          {rightPositions.map(pos => renderStateBox(pos, RIGHT_X, 'right'))}
        </g>
      </svg>

      <div className="graph-legend">
        <div className="legend-item">
          <span className="legend-line strong"></span>
          <span>Strong match (seats within 0.7)</span>
        </div>
        <div className="legend-item">
          <span className="legend-line weak"></span>
          <span>Weak match</span>
        </div>
        <div className="legend-item">
          <span className="legend-box grayed"></span>
          <span>Single-district state (N/A)</span>
        </div>
      </div>
    </div>
  );
}
