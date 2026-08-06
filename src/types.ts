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

  // Who draws the maps. Unused at runtime today — kept for pact-feasibility work.
  districts2032: number;       // Projected districts after the 2030 census

  /**
   * Does an independent commission draw the congressional map — one that holds the
   * pen outright, not a commission the legislature can override or ignore? True for
   * six states. Politician commissions, advisory commissions and legislature-drawn
   * maps are all false, because in every one of those the elected branches decide.
   */
  independentCommission: boolean;
  governorCanVeto: boolean;    // Can the governor veto a congressional map
  hasBallotInitiative: boolean; // Does the state allow citizen initiatives

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
