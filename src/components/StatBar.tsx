import type { ReactNode } from 'react';
import { EVEN_GRAY, GAP_ORANGE, PARTY_COLORS, TRACK_GRAY } from '../colors';
import { houseBalance, houseBalanceParty, nationalSeatTotals } from '../data/districtLeans';
import {
  baselineGaps,
  computeNationalRepresentationGap,
} from '../data/computeRepresentationGap';
import {
  baseline2032Gap,
  houseBalance2032,
  houseBalanceParty2032,
  nationalSeatTotals2032,
} from '../data/plan2032';
import type { EraId } from './BipartiteMatchGraph';
import { AnimatedCount } from './AnimatedCount';

const TOTAL_SEATS = 435;

/**
 * The gap donut is drawn out of the gap itself, not out of the House: orange is
 * every gerrymandered seat still standing — a full ring at the start — and bare
 * track is what the pacts have already returned. Against 435 the gap was a sliver
 * that barely moved.
 */
const BASELINE_GAP = computeNationalRepresentationGap(baselineGaps);

/** Donut geometry, in the 100×100 viewBox both rings draw into. */
const RADIUS = 40;
const STROKE = 13;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface StatBarProps {
  /** Which board is on screen — both readouts follow it. */
  era: EraId;
  /** The gap that board has left standing, measured against that board's baseline. */
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
const balanceSlicesFor = (totals: typeof nationalSeatTotals): DonutSlice[] => [
  { key: 'D', seats: totals.dSeats, color: PARTY_COLORS.D, label: 'D-leaning' },
  { key: 'EVEN', seats: totals.even, color: EVEN_GRAY, label: 'EVEN' },
  { key: 'R', seats: totals.rSeats, color: PARTY_COLORS.R, label: 'R-leaning' },
];

/**
 * Both readouts belong to a board, so both switch with it. The margin is the enacted
 * House either way — today's, or today's carried to the projected apportionment — and
 * neither version moves when a pact is signed, which is the claim the whole tool
 * makes. The gap is that board's own baseline counting down.
 *
 * The two boards are 104/R+24 and 97/R+40. Reapportionment costs the minority parties
 * slightly less than the maps already do, and hands Republicans sixteen points of
 * margin without a single line being redrawn differently — which is the argument for
 * showing the second board at all.
 */
const BOARDS = {
  '2026': {
    baseline: BASELINE_GAP,
    slices: balanceSlicesFor(nationalSeatTotals),
    totals: nationalSeatTotals,
    balance: houseBalance,
    party: houseBalanceParty,
  },
  '2032': {
    baseline: baseline2032Gap,
    slices: balanceSlicesFor(nationalSeatTotals2032),
    totals: nationalSeatTotals2032,
    balance: houseBalance2032,
    party: houseBalanceParty2032,
  },
} as const;

export function StatBar({ era, nationalRepresentationGap }: StatBarProps) {
  const board = BOARDS[era];
  // Orange first, so the ring closes counter-clockwise: the orange arc runs from
  // 12 o'clock and each pact pulls its end back toward 12, bare track following
  // behind it. The track is drawn full and left underneath — what has come home is
  // everything the orange no longer covers.
  const gapSlices: DonutSlice[] = [
    {
      key: 'gap',
      seats: nationalRepresentationGap,
      color: GAP_ORANGE,
      label: 'seats away from proportional',
    },
    {
      key: 'closed',
      seats: board.baseline - nationalRepresentationGap,
      color: TRACK_GRAY,
      label: 'gerrymandered seats your pacts have returned',
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
            slices={board.slices}
            total={TOTAL_SEATS}
            centerColor={PARTY_COLORS[board.party]}
            ariaLabel={`${board.totals.dSeats} D-leaning, ${board.totals.even} EVEN, ${board.totals.rSeats} R-leaning districts`}
          >
            {/* Counted rather than swapped: the sixteen points between the two boards
                are the census moving seats, and a figure that runs there says so where
                one that simply changed would read as a different statistic. */}
            <AnimatedCount value={Math.abs(board.balance)}>
              {shown => <>{board.party}+{shown}</>}
            </AnimatedCount>
          </StatDonut>
        </div>

        <div className="stat-divider" />

        <div className="stat-block stat-block-inline">
          <div className="stat-label">National<br />Representation<br />Gap</div>
          <StatDonut
            slices={gapSlices}
            total={board.baseline}
            centerColor={GAP_ORANGE}
            ariaLabel={`${nationalRepresentationGap} of ${board.baseline} gerrymandered seats still away from proportional`}
          >
            <AnimatedCount value={nationalRepresentationGap} />
          </StatDonut>
        </div>
      </div>
    </div>
  );
}
