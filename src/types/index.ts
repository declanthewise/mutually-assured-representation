export type RedistrictingAuthority =
  | 'legislature'           // State legislature draws maps
  | 'independent_commission' // Independent citizen commission
  | 'politician_commission'  // Commission of politicians
  | 'advisory_commission';   // Advisory commission with legislature final say

export type StateControl = 'dem' | 'rep' | 'split';

export interface StateData {
  id: string;           // State abbreviation, e.g., "CA"
  name: string;         // Full name, e.g., "California"
  districts: number;    // Number of congressional districts (current)
  districts2032: number; // Projected districts after 2030 census reapportionment
  efficiencyGap: number; // Efficiency gap: positive = R advantage, negative = D advantage
  partisanLean: number; // Partisan lean amount: positive = D lean, negative = R lean
  stateControl: StateControl; // Party control: dem (trifecta), rep (trifecta), or split
  redistrictingAuthority: RedistrictingAuthority; // Who draws the congressional maps
  governorCanVeto: boolean;  // Can governor veto congressional redistricting maps
  hasBallotInitiative: boolean; // Does state allow citizen ballot initiatives
  safeSeats: number;    // Total safe seats (|PVI| >= 10)
  safeR: number;        // Safe Republican seats (R+10 or more)
  safeD: number;        // Safe Democratic seats (D+10 or more)
  competitiveSeats: number; // Competitive seats (|PVI| < 10)
}

export interface HoveredState {
  state: StateData;
  x: number;
  y: number;
}

export type MatchPair = [string, string];
