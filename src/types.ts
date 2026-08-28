/**
 * Who holds one branch of a state government. 'split' is the branch nobody
 * commands: a tied chamber (Minnesota's 67–67 House) or one run by a
 * cross-party coalition (both of Alaska's).
 */
export type BranchControl = 'dem' | 'rep' | 'split';

export interface StateData {
  id: string;            // State abbreviation, e.g., "CA"
  name: string;          // Full name, e.g., "California"
  districts2022: number; // Congressional districts under the 2022 apportionment
  partisanLean: number;  // Statewide Cook PVI: positive = D lean, negative = R lean

  // The 2032 board's delegation — see data/plan2032.ts.
  districts2032: number;       // Projected districts after the 2030 census

  // Who draws the maps. All three are about congressional lines and only those:
  // several states set their state legislative lines by a different route entirely.
  // The reasoning for each state is in data/mapDrawingRules.md.
  /**
   * Does an independent commission draw the congressional map — one that holds the
   * pen outright, not a commission the legislature can override or ignore? True for
   * six states. Politician commissions, advisory commissions and legislature-drawn
   * maps are all false, because in every one of those the elected branches decide.
   * The one field here with no reader.
   */
  independentCommission: boolean;
  /**
   * Is the governor a real check on the congressional map? Both halves are required:
   * the plan has to reach the desk, and the override has to cost more than the
   * majority that passed it. So this is false in the eleven states where a commission
   * draws or the plan is never presented, false in California while Prop 50's map sits
   * in the constitution, and false in the six states that override on a bare majority
   * of the elected members, where a veto buys a second vote and nothing else.
   * True for 32.
   */
  governorCanVeto: boolean;
  /**
   * Can citizens put a change to map-drawing on the ballot? Narrower than "has some
   * form of direct democracy": Maryland and New Mexico have the popular referendum,
   * which strikes a law but cannot propose one; Illinois confines citizen amendments
   * to subjects that don't include congressional redistricting; Mississippi's process
   * has been void since 2021; and Alaska's reaches statutes while everything about its
   * redistricting is constitutional. True for 21.
   */
  hasBallotInitiative: boolean;

  // The three branches that have to agree to sign anything, drawn as the pyramid
  // on each match-graph box. A trifecta is simply all three matching.
  governorParty: BranchControl;
  senateParty: BranchControl;
  houseParty: BranchControl | null; // null → unicameral (Nebraska only)
}

export interface HoveredState {
  state: StateData;
  x: number;
  y: number;
}

export type MatchPair = [string, string];
