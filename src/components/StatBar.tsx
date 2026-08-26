import type { ReactNode } from 'react';
import { EVEN_GRAY, FAIR_BLACK, GAP_ORANGE, PARTY_COLORS, TRACK_GRAY } from '../colors';
import { houseBalance, houseBalanceParty, nationalSeatTotals } from '../data/districtLeans';
import {
  baselineGaps,
  computeNationalRepresentationGap,
} from '../data/computeRepresentationGap';
import { baseline2032Gap } from '../data/plan2032';
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

/**
 * Both readouts run the opposite way on the two boards, because the boards start from
 * opposite places.
 *
 * 2026 measures enacted maps, so both figures are full at the outset and the pacts
 * work them down: 104 of gap draining toward nothing, against a House already drawn
 * and a margin of R+24 that no pact may move.
 *
 * 2032 starts from a clean sheet, so both start at **0 and fill**. Nothing is drawn,
 * so no district belongs to anybody and the margin is EVEN; each pact draws the same
 * number for each party, so the ring fills red and blue in lockstep and the centre
 * never leaves zero — the tool's whole claim, shown rather than asserted. The gap
 * likewise counts only what the pacts have left behind, so it climbs from nothing as
 * states sign, matching the boxes, whose gap rows are blank until they do.
 */
interface StatBarProps {
  era: EraId;
  /** 2026: the gap still standing. 2032: the gap the pacts have left behind. */
  nationalRepresentationGap: number;
  /**
   * 2032 only — districts the pacts have settled, by party. Equal only where every
   * pact was evenly matched; what a pact leaves short is drawn by that state's own
   * majority and tilts the House. See computeDrawn2032.
   */
  drawn: { rSeats: number; dSeats: number };
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

/** Slices in seating order: D, the districts neither party holds, then R. */
const enactedBalanceSlices: DonutSlice[] = [
  { key: 'D', seats: nationalSeatTotals.dSeats, color: PARTY_COLORS.D, label: 'D-leaning' },
  { key: 'EVEN', seats: nationalSeatTotals.even, color: EVEN_GRAY, label: 'EVEN' },
  { key: 'R', seats: nationalSeatTotals.rSeats, color: PARTY_COLORS.R, label: 'R-leaning' },
];

export function StatBar({ era, nationalRepresentationGap, drawn }: StatBarProps) {
  const is2032 = era === '2032';
  const baseline = is2032 ? baseline2032Gap : BASELINE_GAP;

  // The undrawn remainder is bare track, not an EVEN district: nobody has decided it
  // either way, where an EVEN district is one a map drew and left competitive.
  const balanceSlices: DonutSlice[] = is2032
    ? [
        { key: 'D', seats: drawn.dSeats, color: PARTY_COLORS.D, label: 'districts your pacts have drawn D' },
        {
          key: 'UNDRAWN',
          seats: TOTAL_SEATS - drawn.dSeats - drawn.rSeats,
          color: TRACK_GRAY,
          label: 'districts no pact has drawn yet',
        },
        { key: 'R', seats: drawn.rSeats, color: PARTY_COLORS.R, label: 'districts your pacts have drawn R' },
      ]
    : enactedBalanceSlices;

  const balance = is2032 ? drawn.rSeats - drawn.dSeats : houseBalance;
  const balanceParty = is2032 ? (balance >= 0 ? 'R' : 'D') : houseBalanceParty;
  // Orange first, so the ring closes counter-clockwise: the orange arc runs from
  // 12 o'clock and each pact pulls its end back toward 12, bare track following
  // behind it. The track is drawn full and left underneath — what has come home is
  // everything the orange no longer covers.
  const gapSlices: DonutSlice[] = [
    {
      key: 'gap',
      seats: nationalRepresentationGap,
      color: GAP_ORANGE,
      label: is2032 ? 'seats your pacts have left short' : 'seats away from proportional',
    },
    {
      key: 'closed',
      seats: baseline - nationalRepresentationGap,
      color: TRACK_GRAY,
      label: is2032
        ? 'seats no pact has left short'
        : 'gerrymandered seats your pacts have returned',
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
            // A tie is nobody's, so it isn't drawn in either party's colour. Black,
            // not the EVEN gray, because a margin held at zero across every pact is
            // the fair-representation claim and not an undecided district.
            centerColor={balance === 0 ? FAIR_BLACK : PARTY_COLORS[balanceParty]}
            ariaLabel={balanceSlices.map(s => `${s.seats} ${s.label}`).join(', ')}
          >
            {/* Computed rather than hardcoded to EVEN, even though the 2032 board can
                only ever produce a tie: if the pact math ever stops balancing, the bar
                should say so instead of holding at zero on trust. */}
            {balance === 0 ? 'EVEN' : `${balanceParty}+${Math.abs(balance)}`}
          </StatDonut>
        </div>

        <div className="stat-divider" />

        <div className="stat-block stat-block-inline">
          <div className="stat-label">National<br />Representation<br />Gap</div>
          <StatDonut
            slices={gapSlices}
            total={baseline}
            centerColor={GAP_ORANGE}
            ariaLabel={`${nationalRepresentationGap} of ${baseline} gerrymandered seats still away from proportional`}
          >
            <AnimatedCount value={nationalRepresentationGap} />
          </StatDonut>
        </div>
      </div>
    </div>
  );
}
