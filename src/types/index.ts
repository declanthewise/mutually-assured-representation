export type RedistrictingAuthority =
  | 'legislature'           // State legislature draws maps
  | 'independent_commission' // Independent citizen commission
  | 'politician_commission'  // Commission of politicians
  | 'advisory_commission';   // Advisory commission with legislature final say

export interface StateData {
  id: string;           // State abbreviation, e.g., "CA"
  name: string;         // Full name, e.g., "California"
  districts: number;    // Number of congressional districts (current)
  districts2030: number; // Projected districts after 2030 census reapportionment
  efficiencyGap: number; // Efficiency gap: positive = R advantage, negative = D advantage
  lean: 'D' | 'R' | 'N'; // Partisan lean direction
  partisanLean: number; // Partisan lean amount: positive = D lean, negative = R lean
  redistrictingAuthority: RedistrictingAuthority; // Who draws the congressional maps
  governorCanVeto: boolean;  // Can governor veto congressional redistricting maps
  hasBallotInitiative: boolean; // Does state allow citizen ballot initiatives
}

export interface HoveredState {
  state: StateData;
  x: number;
  y: number;
}
