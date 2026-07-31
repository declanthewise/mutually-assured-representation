export type RedistrictingAuthority =
  | 'legislature'            // State legislature draws maps
  | 'independent_commission' // Independent citizen commission
  | 'politician_commission'  // Commission of politicians
  | 'advisory_commission';   // Advisory commission, legislature has final say

export type StateControl = 'dem' | 'rep' | 'split';

export interface StateData {
  id: string;            // State abbreviation, e.g., "CA"
  name: string;          // Full name, e.g., "California"
  districts2022: number; // Congressional districts under the 2022 apportionment
  partisanLean: number;  // Statewide Cook PVI: positive = D lean, negative = R lean

  // Who draws the maps. Unused at runtime today — kept for pact-feasibility work.
  districts2032: number;                          // Projected districts after the 2030 census
  stateControl: StateControl;                     // Trifecta control, or split
  redistrictingAuthority: RedistrictingAuthority; // Who draws the congressional maps
  governorCanVeto: boolean;                       // Can the governor veto a congressional map
  hasBallotInitiative: boolean;                   // Does the state allow citizen initiatives
}

export interface HoveredState {
  state: StateData;
  x: number;
  y: number;
}

export type MatchPair = [string, string];
