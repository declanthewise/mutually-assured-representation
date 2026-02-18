import { useMemo, useState, useEffect, useRef } from 'react';
import { SafeSeatCounts, stateSafeSeats } from '../data/districtData/safeSeats';

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

const ROWS = 3;
const SQ = 5;
const SQ_GAP = 1.2;
const SQ_PITCH = SQ + SQ_GAP;
const COLS = Math.ceil(TOTAL_SEATS / ROWS);

const COLORS = {
  safeD: '#2e6da4',
  leanD: '#6a9dc9',
  even: '#d0d0d0',
  leanR: '#d97a7c',
  safeR: '#c93135',
};

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

  const baseTotals = useMemo(() => {
    let safeD = 0, leanD = 0, even = 0, leanR = 0, safeR = 0;
    for (const counts of Object.values(stateSafeSeats)) {
      safeD += counts.safeD;
      leanD += counts.leanD;
      even += counts.even;
      leanR += counts.leanR;
      safeR += counts.safeR;
    }
    return { safeD, leanD, even, leanR, safeR };
  }, []);

  const seatData = useMemo(() => {
    const data: { color: string; isGold: boolean }[] = [];
    const addCategory = (count: number, baseline: number, color: string) => {
      for (let i = 0; i < count; i++) {
        data.push({ color, isGold: i >= baseline });
      }
    };
    addCategory(totals.safeD, baseTotals.safeD, COLORS.safeD);
    addCategory(totals.leanD, baseTotals.leanD, COLORS.leanD);
    addCategory(totals.even, baseTotals.even, COLORS.even);
    addCategory(totals.leanR, baseTotals.leanR, COLORS.leanR);
    addCategory(totals.safeR, baseTotals.safeR, COLORS.safeR);
    return data;
  }, [totals, baseTotals]);

  const viewWidth = COLS * SQ_PITCH - SQ_GAP;
  const viewHeight = ROWS * SQ_PITCH - SQ_GAP;

  // 218th square (0-indexed: 217)
  const majIdx = MAJORITY - 1;
  const majCol = Math.floor(majIdx / ROWS);
  const majRow = majIdx % ROWS;
  const majSqX = majCol * SQ_PITCH;
  const majSqY = majRow * SQ_PITCH;
  const majCornerX = majSqX + SQ; // bottom-right corner
  const majorityLeftPct = (majCornerX / viewWidth) * 100;

  const pctD = (totals.safeD / TOTAL_SEATS) * 100;
  const pctLeanD = (totals.leanD / TOTAL_SEATS) * 100;
  const pctEven = (totals.even / TOTAL_SEATS) * 100;
  const pctLeanR = (totals.leanR / TOTAL_SEATS) * 100;
  const pctR = (totals.safeR / TOTAL_SEATS) * 100;

  return (
    <div className="ratings-bar-wrapper">
      <div className="ratings-bar-container">
        <div className="ratings-bar-labels">
          <span style={{ width: `${pctD}%` }}>
            Safe D
            <span className="ratings-badge" style={{ background: COLORS.safeD }}>
              <AnimatedNumber value={totals.safeD} />
            </span>
          </span>
          <span style={{ width: `${pctLeanD}%` }}>
            Lean D
            <span className="ratings-badge" style={{ background: COLORS.leanD }}>
              <AnimatedNumber value={totals.leanD} />
            </span>
          </span>
          <span style={{ width: `${pctEven}%` }}>
            <span className="ratings-badge ratings-badge-even" style={{ background: COLORS.even }}>
              <AnimatedNumber value={totals.even} />
            </span>
          </span>
          <span style={{ width: `${pctLeanR}%` }}>
            <span className="ratings-badge" style={{ background: COLORS.leanR }}>
              <AnimatedNumber value={totals.leanR} />
            </span>
            Lean R
          </span>
          <span style={{ width: `${pctR}%` }}>
            <span className="ratings-badge" style={{ background: COLORS.safeR }}>
              <AnimatedNumber value={totals.safeR} />
            </span>
            Safe R
          </span>
        </div>
        <svg
          viewBox={`0 0 ${viewWidth} ${viewHeight}`}
          width="100%"
          style={{ display: 'block', overflow: 'visible' }}
        >
          {seatData.map(({ color, isGold }, i) => {
            const col = Math.floor(i / ROWS);
            const row = i % ROWS;
            const x = col * SQ_PITCH;
            const y = row * SQ_PITCH;
            return (
              <g key={i}>
                <rect
                  x={x}
                  y={y}
                  width={SQ}
                  height={SQ}
                  fill={color}
                  rx={0.5}
                  style={{ transition: 'fill 0.4s ease' }}
                />
                {isGold && (
                  <circle
                    cx={x + SQ / 2}
                    cy={y + SQ / 2}
                    r={1.3}
                    fill="#c9a227"
                  />
                )}
              </g>
            );
          })}
          {/* Black border on the majority square */}
          <rect
            x={majSqX}
            y={majSqY}
            width={SQ}
            height={SQ}
            fill="none"
            stroke="#111"
            strokeWidth={0.8}
            rx={0.5}
          />
          {/* Line from bottom-right corner of majority square down */}
          <line
            x1={majCornerX}
            y1={majSqY + SQ}
            x2={majCornerX}
            y2={viewHeight + 6}
            stroke="#111"
            strokeWidth={0.8}
          />
        </svg>
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
