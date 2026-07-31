import type { ReactNode } from 'react';
import { EVEN_GRAY, FAIR_GREEN, GAP_GOLD, PARTY_COLORS } from '../colors';
import { houseBalance, houseBalanceParty, nationalSeatTotals } from '../data/districtLeans';
import { AnimatedCount } from './AnimatedCount';

const TOTAL_SEATS = 435;

/** Donut geometry, in the 100×100 viewBox both rings draw into. */
const RADIUS = 40;
const STROKE = 13;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface StatBarProps {
  nationalRepresentationGap: number;
}

interface DonutSlice {
  key: string;
  seats: number;
  color: string;
  label: string;
}

/** A ring of `slices` out of `TOTAL_SEATS`, with `children` centered in the hole. */
function StatDonut({
  slices,
  centerColor,
  ariaLabel,
  children,
}: {
  slices: DonutSlice[];
  centerColor: string;
  ariaLabel: string;
  children: ReactNode;
}) {
  let seatsDrawn = 0;

  return (
    <svg className="stat-donut" viewBox="0 0 100 100" role="img" aria-label={ariaLabel}>
      {/* Rotated so the first slice starts at 12 o'clock. */}
      <g transform="rotate(-90 50 50)">
        {slices.map((slice) => {
          const length = (slice.seats / TOTAL_SEATS) * CIRCUMFERENCE;
          const offset = -(seatsDrawn / TOTAL_SEATS) * CIRCUMFERENCE;
          seatsDrawn += slice.seats;
          return (
            <circle
              key={slice.key}
              className="stat-donut-arc"
              cx="50" cy="50" r={RADIUS}
              fill="none"
              stroke={slice.color}
              strokeWidth={STROKE}
              strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
              strokeDashoffset={offset}
            >
              <title>{slice.seats} {slice.label}</title>
            </circle>
          );
        })}
      </g>
      <text
        x="50" y="50"
        textAnchor="middle" dominantBaseline="central"
        fontSize="24" fontWeight="700"
        fill={centerColor}
      >
        {children}
      </text>
    </svg>
  );
}

/** Slices in seating order: D, the even districts, then R. */
const balanceSlices: DonutSlice[] = [
  { key: 'D', seats: nationalSeatTotals.dSeats, color: PARTY_COLORS.D, label: 'D-leaning' },
  { key: 'EVEN', seats: nationalSeatTotals.even, color: EVEN_GRAY, label: 'EVEN' },
  { key: 'R', seats: nationalSeatTotals.rSeats, color: PARTY_COLORS.R, label: 'R-leaning' },
];

export function StatBar({ nationalRepresentationGap }: StatBarProps) {
  const gapSlices: DonutSlice[] = [
    {
      key: 'gap',
      seats: nationalRepresentationGap,
      color: GAP_GOLD,
      label: 'seats away from proportional',
    },
    {
      key: 'proportional',
      seats: TOTAL_SEATS - nationalRepresentationGap,
      color: FAIR_GREEN,
      label: 'seats at their proportional share',
    },
  ];

  return (
    <div className="stat-bar-wrapper">
      <div className="stat-bar">
        <div className="stat-block stat-block-inline">
          {/* Explicit break: the label box hugs its text so the two blocks stay
              symmetric about the divider. */}
          <div className="stat-label">U.S. House<br />Balance</div>
          <StatDonut
            slices={balanceSlices}
            centerColor={PARTY_COLORS[houseBalanceParty]}
            ariaLabel={`${nationalSeatTotals.dSeats} D-leaning, ${nationalSeatTotals.even} EVEN, ${nationalSeatTotals.rSeats} R-leaning districts`}
          >
            {houseBalanceParty}+{Math.abs(houseBalance)}
          </StatDonut>
        </div>

        <div className="stat-divider" />

        <div className="stat-block stat-block-inline">
          <div className="stat-label">National<br />Rep. Gap</div>
          <StatDonut
            slices={gapSlices}
            centerColor={GAP_GOLD}
            ariaLabel={`${nationalRepresentationGap} of ${TOTAL_SEATS} seats away from proportional`}
          >
            <AnimatedCount value={nationalRepresentationGap} />
          </StatDonut>
        </div>
      </div>
    </div>
  );
}
