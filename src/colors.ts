/**
 * One palette for the whole app. The two colors that carry meaning:
 *
 * - **Deep orange** is the representation gap — seats an enacted map denies. It
 *   is never used for anything else, so any orange on screen is a gap.
 * - **Warm gray** is fair representation: a state already at its proportional
 *   share, a pact that gets two states there, and the seats inside that share.
 *   It is the quiet half of the pair on purpose — the gap is the thing to look
 *   at, and fairness is what's left when the orange goes.
 *
 * Red and blue stay reserved for party, so they never compete with the
 * gap/fair reading.
 */

/**
 * Representation gap. Sampled off the top of the mushroom cloud's column, so the
 * gap on the map and the gap in the numbers are literally the same color.
 */
export const GAP_ORANGE = '#de7128';

export const PARTY_COLORS = { R: '#c93135', D: '#2e6da4' } as const;

/** Section-break rules, drawn by BipartiteMatchGraph. */
export const DIVIDER_GRAY = '#e0e0e0';

/**
 * Two readings on one color, which is deliberate — both are "no party's thumb on
 * this":
 *
 * - Neither party's: a district Cook rates EVEN, and a chamber no party commands
 *   (tied, or run by a cross-party coalition).
 * - Fair representation: proportional seats, and the pacts that produce them.
 *
 * It is light, so it carries marks and fills but not small text on the page's
 * near-white — where it labels a figure, the figure needs its own weight.
 */
export const EVEN_GRAY = '#c2c0b8';

/** Endpoints of the partisan-lean ramp: R at −20, neutral at 0, D at +20. */
export const LEAN_RANGE = [PARTY_COLORS.R, '#f0f0f0', PARTY_COLORS.D];
export const LEAN_DOMAIN = [-20, 0, 20];
