import { HoveredState } from '../types';

interface StateTooltipProps {
  hoveredState: HoveredState;
}

export function StateTooltip({ hoveredState }: StateTooltipProps) {
  const { state, x, y } = hoveredState;
  const districts = state.districts;

  return (
    <div
      className="tooltip"
      style={{
        left: x + 15,
        top: y + 15,
      }}
    >
      <div className="tooltip-header">
        <span className="tooltip-name">{state.name}</span>
      </div>
      <div className="tooltip-metric">
        <span className="tooltip-label">Competitive seats</span>
        <span className="tooltip-value">{state.competitiveSeats} / {districts}</span>
      </div>
    </div>
  );
}
