import { HoveredState } from '../types';
import { stateSafeSeats } from '../data/districtData/safeSeats';
import { computeRepresentationGap } from '../utils/computeRepresentationGap';

const PARTY_COLORS = { R: '#c93135', D: '#2e6da4' };

interface StateTooltipProps {
  hoveredState: HoveredState;
}

function repGapColor(absGap: number): string {
  return absGap === 0 ? '#2ca25f' : '#e8a832';
}

export function StateTooltip({ hoveredState }: StateTooltipProps) {
  const { state, x, y } = hoveredState;
  const safeCounts = stateSafeSeats[state.id];
  const gap = safeCounts ? computeRepresentationGap(state, safeCounts) : 0;
  const absGap = Math.abs(gap);

  const tooltipWidth = 220;
  const left = Math.min(x + 15, window.innerWidth - tooltipWidth - 8);

  let content: React.ReactNode;
  if (absGap === 0) {
    content = <>{state.name} is<br />represented <span style={{ color: '#2ca25f', fontWeight: 700 }}>proportionally</span></>;
  } else {
    const seats = absGap === 1 ? 'seat' : 'seats';
    const minorityOverRep = (gap > 0 && state.partisanLean > 0) || (gap < 0 && state.partisanLean < 0);
    const partyName = minorityOverRep
      ? (gap > 0 ? 'Republicans' : 'Democrats')
      : (gap > 0 ? 'Democrats' : 'Republicans');
    const partyColor = partyName === 'Republicans' ? PARTY_COLORS.R : PARTY_COLORS.D;
    const verb = minorityOverRep ? 'over-represented' : 'under-represented';

    content = (
      <>
        {state.name} <span style={{ color: partyColor, fontWeight: 700 }}>{partyName}</span> are
        <br />{verb} by{' '}
        <span style={{ color: repGapColor(absGap), fontWeight: 700 }}>{absGap}</span> {seats}
      </>
    );
  }

  return (
    <div
      className="tooltip"
      style={{
        left,
        top: y + 15,
      }}
    >
      <span className="tooltip-name">{content}</span>
    </div>
  );
}
