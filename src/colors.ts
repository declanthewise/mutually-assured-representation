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

/**
 * Endpoints of the underrepresentation ramp — what a match-graph box's border
 * says: how much of what its fair map owes the squeezed party the state has not
 * drawn, as a fraction of the debt.
 *
 * Party colors, because underrepresentation names a party: the blue end is a map
 * that owes Republicans districts, the red end one that owes Democrats. Note the
 * sign runs opposite to the lean ramp above — the gap is signed positive when the
 * *Democrats* are short, so positive is red here where positive is blue there.
 * The two agree about how nearly every state looks anyway, since a state's
 * gerrymander mostly points the way its lean does.
 *
 * The neutral is `EVEN_GRAY` rather than the lean ramp's near-white, because the
 * middle of this scale is something the box is claiming — a state at its
 * proportional share, which is the whole object of a pact — and it should read as
 * a color stated rather than as color running out. It is the same gray a chamber
 * no party commands wears in the pyramid two rows above it.
 *
 * **The domain plateaus at half the debt**, and that half is the claim: a state
 * that gives the squeezed party less than half the districts it is owed is failing
 * that party outright, and every state past that line is failing it, so they all
 * read solid. Only the states inside the line have anything left to grade. It is a
 * threshold, not a ramp with a ceiling bolted on, which is why the ramp is linear
 * up to it rather than eased — an S-curve would blur the one place the scale is
 * making a statement.
 *
 * Measuring against the debt rather than against the delegation is what puts the
 * big states where they belong. As a share of all its districts Texas is 9 of 38
 * and California 16 of 52, a quarter to a third, which drew them paler than
 * two-district Iowa; as a share of what they owe they are 9 of 17 and 16 of 20,
 * and both are solid. The gap never exceeds the debt on either board — the
 * squeezed party can be given none of its share but not less than none — so the
 * fraction stays inside ±1 and the clamp is belt and braces.
 */
export const UNDERREP_RANGE = [PARTY_COLORS.D, EVEN_GRAY, PARTY_COLORS.R];
export const UNDERREP_DOMAIN = [-0.5, 0, 0.5];

/**
 * The two route marks in a match-graph box's header: the governor's veto and the
 * citizens' initiative — what could change a state's map over the objection of
 * whoever drew it.
 *
 * Gray, and its own gray, because neither mark names a party. The pyramid beside them
 * is party-colored since branch control is a party fact; a veto and an initiative are
 * machinery, and would be saying something untrue in red or blue. Deliberately not
 * `EVEN_GRAY`, which already means "nobody's" in two places on the same box — the
 * neutral of the border ramp and a chamber no party commands — and not `TRACK_GRAY`,
 * which means an undrawn district. This one sits with the district count's #999 a few
 * units to its left, so the header reads as one quiet strip under the state's name.
 */
export const ROUTE_GRAY = '#8f8f88';
