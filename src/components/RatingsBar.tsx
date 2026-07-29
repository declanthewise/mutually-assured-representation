import { useMemo } from 'react';
import type { SafeSeatCounts } from '../data/districtData/safeSeats';
import { AnimatedCount } from './AnimatedCount';

const TOTAL_SEATS = 435;
const MAJORITY = 218;

interface RatingsBarProps {
  adjustedSafeSeats: Record<string, SafeSeatCounts>;
}

export function RatingsBar({ adjustedSafeSeats }: RatingsBarProps) {
  const totals = useMemo(() => {
    let safeD = 0, leanD = 0, even = 0, leanR = 0, safeR = 0;
    for (const counts of Object.values(adjustedSafeSeats)) {
      safeD += counts.safeD;
      leanD += counts.leanD;
      even += counts.even;
      leanR += counts.leanR;
      safeR += counts.safeR;
    }
    return { safeD, leanD, even, leanR, safeR };
  }, [adjustedSafeSeats]);

  const pctD = (totals.safeD / TOTAL_SEATS) * 100;
  const pctLeanD = (totals.leanD / TOTAL_SEATS) * 100;
  const pctEven = (totals.even / TOTAL_SEATS) * 100;
  const pctLeanR = (totals.leanR / TOTAL_SEATS) * 100;
  const pctR = (totals.safeR / TOTAL_SEATS) * 100;

  const majorityLeftPct = (MAJORITY / TOTAL_SEATS) * 100;

  return (
    <div className="ratings-bar-wrapper">
      <div className="ratings-bar-container">
        <div className="ratings-bar-labels">
          <span style={{ width: `${pctD}%` }}>
            <span className="ratings-label-text">Safe D</span>
          </span>
          <span style={{ width: `${pctLeanD}%` }}>
            <span className="ratings-label-text">Lean D</span>
          </span>
          <span style={{ width: `${pctEven}%` }} />
          <span style={{ width: `${pctLeanR}%` }}>
            <span className="ratings-label-text">Lean R</span>
          </span>
          <span style={{ width: `${pctR}%` }}>
            <span className="ratings-label-text">Safe R</span>
          </span>
        </div>
        <div className="ratings-bar">
          <div className="ratings-bar-segment segment-d" style={{ width: `${pctD}%` }}>
            <AnimatedCount value={totals.safeD} />
          </div>
          <div className="ratings-bar-segment segment-lean-d" style={{ width: `${pctLeanD}%` }}>
            <AnimatedCount value={totals.leanD} />
          </div>
          <div className="ratings-bar-segment segment-even" style={{ width: `${pctEven}%` }}>
            <AnimatedCount value={totals.even} />
          </div>
          <div className="ratings-bar-segment segment-lean-r" style={{ width: `${pctLeanR}%` }}>
            <AnimatedCount value={totals.leanR} />
          </div>
          <div className="ratings-bar-segment segment-r" style={{ width: `${pctR}%` }}>
            <AnimatedCount value={totals.safeR} />
          </div>
        </div>
        <div
          className="ratings-bar-majority"
          style={{ left: `${majorityLeftPct}%` }}
        >
          <span className="majority-label">{MAJORITY} MAJORITY</span>
        </div>
      </div>
    </div>
  );
}
