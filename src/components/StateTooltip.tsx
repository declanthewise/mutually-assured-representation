import { HoveredState } from '../types';
import { DistrictYear } from '../utils/findMatches';

interface StateTooltipProps {
  hoveredState: HoveredState;
  districtYear: DistrictYear;
}

export function StateTooltip({ hoveredState, districtYear }: StateTooltipProps) {
  const { state, x, y } = hoveredState;
  const districts = districtYear === '2030' ? state.districts2030 : state.districts;
  const egPercent = (state.efficiencyGap * 100).toFixed(1);
  const egSign = state.efficiencyGap > 0 ? '+' : '';
  const leanColor = state.lean === 'R' ? '#b2182b' : state.lean === 'D' ? '#2166ac' : '#666';

  // Format partisan lean as "R+X" or "D+X"
  const partisanLeanLabel = state.partisanLean >= 0
    ? `D+${state.partisanLean.toFixed(1)}`
    : `R+${Math.abs(state.partisanLean).toFixed(1)}`;
  const partisanLeanColor = state.partisanLean >= 0 ? '#2166ac' : '#b2182b';

  return (
    <div
      className="tooltip"
      style={{
        left: x + 15,
        top: y + 15,
      }}
    >
      <div className="tooltip-header">{state.name}</div>
      <div className="tooltip-row">
        <span className="tooltip-label">Districts{districtYear === '2030' ? ' (2030)' : ''}:</span>
        <span className="tooltip-value">{districts}</span>
      </div>
      <div className="tooltip-row">
        <span className="tooltip-label">Efficiency Gap:</span>
        <span className="tooltip-value" style={{ color: leanColor }}>
          {egSign}{egPercent}%
        </span>
      </div>
      <div className="tooltip-row">
        <span className="tooltip-label">Partisan Lean:</span>
        <span className="tooltip-value" style={{ color: partisanLeanColor }}>
          {partisanLeanLabel}
        </span>
      </div>
    </div>
  );
}
