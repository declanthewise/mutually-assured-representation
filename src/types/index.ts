export interface StateData {
  id: string;           // State abbreviation, e.g., "CA"
  name: string;         // Full name, e.g., "California"
  districts: number;    // Number of congressional districts
  efficiencyGap: number; // Efficiency gap: positive = R advantage, negative = D advantage
  lean: 'D' | 'R' | 'N'; // Partisan lean
}

export interface HoveredState {
  state: StateData;
  x: number;
  y: number;
}
