/**
 * One palette for the whole app. The two colors that carry meaning:
 *
 * - **Gold** is the representation gap — seats an enacted map denies. It is
 *   never used for anything else, so any gold on screen is a gap.
 * - **Forest green** is fair representation: a state already at its
 *   proportional share, a pact that gets two states there, and the seats
 *   inside that share.
 *
 * Red and blue stay reserved for party, so they never compete with the
 * gap/fair reading.
 */

/** Representation gap. */
export const GAP_GOLD = '#e8b31f';

/** Fair representation — proportional seats, and the pacts that produce them. */
export const FAIR_GREEN = '#2d6a4f';

export const PARTY_COLORS = { R: '#c93135', D: '#2e6da4' } as const;

/** Districts Cook rates EVEN. */
export const EVEN_GRAY = '#c2c0b8';

/** Endpoints of the partisan-lean ramp: R at −20, neutral at 0, D at +20. */
export const LEAN_RANGE = [PARTY_COLORS.R, '#f0f0f0', PARTY_COLORS.D];
export const LEAN_DOMAIN = [-20, 0, 20];
