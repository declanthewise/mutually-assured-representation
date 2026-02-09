import * as d3 from 'd3';
import { HoveredState } from '../types';

const safeSeatsColorScale = d3.scaleLinear<string>()
  .domain([0, 100])
  .range(['#2ca25f', '#a0a0a0'])
  .clamp(true);

interface StateTooltipProps {
  hoveredState: HoveredState;
}

export function StateTooltip({ hoveredState }: StateTooltipProps) {
  const { state, x, y } = hoveredState;
  const safePercent = (state.safeSeats / state.districts) * 100;
  const competitiveColor = safeSeatsColorScale(safePercent);

  return (
    <div
      className="tooltip"
      style={{
        left: x + 15,
        top: y + 15,
      }}
    >
      <span className="tooltip-name">{state.name}</span>
      <div className="tooltip-metric">
        <span className="tooltip-value">
          <span style={{ color: competitiveColor, fontWeight: 700 }}>{state.competitiveSeats}</span>
          {' '}/{' '}{state.districts}
        </span>
        <span className="tooltip-label">competitive</span>
      </div>
    </div>
  );
}
