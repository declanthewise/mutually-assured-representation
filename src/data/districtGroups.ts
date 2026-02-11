import { StateData } from '../types';
import { stateData } from './stateData';

export interface DistrictGroup {
  key: string;
  label: string;
  description: string;
  range: string;
  states: StateData[];
}

function getGroup(state: StateData): string {
  const d = state.districts2022;
  if (d >= 24) return 'big';
  if (d >= 2) return 'midSmall';
  return 'single';
}

const bigStates = stateData.filter(s => getGroup(s) === 'big');
const midSmallStates = stateData.filter(s => getGroup(s) === 'midSmall');
const singleStates = stateData.filter(s => getGroup(s) === 'single');

export const districtGroups: DistrictGroup[] = [
  {
    key: 'big',
    label: 'The Big Four',
    description: 'The four largest states each have 24 or more congressional districts. Their sheer scale means any gerrymandering swings many seats.',
    range: '24+',
    states: bigStates,
  },
  {
    key: 'midSmall',
    label: 'Mid & Small States',
    description: 'States with 2 to 23 districts. This is where most actionable matches live.',
    range: '2–23',
    states: midSmallStates,
  },
  {
    key: 'single',
    label: 'Single-District States',
    description: 'States with only one at-large congressional district cannot be gerrymandered, so they are not part of any matching.',
    range: '1',
    states: singleStates,
  },
];
