/**
 * One palette for the whole app. The two colors that carry meaning:
 *
 * - **Deep orange** is the representation gap — seats an enacted map denies. It
 *   is never used for anything else, so any orange on screen is a gap.
 * - **Black** is fair representation: a state already at its proportional
 *   share, a pact that gets two states there, and the seats inside that share.
 *
 * Red and blue stay reserved for party, so they never compete with the
 * gap/fair reading.
 */

/**
 * Representation gap. Sampled off the top of the mushroom cloud's column, so the
 * gap on the map and the gap in the numbers are literally the same color.
 */
export const GAP_ORANGE = '#de7128';

/**
 * Fair representation — proportional seats, and the pacts that produce them.
 * Note that black is also the interface's own emphasis color: hovered and
 * selected boxes in the match graph outline in it, so the two readings sit
 * closer together than the gap/fair pair does.
 */
export const FAIR_BLACK = '#000000';

export const PARTY_COLORS = { R: '#c93135', D: '#2e6da4' } as const;

/**
 * Neither party's: a district Cook rates EVEN, and a chamber no party commands
 * (tied, or run by a cross-party coalition).
 */
export const EVEN_GRAY = '#c2c0b8';

/**
 * The gap donut's empty track — the arc the orange has already been pulled off.
 * Warm, to sit with the page's off-white rather than against it, and light enough
 * to read as bare ring rather than as a slice of its own. Deliberately not
 * `FAIR_BLACK`: the seats a pact returns are fair representation, but the ring is
 * counting the gap, and what is left there is the gap's absence, not a mark
 * claiming anything.
 */
export const TRACK_GRAY = '#e8e8e4';

/** Endpoints of the partisan-lean ramp: R at −20, neutral at 0, D at +20. */
export const LEAN_RANGE = [PARTY_COLORS.R, '#f0f0f0', PARTY_COLORS.D];
export const LEAN_DOMAIN = [-20, 0, 20];
