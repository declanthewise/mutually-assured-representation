import { StateData } from '../../types';
import { stateData } from './stateData';

export interface StateGroup {
  key: string;
  label: string;
  description: string;
  range: string;
  states: StateData[];
}

const bigStates = stateData.filter(s => s.districts2022 >= 24);
const restStates = stateData.filter(s => s.districts2022 < 24);

export const stateGroups: StateGroup[] = [
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
    description: 'States with 2 to 23 districts. This is where most actionable matches live. Single-district states are shown but cannot be gerrymandered.',
    range: '1–23',
    states: restStates,
  },
];
