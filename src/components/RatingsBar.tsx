import { useMemo, useState, useEffect, useRef } from 'react';
import { SafeSeatCounts } from '../data/districtData/safeSeats';

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    const from = prev.current;
    const to = value;
    prev.current = value;
    if (from === to) return;

    const duration = 400;
    const start = performance.now();
    let raf: number;

    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      setDisplay(Math.round(from + (to - from) * t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <>{display}</>;
}

const TOTAL_SEATS = 435;
const MAJORITY = 218;

interface RatingsBarProps {
  adjustedSafeSeats: Record<string, SafeSeatCounts>;
}

export function RatingsBar({ adjustedSafeSeats }: RatingsBarProps) {
  const totals = useMemo(() => {
    let safeD = 0;
    let leanD = 0;
    let even = 0;
    let leanR = 0;
    let safeR = 0;
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
            <AnimatedNumber value={totals.safeD} />
          </div>
          <div
            className="ratings-bar-segment segment-lean-d"
            style={{ width: `${pctLeanD}%` }}
          >
            <AnimatedNumber value={totals.leanD} />
          </div>
          <div
            className="ratings-bar-segment segment-even"
            style={{ width: `${pctEven}%` }}
          >
            <AnimatedNumber value={totals.even} />
          </div>
          <div
            className="ratings-bar-segment segment-lean-r"
            style={{ width: `${pctLeanR}%` }}
          >
            <AnimatedNumber value={totals.leanR} />
          </div>
          <div
            className="ratings-bar-segment segment-r"
            style={{ width: `${pctR}%` }}
          >
            <AnimatedNumber value={totals.safeR} />
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
