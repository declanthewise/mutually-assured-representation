import { HoveredState } from '../types';

interface StateTooltipProps {
  hoveredState: HoveredState;
}

export function StateTooltip({ hoveredState }: StateTooltipProps) {
  const { state, x, y } = hoveredState;
  const egPercent = (state.efficiencyGap * 100).toFixed(1);
  const egSign = state.efficiencyGap > 0 ? '+' : '';
  const leanLabel = state.lean === 'R' ? 'Republican' : state.lean === 'D' ? 'Democratic' : 'Neutral';
  const leanColor = state.lean === 'R' ? '#b2182b' : state.lean === 'D' ? '#2166ac' : '#666';

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
        <span className="tooltip-label">Districts:</span>
        <span className="tooltip-value">{state.districts}</span>
      </div>
      <div className="tooltip-row">
        <span className="tooltip-label">Efficiency Gap:</span>
        <span className="tooltip-value" style={{ color: leanColor }}>
          {egSign}{egPercent}%
        </span>
      </div>
      <div className="tooltip-row">
        <span className="tooltip-label">Lean:</span>
        <span className="tooltip-value" style={{ color: leanColor }}>
          {leanLabel}
        </span>
      </div>
    </div>
  );
}
