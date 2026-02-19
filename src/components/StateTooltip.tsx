import * as d3 from 'd3';
import { HoveredState } from '../types';
import { stateSafeSeats } from '../data/districtData/safeSeats';
import { computeSeatMisallocation } from '../utils/computeSeatMisallocation';

const leanColorScale = d3.scaleLinear<string>()
  .domain([-20, 0, 20])
  .range(['#c93135', '#888', '#2e6da4'])
  .clamp(true);

interface StateTooltipProps {
  hoveredState: HoveredState;
}

function formatLean(lean: number): string {
  if (lean === 0) return 'Even';
  return lean > 0 ? `D+${lean}%` : `R+${Math.abs(lean)}%`;
}

function misallocationColor(absMisallocation: number): string {
  return absMisallocation === 0 ? '#2ca25f' : '#e8a832';
}

export function StateTooltip({ hoveredState }: StateTooltipProps) {
  const { state, x, y } = hoveredState;
  const safeCounts = stateSafeSeats[state.id];
  const misallocation = safeCounts ? computeSeatMisallocation(state, safeCounts) : 0;
  const absMisallocation = Math.abs(misallocation);

  const tooltipWidth = 180;
  const left = Math.min(x + 15, window.innerWidth - tooltipWidth - 8);

  return (
    <div
      className="tooltip"
      style={{
        left,
        top: y + 15,
      }}
    >
      <div className="tooltip-header">
        <span className="tooltip-name">{state.name}</span>
        <span style={{ color: leanColorScale(state.partisanLean), fontWeight: 700 }}>
          {formatLean(state.partisanLean)}
        </span>
      </div>
      <div className="tooltip-metric">
        <span className="tooltip-value">
          <span style={{ color: misallocationColor(absMisallocation), fontWeight: 700 }}>
            {absMisallocation}
          </span>
        </span>
        <span className="tooltip-label">{absMisallocation === 1 ? 'seat misallocated' : 'seats misallocated'}</span>
      </div>
    </div>
  );
}
