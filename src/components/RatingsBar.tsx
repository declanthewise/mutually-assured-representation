import { useMemo } from 'react';
import { stateSafeSeats } from '../data/safeSeats';

const TOTAL_SEATS = 435;
const MAJORITY = 218;

export function RatingsBar() {
  const totals = useMemo(() => {
    let safeD = 0;
    let leanD = 0;
    let even = 0;
    let leanR = 0;
    let safeR = 0;
    for (const counts of Object.values(stateSafeSeats)) {
      safeD += counts.safeD;
      leanD += counts.leanD;
      even += counts.even;
      leanR += counts.leanR;
      safeR += counts.safeR;
    }
    return { safeD, leanD, even, leanR, safeR };
  }, []);

  const pctD = (totals.safeD / TOTAL_SEATS) * 100;
  const pctLeanD = (totals.leanD / TOTAL_SEATS) * 100;
  const pctEven = (totals.even / TOTAL_SEATS) * 100;
  const pctLeanR = (totals.leanR / TOTAL_SEATS) * 100;
  const pctR = (totals.safeR / TOTAL_SEATS) * 100;
  const majorityPct = (MAJORITY / TOTAL_SEATS) * 100;

  return (
    <div className="ratings-bar-wrapper">
      <div className="ratings-bar-container">
        <div className="ratings-bar-labels">
          <span style={{ width: `${pctD}%` }}>Safe D</span>
          <span style={{ width: `${pctLeanD}%` }}>Lean D</span>
          <span style={{ width: `${pctEven}%` }}></span>
          <span style={{ width: `${pctLeanR}%` }}>Lean R</span>
          <span style={{ width: `${pctR}%` }}>Safe R</span>
        </div>
        <div className="ratings-bar">
          <div
            className="ratings-bar-segment segment-d"
            style={{ width: `${pctD}%` }}
          >
            {totals.safeD}
          </div>
          <div
            className="ratings-bar-segment segment-lean-d"
            style={{ width: `${pctLeanD}%` }}
          >
            {totals.leanD}
          </div>
          <div
            className="ratings-bar-segment segment-even"
            style={{ width: `${pctEven}%` }}
          >
            {totals.even}
          </div>
          <div
            className="ratings-bar-segment segment-lean-r"
            style={{ width: `${pctLeanR}%` }}
          >
            {totals.leanR}
          </div>
          <div
            className="ratings-bar-segment segment-r"
            style={{ width: `${pctR}%` }}
          >
            {totals.safeR}
          </div>
        </div>
        <div
          className="ratings-bar-majority"
          style={{ left: `${majorityPct}%` }}
        >
          <span className="majority-label">{MAJORITY} MAJORITY</span>
        </div>
      </div>
    </div>
  );
}
