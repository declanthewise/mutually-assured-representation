import type { ReactNode } from 'react';
import { EVEN_GRAY, GAP_ORANGE, PARTY_COLORS } from '../colors';
import { houseBalance, houseBalanceParty, nationalSeatTotals } from '../data/districtLeans';
import {
  baselineGaps,
  computeNationalRepresentationGap,
} from '../data/computeRepresentationGap';
import { AnimatedCount } from './AnimatedCount';

const TOTAL_SEATS = 435;

/**
 * The gap donut is drawn out of the gap itself, not out of the House: a full
 * orange ring is every gerrymandered seat still standing, and gray is what the
 * pacts have already returned. Against 435 the gap was a sliver that barely moved.
 */
const BASELINE_GAP = computeNationalRepresentationGap(baselineGaps);

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

/** A ring of `slices` out of `total` seats, with `children` centered in the hole. */
function StatDonut({
  slices,
  total,
  centerColor,
  ariaLabel,
  children,
}: {
  slices: DonutSlice[];
  total: number;
  centerColor: string;
  ariaLabel: string;
  children: ReactNode;
}) {
  // Every arc runs from 12 o'clock through the end of its own slice, and they are
  // painted back to front so the earlier slices sit on top. Butting arcs end to end
  // instead would leave two of them meeting at 12 o'clock, and a sub-pixel rounding
  // difference there shows as a flicker while the ring animates. Stacked, each
  // boundary is one arc's edge lying over the color beneath it, and no arc needs a
  // dashoffset to find its start.
  let seatsDrawn = 0;
  const arcs = slices
    .map((slice) => ({ ...slice, seatsThrough: (seatsDrawn += slice.seats) }))
    .reverse();

  return (
    <svg className="stat-donut" viewBox="0 0 100 100" role="img" aria-label={ariaLabel}>
      {/* Rotated so every arc starts at 12 o'clock. */}
      <g transform="rotate(-90 50 50)">
        {arcs.map((arc) => {
          const length = (arc.seatsThrough / total) * CIRCUMFERENCE;
          return (
            <circle
              key={arc.key}
              className="stat-donut-arc"
              cx="50" cy="50" r={RADIUS}
              fill="none"
              stroke={arc.color}
              strokeWidth={STROKE}
              strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
            >
              <title>{arc.seats} {arc.label}</title>
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
  // Gray first, so progress reads the way a ring is meant to: it starts at 12
  // o'clock and sweeps clockwise as pacts are sealed. Orange second means orange
  // is the one drawn full and left underneath — what's still standing is whatever
  // gray hasn't reached yet.
  const gapSlices: DonutSlice[] = [
    {
      key: 'closed',
      seats: BASELINE_GAP - nationalRepresentationGap,
      color: EVEN_GRAY,
      label: 'gerrymandered seats your pacts have returned',
    },
    {
      key: 'gap',
      seats: nationalRepresentationGap,
      color: GAP_ORANGE,
      label: 'seats away from proportional',
    },
  ];

  return (
    <div className="stat-bar-wrapper">
      <div className="stat-bar">
        <div className="stat-block stat-block-inline">
          {/* Explicit breaks: the label box hugs its text, so setting the lines by
              hand is what keeps the two blocks symmetric about the divider — three
              lines here against the three on the right. */}
          <div className="stat-label">U.S. House<br />District<br />Margin</div>
          <StatDonut
            slices={balanceSlices}
            total={TOTAL_SEATS}
            centerColor={PARTY_COLORS[houseBalanceParty]}
            ariaLabel={`${nationalSeatTotals.dSeats} D-leaning, ${nationalSeatTotals.even} EVEN, ${nationalSeatTotals.rSeats} R-leaning districts`}
          >
            {houseBalanceParty}+{Math.abs(houseBalance)}
          </StatDonut>
        </div>

        <div className="stat-divider" />

        <div className="stat-block stat-block-inline">
          <div className="stat-label">National<br />Representation<br />Gap</div>
          <StatDonut
            slices={gapSlices}
            total={BASELINE_GAP}
            centerColor={GAP_ORANGE}
            ariaLabel={`${nationalRepresentationGap} of ${BASELINE_GAP} gerrymandered seats still away from proportional`}
          >
            <AnimatedCount value={nationalRepresentationGap} />
          </StatDonut>
        </div>
      </div>
    </div>
  );
}
