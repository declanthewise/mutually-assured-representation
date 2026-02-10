import { StateData } from '../types';

// Efficiency gap calculated from PlanScore 2024 raw data (https://planscore.org)
// See scripts/calculate-metrics.cjs for calculation details
//
// Efficiency gap: EG = (Wasted Dem Votes - Wasted Rep Votes) / Total Votes
//   Uses estimated votes (votes_dem_est, votes_rep_est) to handle uncontested races
//
// Partisan lean: 2025 Cook PVI (75/25 weighted average of 2020+2024, relative to national average)
//   Positive = D lean, Negative = R lean
//
// Safe/competitive seats: Computed at runtime in safeSeats.ts from district-level PVI data
//
// 2032 projections based on Brennan Center projections using Census Bureau's Vintage 2025 estimates
//
// Sources:
// - https://github.com/PlanScore/National-EG-Map
// - https://www.cookpolitical.com/cook-pvi/2025-partisan-voting-index/district-map-and-list
// - https://en.wikipedia.org/wiki/Cook_Partisan_Voting_Index
// - https://www.brennancenter.org/our-work/analysis-opinion/big-changes-ahead-voting-maps-after-next-census

export const stateData: StateData[] = [
  {
    "id": "AL",
    "name": "Alabama",
    "districts": 7,
    "districts2032": 7,
    "efficiencyGap": -0.0808,
    "partisanLean": -15,
    "stateControl": "rep",
    "redistrictingAuthority": "legislature",
    "governorCanVeto": true,
    "hasBallotInitiative": false
  },
  {
    "id": "AK",
    "name": "Alaska",
    "districts": 1,
    "districts2032": 1,
    "efficiencyGap": 0,
    "partisanLean": -6,
    "stateControl": "rep",
    "redistrictingAuthority": "advisory_commission",
    "governorCanVeto": true,
    "hasBallotInitiative": true
  },
  {
    "id": "AZ",
    "name": "Arizona",
    "districts": 9,
    "districts2032": 10,
    "efficiencyGap": 0.2134,
    "partisanLean": -2,
    "stateControl": "split",
    "redistrictingAuthority": "independent_commission",
    "governorCanVeto": false,
    "hasBallotInitiative": true
  },
  {
    "id": "AR",
    "name": "Arkansas",
    "districts": 4,
    "districts2032": 4,
    "efficiencyGap": 0.1388,
    "partisanLean": -15,
    "stateControl": "rep",
    "redistrictingAuthority": "politician_commission",
    "governorCanVeto": true,
    "hasBallotInitiative": true
  },
  {
    "id": "CA",
    "name": "California",
    "districts": 52,
    "districts2032": 48,
    "efficiencyGap": -0.1018,
    "partisanLean": 12,
    "stateControl": "dem",
    "redistrictingAuthority": "independent_commission",
    "governorCanVeto": false,
    "hasBallotInitiative": true
  },
  {
    "id": "CO",
    "name": "Colorado",
    "districts": 8,
    "districts2032": 8,
    "efficiencyGap": 0.1201,
    "partisanLean": 6,
    "stateControl": "dem",
    "redistrictingAuthority": "independent_commission",
    "governorCanVeto": false,
    "hasBallotInitiative": true
  },
  {
    "id": "CT",
    "name": "Connecticut",
    "districts": 5,
    "districts2032": 5,
    "efficiencyGap": -0.3145,
    "partisanLean": 8,
    "stateControl": "dem",
    "redistrictingAuthority": "legislature",
    "governorCanVeto": false,
    "hasBallotInitiative": false
  },
  {
    "id": "DE",
    "name": "Delaware",
    "districts": 1,
    "districts2032": 1,
    "efficiencyGap": 0,
    "partisanLean": 8,
    "stateControl": "dem",
    "redistrictingAuthority": "legislature",
    "governorCanVeto": true,
    "hasBallotInitiative": false
  },
  {
    "id": "FL",
    "name": "Florida",
    "districts": 28,
    "districts2032": 31,
    "efficiencyGap": 0.1112,
    "partisanLean": -5,
    "stateControl": "rep",
    "redistrictingAuthority": "legislature",
    "governorCanVeto": true,
    "hasBallotInitiative": true
  },
  {
    "id": "GA",
    "name": "Georgia",
    "districts": 14,
    "districts2032": 15,
    "efficiencyGap": 0.1194,
    "partisanLean": -1,
    "stateControl": "rep",
    "redistrictingAuthority": "legislature",
    "governorCanVeto": true,
    "hasBallotInitiative": false
  },
  {
    "id": "HI",
    "name": "Hawaii",
    "districts": 2,
    "districts2032": 2,
    "efficiencyGap": -0.0947,
    "partisanLean": 13,
    "stateControl": "dem",
    "redistrictingAuthority": "politician_commission",
    "governorCanVeto": false,
    "hasBallotInitiative": false
  },
  {
    "id": "ID",
    "name": "Idaho",
    "districts": 2,
    "districts2032": 3,
    "efficiencyGap": 0.0929,
    "partisanLean": -18,
    "stateControl": "rep",
    "redistrictingAuthority": "independent_commission",
    "governorCanVeto": false,
    "hasBallotInitiative": true
  },
  {
    "id": "IL",
    "name": "Illinois",
    "districts": 17,
    "districts2032": 16,
    "efficiencyGap": -0.1723,
    "partisanLean": 6,
    "stateControl": "dem",
    "redistrictingAuthority": "legislature",
    "governorCanVeto": true,
    "hasBallotInitiative": true
  },
  {
    "id": "IN",
    "name": "Indiana",
    "districts": 9,
    "districts2032": 9,
    "efficiencyGap": 0.0861,
    "partisanLean": -9,
    "stateControl": "rep",
    "redistrictingAuthority": "legislature",
    "governorCanVeto": true,
    "hasBallotInitiative": false
  },
  {
    "id": "IA",
    "name": "Iowa",
    "districts": 4,
    "districts2032": 4,
    "efficiencyGap": 0.3697,
    "partisanLean": -6,
    "stateControl": "rep",
    "redistrictingAuthority": "advisory_commission",
    "governorCanVeto": true,
    "hasBallotInitiative": false
  },
  {
    "id": "KS",
    "name": "Kansas",
    "districts": 4,
    "districts2032": 4,
    "efficiencyGap": 0.0272,
    "partisanLean": -8,
    "stateControl": "split",
    "redistrictingAuthority": "legislature",
    "governorCanVeto": true,
    "hasBallotInitiative": false
  },
  {
    "id": "KY",
    "name": "Kentucky",
    "districts": 6,
    "districts2032": 6,
    "efficiencyGap": 0.0005,
    "partisanLean": -15,
    "stateControl": "split",
    "redistrictingAuthority": "legislature",
    "governorCanVeto": true,
    "hasBallotInitiative": false
  },
  {
    "id": "LA",
    "name": "Louisiana",
    "districts": 6,
    "districts2032": 6,
    "efficiencyGap": -0.0367,
    "partisanLean": -11,
    "stateControl": "rep",
    "redistrictingAuthority": "legislature",
    "governorCanVeto": true,
    "hasBallotInitiative": false
  },
  {
    "id": "ME",
    "name": "Maine",
    "districts": 2,
    "districts2032": 2,
    "efficiencyGap": -0.38,
    "partisanLean": 4,
    "stateControl": "dem",
    "redistrictingAuthority": "advisory_commission",
    "governorCanVeto": true,
    "hasBallotInitiative": true
  },
  {
    "id": "MD",
    "name": "Maryland",
    "districts": 8,
    "districts2032": 8,
    "efficiencyGap": -0.0671,
    "partisanLean": 15,
    "stateControl": "dem",
    "redistrictingAuthority": "legislature",
    "governorCanVeto": true,
    "hasBallotInitiative": true
  },
  {
    "id": "MA",
    "name": "Massachusetts",
    "districts": 9,
    "districts2032": 9,
    "efficiencyGap": -0.1763,
    "partisanLean": 14,
    "stateControl": "dem",
    "redistrictingAuthority": "legislature",
    "governorCanVeto": true,
    "hasBallotInitiative": true
  },
  {
    "id": "MI",
    "name": "Michigan",
    "districts": 13,
    "districts2032": 13,
    "efficiencyGap": 0.0487,
    "partisanLean": 0,
    "stateControl": "dem",
    "redistrictingAuthority": "independent_commission",
    "governorCanVeto": false,
    "hasBallotInitiative": true
  },
  {
    "id": "MN",
    "name": "Minnesota",
    "districts": 8,
    "districts2032": 7,
    "efficiencyGap": 0.0219,
    "partisanLean": 3,
    "stateControl": "dem",
    "redistrictingAuthority": "legislature",
    "governorCanVeto": true,
    "hasBallotInitiative": false
  },
  {
    "id": "MS",
    "name": "Mississippi",
    "districts": 4,
    "districts2032": 4,
    "efficiencyGap": 0.0107,
    "partisanLean": -11,
    "stateControl": "rep",
    "redistrictingAuthority": "legislature",
    "governorCanVeto": true,
    "hasBallotInitiative": true
  },
  {
    "id": "MO",
    "name": "Missouri",
    "districts": 8,
    "districts2032": 8,
    "efficiencyGap": 0.0784,
    "partisanLean": -9,
    "stateControl": "rep",
    "redistrictingAuthority": "politician_commission",
    "governorCanVeto": true,
    "hasBallotInitiative": true
  },
  {
    "id": "MT",
    "name": "Montana",
    "districts": 2,
    "districts2032": 2,
    "efficiencyGap": 0.308,
    "partisanLean": -10,
    "stateControl": "rep",
    "redistrictingAuthority": "independent_commission",
    "governorCanVeto": false,
    "hasBallotInitiative": true
  },
  {
    "id": "NE",
    "name": "Nebraska",
    "districts": 3,
    "districts2032": 3,
    "efficiencyGap": 0.2277,
    "partisanLean": -10,
    "stateControl": "rep",
    "redistrictingAuthority": "legislature",
    "governorCanVeto": true,
    "hasBallotInitiative": true
  },
  {
    "id": "NV",
    "name": "Nevada",
    "districts": 4,
    "districts2032": 4,
    "efficiencyGap": -0.2327,
    "partisanLean": -1,
    "stateControl": "dem",
    "redistrictingAuthority": "legislature",
    "governorCanVeto": true,
    "hasBallotInitiative": true
  },
  {
    "id": "NH",
    "name": "New Hampshire",
    "districts": 2,
    "districts2032": 2,
    "efficiencyGap": -0.4298,
    "partisanLean": 2,
    "stateControl": "rep",
    "redistrictingAuthority": "legislature",
    "governorCanVeto": true,
    "hasBallotInitiative": false
  },
  {
    "id": "NJ",
    "name": "New Jersey",
    "districts": 12,
    "districts2032": 12,
    "efficiencyGap": -0.1274,
    "partisanLean": 4,
    "stateControl": "dem",
    "redistrictingAuthority": "politician_commission",
    "governorCanVeto": false,
    "hasBallotInitiative": false
  },
  {
    "id": "NM",
    "name": "New Mexico",
    "districts": 3,
    "districts2032": 3,
    "efficiencyGap": -0.3986,
    "partisanLean": 4,
    "stateControl": "dem",
    "redistrictingAuthority": "legislature",
    "governorCanVeto": true,
    "hasBallotInitiative": true
  },
  {
    "id": "NY",
    "name": "New York",
    "districts": 26,
    "districts2032": 24,
    "efficiencyGap": -0.0404,
    "partisanLean": 8,
    "stateControl": "dem",
    "redistrictingAuthority": "independent_commission",
    "governorCanVeto": true,
    "hasBallotInitiative": false
  },
  {
    "id": "NC",
    "name": "North Carolina",
    "districts": 14,
    "districts2032": 15,
    "efficiencyGap": 0.1801,
    "partisanLean": -1,
    "stateControl": "split",
    "redistrictingAuthority": "legislature",
    "governorCanVeto": false,
    "hasBallotInitiative": false
  },
  {
    "id": "ND",
    "name": "North Dakota",
    "districts": 1,
    "districts2032": 1,
    "efficiencyGap": 0,
    "partisanLean": -18,
    "stateControl": "rep",
    "redistrictingAuthority": "legislature",
    "governorCanVeto": true,
    "hasBallotInitiative": true
  },
  {
    "id": "OH",
    "name": "Ohio",
    "districts": 15,
    "districts2032": 15,
    "efficiencyGap": 0.0444,
    "partisanLean": -5,
    "stateControl": "rep",
    "redistrictingAuthority": "politician_commission",
    "governorCanVeto": true,
    "hasBallotInitiative": true
  },
  {
    "id": "OK",
    "name": "Oklahoma",
    "districts": 5,
    "districts2032": 5,
    "efficiencyGap": 0.1183,
    "partisanLean": -17,
    "stateControl": "rep",
    "redistrictingAuthority": "legislature",
    "governorCanVeto": true,
    "hasBallotInitiative": true
  },
  {
    "id": "OR",
    "name": "Oregon",
    "districts": 6,
    "districts2032": 5,
    "efficiencyGap": -0.2194,
    "partisanLean": 8,
    "stateControl": "dem",
    "redistrictingAuthority": "legislature",
    "governorCanVeto": true,
    "hasBallotInitiative": true
  },
  {
    "id": "PA",
    "name": "Pennsylvania",
    "districts": 17,
    "districts2032": 16,
    "efficiencyGap": 0.0605,
    "partisanLean": -1,
    "stateControl": "split",
    "redistrictingAuthority": "legislature",
    "governorCanVeto": true,
    "hasBallotInitiative": false
  },
  {
    "id": "RI",
    "name": "Rhode Island",
    "districts": 2,
    "districts2032": 1,
    "efficiencyGap": -0.2618,
    "partisanLean": 8,
    "stateControl": "dem",
    "redistrictingAuthority": "legislature",
    "governorCanVeto": true,
    "hasBallotInitiative": false
  },
  {
    "id": "SC",
    "name": "South Carolina",
    "districts": 7,
    "districts2032": 7,
    "efficiencyGap": 0.1699,
    "partisanLean": -8,
    "stateControl": "rep",
    "redistrictingAuthority": "legislature",
    "governorCanVeto": true,
    "hasBallotInitiative": false
  },
  {
    "id": "SD",
    "name": "South Dakota",
    "districts": 1,
    "districts2032": 1,
    "efficiencyGap": 0,
    "partisanLean": -15,
    "stateControl": "rep",
    "redistrictingAuthority": "legislature",
    "governorCanVeto": true,
    "hasBallotInitiative": true
  },
  {
    "id": "TN",
    "name": "Tennessee",
    "districts": 9,
    "districts2032": 9,
    "efficiencyGap": 0.1074,
    "partisanLean": -14,
    "stateControl": "rep",
    "redistrictingAuthority": "legislature",
    "governorCanVeto": true,
    "hasBallotInitiative": false
  },
  {
    "id": "TX",
    "name": "Texas",
    "districts": 38,
    "districts2032": 42,
    "efficiencyGap": 0.0753,
    "partisanLean": -6,
    "stateControl": "rep",
    "redistrictingAuthority": "legislature",
    "governorCanVeto": true,
    "hasBallotInitiative": false
  },
  {
    "id": "UT",
    "name": "Utah",
    "districts": 4,
    "districts2032": 5,
    "efficiencyGap": 0.1825,
    "partisanLean": -11,
    "stateControl": "rep",
    "redistrictingAuthority": "advisory_commission",
    "governorCanVeto": true,
    "hasBallotInitiative": true
  },
  {
    "id": "VT",
    "name": "Vermont",
    "districts": 1,
    "districts2032": 1,
    "efficiencyGap": 0,
    "partisanLean": 17,
    "stateControl": "split",
    "redistrictingAuthority": "legislature",
    "governorCanVeto": true,
    "hasBallotInitiative": false
  },
  {
    "id": "VA",
    "name": "Virginia",
    "districts": 11,
    "districts2032": 11,
    "efficiencyGap": 0.0193,
    "partisanLean": 3,
    "stateControl": "split",
    "redistrictingAuthority": "politician_commission",
    "governorCanVeto": false,
    "hasBallotInitiative": false
  },
  {
    "id": "WA",
    "name": "Washington",
    "districts": 10,
    "districts2032": 10,
    "efficiencyGap": -0.1466,
    "partisanLean": 10,
    "stateControl": "dem",
    "redistrictingAuthority": "independent_commission",
    "governorCanVeto": false,
    "hasBallotInitiative": true
  },
  {
    "id": "WV",
    "name": "West Virginia",
    "districts": 2,
    "districts2032": 2,
    "efficiencyGap": 0.0758,
    "partisanLean": -21,
    "stateControl": "rep",
    "redistrictingAuthority": "legislature",
    "governorCanVeto": true,
    "hasBallotInitiative": false
  },
  {
    "id": "WI",
    "name": "Wisconsin",
    "districts": 8,
    "districts2032": 7,
    "efficiencyGap": 0.2337,
    "partisanLean": 0,
    "stateControl": "split",
    "redistrictingAuthority": "legislature",
    "governorCanVeto": true,
    "hasBallotInitiative": false
  },
  {
    "id": "WY",
    "name": "Wyoming",
    "districts": 1,
    "districts2032": 1,
    "efficiencyGap": 0,
    "partisanLean": -23,
    "stateControl": "rep",
    "redistrictingAuthority": "legislature",
    "governorCanVeto": true,
    "hasBallotInitiative": true
  }
];

export const stateDataById: Record<string, StateData> = Object.fromEntries(
  stateData.map(s => [s.id, s])
);
