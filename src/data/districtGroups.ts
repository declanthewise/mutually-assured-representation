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
  const d = state.districts2032;
  if (d >= 24) return 'big';
  if (d >= 7) return 'medium';
  if (d >= 2) return 'small';
  return 'single';
}

const bigStates = stateData.filter(s => getGroup(s) === 'big');
const mediumStates = stateData.filter(s => getGroup(s) === 'medium');
const smallStates = stateData.filter(s => getGroup(s) === 'small');
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
    key: 'medium',
    label: 'Medium States',
    description: 'States with 7 to 16 districts form the heart of potential pacts. This is where most actionable matches live.',
    range: '7–16',
    states: mediumStates,
  },
  {
    key: 'small',
    label: 'Small States',
    description: 'States with 2 to 6 districts have fewer seats at stake, but pacts here still matter at the margins.',
    range: '2–6',
    states: smallStates,
  },
  {
    key: 'single',
    label: 'Single-District States',
    description: 'States with only one at-large congressional district cannot be gerrymandered, so they are not part of any matching.',
    range: '1',
    states: singleStates,
  },
];
