import { HoveredState } from '../types';
import { DistrictYear, getSeats } from '../utils/findMatches';

interface StateTooltipProps {
  hoveredState: HoveredState;
  districtYear: DistrictYear;
}

function formatSeats(seats: number): string {
  const absSeats = Math.abs(seats).toFixed(1);
  if (seats > 0) {
    return `R+${absSeats} seats`;
  } else if (seats < 0) {
    return `D+${absSeats} seats`;
  }
  return '0 seats';
}

export function StateTooltip({ hoveredState, districtYear }: StateTooltipProps) {
  const { state, x, y } = hoveredState;
  const districts = districtYear === '2030' ? state.districts2030 : state.districts;
  const isSingleDistrict = districts === 1;
  const seats = getSeats(state, districtYear);
  const seatsColor = isSingleDistrict ? '#999' : seats > 0 ? '#b2182b' : seats < 0 ? '#2166ac' : '#666';
  const egPercent = Math.abs(state.efficiencyGap * 100).toFixed(1);
  const egLabel = state.efficiencyGap > 0 ? `R+${egPercent}%` : state.efficiencyGap < 0 ? `D+${egPercent}%` : '0%';
  const egColor = isSingleDistrict ? '#999' : state.efficiencyGap > 0 ? '#b2182b' : state.efficiencyGap < 0 ? '#2166ac' : '#666';

  // Format partisan lean as "R+X" or "D+X"
  const partisanLeanLabel = state.partisanLean >= 0
    ? `D+${state.partisanLean.toFixed(1)}`
    : `R+${Math.abs(state.partisanLean).toFixed(1)}`;
  const partisanLeanColor = isSingleDistrict ? '#999' : state.partisanLean >= 0 ? '#2166ac' : '#b2182b';

  return (
    <div
      className="tooltip"
      style={{
        left: x + 15,
        top: y + 15,
      }}
    >
      <div className="tooltip-row">
        <span className="tooltip-name-lean">
          <span className="tooltip-name">{state.name}</span>
          <span style={{ color: partisanLeanColor }}>{partisanLeanLabel}</span>
        </span>
        <span className="tooltip-value" style={{ color: egColor }}>
          {egLabel} EG
        </span>
      </div>
      <div className="tooltip-row">
        <span className="tooltip-label">{districts} {districts === 1 ? 'district' : 'districts'}{districtYear === '2030' ? ' (2030)' : ''}</span>
        <span className="tooltip-value" style={{ color: seatsColor }}>
          {formatSeats(seats)}
        </span>
      </div>
    </div>
  );
}
