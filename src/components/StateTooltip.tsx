import { HoveredState } from '../types';

interface StateTooltipProps {
  hoveredState: HoveredState;
}

export function StateTooltip({ hoveredState }: StateTooltipProps) {
  const { state, x, y } = hoveredState;
  const districts = state.districts2032;

  const partisanLeanLabel = state.partisanLean === 0
    ? 'EVEN'
    : state.partisanLean > 0
      ? `D+${Math.round(state.partisanLean)}%`
      : `R+${Math.round(Math.abs(state.partisanLean))}%`;
  const partisanLeanColor = districts === 1 ? '#999' : state.partisanLean > 0 ? '#2166ac' : state.partisanLean < 0 ? '#b2182b' : '#666';

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
        <span className="tooltip-districts">{districts} {districts === 1 ? 'district' : 'districts'} (2032)</span>
      </div>
      <div className="tooltip-metric">
        <span className="tooltip-label">Partisan Lean</span>
        <span className="tooltip-value" style={{ color: partisanLeanColor }}>{partisanLeanLabel}</span>
      </div>
    </div>
  );
}
