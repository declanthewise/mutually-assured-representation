import { nationalSeatTotals } from '../data/districtLeans';
import { AnimatedCount } from './AnimatedCount';

const TOTAL_SEATS = 435;

const PARTY_COLORS = { R: '#c93135', D: '#2e6da4' };
const GAP_COLOR = '#e8a832';

interface StatBarProps {
  nationalRepresentationGap: number;
}

/**
 * The House balance never moves: a pact returns the same number of seats to
 * each side, so the two halves cancel and the national party split is
 * untouched. Only the representation gap closes — which is the whole point.
 */
const houseBalance = nationalSeatTotals.rSeats - nationalSeatTotals.dSeats;
const balanceParty = houseBalance >= 0 ? 'R' : 'D';

export function StatBar({ nationalRepresentationGap }: StatBarProps) {
  return (
    <div className="stat-bar-wrapper">
      <div className="stat-bar">
        <div className="stat-block">
          <div className="stat-label">House Balance</div>
          <div className="stat-number">
            <span style={{ color: PARTY_COLORS[balanceParty] }}>
              {balanceParty}+{Math.abs(houseBalance)}
            </span>
          </div>
          <div className="stat-sub">
            {nationalSeatTotals.dSeats}D &middot; {nationalSeatTotals.even}EVEN &middot;{' '}
            {nationalSeatTotals.rSeats}R
          </div>
        </div>

        <div className="stat-divider" />

        <div className="stat-block">
          <div className="stat-label">National Representation Gap</div>
          <div className="stat-number">
            <span style={{ color: GAP_COLOR }}>
              <AnimatedCount value={nationalRepresentationGap} />
            </span>
            <span style={{ color: '#222' }}>/{TOTAL_SEATS}</span>
          </div>
          <div className="stat-sub">seats away from proportional</div>
        </div>
      </div>
    </div>
  );
}
