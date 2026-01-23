import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { HoveredState } from '../types';
import { stateData, stateDataById } from '../data/stateData';
import { findMatches, DistrictYear } from '../utils/findMatches';
import type { MatchFilters } from '../App';

// FIPS code to state abbreviation mapping
const fipsToState: Record<string, string> = {
  '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA',
  '08': 'CO', '09': 'CT', '10': 'DE', '11': 'DC', '12': 'FL',
  '13': 'GA', '15': 'HI', '16': 'ID', '17': 'IL', '18': 'IN',
  '19': 'IA', '20': 'KS', '21': 'KY', '22': 'LA', '23': 'ME',
  '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN', '28': 'MS',
  '29': 'MO', '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH',
  '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND',
  '39': 'OH', '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI',
  '45': 'SC', '46': 'SD', '47': 'TN', '48': 'TX', '49': 'UT',
  '50': 'VT', '51': 'VA', '53': 'WA', '54': 'WV', '55': 'WI',
  '56': 'WY'
};

interface USMapProps {
  onHoverState: (state: HoveredState | null) => void;
  onClickState: (state: HoveredState | null) => void;
  activeState: HoveredState | null;
  isLocked: boolean;
  districtYear: DistrictYear;
  lockedStateId?: string | null;
  filters?: MatchFilters;
}

function MapLegend({ districtYear }: { districtYear: DistrictYear }) {
  const is2032 = districtYear === '2032';

  return (
    <div className="map-legend">
      <h3>{is2032 ? 'Partisan Lean' : 'Efficiency Gap (EG)'}</h3>
      <div className="legend-scale">
        <div className={`legend-gradient${is2032 ? ' lean' : ''}`} />
        <div className="legend-labels">
          <span>{is2032 ? 'R +20%' : 'D +20%'}</span>
          <span>Neutral</span>
          <span>{is2032 ? 'D +20%' : 'R +20%'}</span>
        </div>
      </div>
      <p className="legend-explanation">
        {is2032
          ? <>Based on <a href="https://en.wikipedia.org/wiki/2024_United_States_presidential_election" target="_blank" rel="noopener noreferrer">2024 presidential results</a>.</>
          : <>Measure of wasted votes. Data from <a href="https://github.com/PlanScore/National-EG-Map" target="_blank" rel="noopener noreferrer">PlanScore</a>.</>}
      </p>
    </div>
  );
}

export function USMap({ onHoverState, onClickState, activeState, isLocked, districtYear, lockedStateId, filters }: USMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [matches, setMatches] = useState<string[]>([]);

  // Use refs for handlers to avoid re-rendering the map
  const onHoverStateRef = useRef(onHoverState);
  const onClickStateRef = useRef(onClickState);
  const isLockedRef = useRef(isLocked);

  useEffect(() => {
    onHoverStateRef.current = onHoverState;
    onClickStateRef.current = onClickState;
    isLockedRef.current = isLocked;
  }, [onHoverState, onClickState, isLocked]);

  // Calculate matches when active state changes
  useEffect(() => {
    if (activeState) {
      const districts = districtYear === '2032'
        ? activeState.state.districts2032
        : activeState.state.districts;
      // Don't show matches for single-district states
      if (districts === 1) {
        setMatches([]);
      } else {
        const allMatches = findMatches(activeState.state, stateData, districtYear);
        // Apply filters
        const filteredMatches = allMatches.filter(match => {
          if (filters?.bothVeto && !(activeState.state.governorCanVeto && match.governorCanVeto)) {
            return false;
          }
          if (filters?.bothBallot && !(activeState.state.hasBallotInitiative && match.hasBallotInitiative)) {
            return false;
          }
          return true;
        });
        setMatches(filteredMatches.map(s => s.id));
      }
    } else {
      setMatches([]);
    }
  }, [activeState, districtYear, filters]);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 960;
    const height = 600;

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    // Color scale: blue (D) to gray (neutral) to red (R)
    // Efficiency gap: negative = D advantage, positive = R advantage
    // Partisan lean: positive = D lean, negative = R lean
    const egColorScale = d3.scaleLinear<string>()
      .domain([-0.2, 0, 0.2])
      .range(['#2166ac', '#f0f0f0', '#b2182b'])
      .clamp(true);

    const leanColorScale = d3.scaleLinear<string>()
      .domain([-20, 0, 20])
      .range(['#b2182b', '#f0f0f0', '#2166ac'])
      .clamp(true);

    // Load US Atlas TopoJSON
    d3.json('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json').then((us: any) => {
      const states = topojson.feature(us, us.objects.states);
      const projection = d3.geoAlbersUsa().fitSize([width, height], states as any);
      const path = d3.geoPath().projection(projection);

      // Draw states
      svg.append('g')
        .selectAll('path')
        .data((states as any).features)
        .join('path')
        .attr('d', path as any)
        .attr('class', 'state')
        .attr('data-state', (d: any) => {
          const fips = d.id.toString().padStart(2, '0');
          return fipsToState[fips] || '';
        })
        .attr('fill', (d: any) => {
          const fips = d.id.toString().padStart(2, '0');
          const stateId = fipsToState[fips];
          const data = stateDataById[stateId];
          if (!data) return '#ccc';
          const districts = districtYear === '2032' ? data.districts2032 : data.districts;
          // Gray out single-district states (can't be gerrymandered)
          if (districts === 1) return '#d0d0d0';
          // Use partisan lean for 2032, efficiency gap for current
          if (districtYear === '2032') {
            return leanColorScale(data.partisanLean);
          }
          return egColorScale(data.efficiencyGap);
        })
        .attr('stroke', '#fff')
        .attr('stroke-width', 1)
        .style('cursor', 'pointer')
        .on('mouseenter', function(event: MouseEvent, d: any) {
          if (isLockedRef.current) return;
          const fips = d.id.toString().padStart(2, '0');
          const stateId = fipsToState[fips];
          const data = stateDataById[stateId];
          if (data) {
            onHoverStateRef.current({
              state: data,
              x: event.clientX,
              y: event.clientY
            });
          }
        })
        .on('mousemove', function(event: MouseEvent, d: any) {
          if (isLockedRef.current) return;
          const fips = d.id.toString().padStart(2, '0');
          const stateId = fipsToState[fips];
          const data = stateDataById[stateId];
          if (data) {
            onHoverStateRef.current({
              state: data,
              x: event.clientX,
              y: event.clientY
            });
          }
        })
        .on('mouseleave', function() {
          if (isLockedRef.current) return;
          onHoverStateRef.current(null);
        })
        .on('click', function(event: MouseEvent, d: any) {
          const fips = d.id.toString().padStart(2, '0');
          const stateId = fipsToState[fips];
          const data = stateDataById[stateId];
          if (data) {
            onClickStateRef.current({
              state: data,
              x: event.clientX,
              y: event.clientY
            });
          }
        });

      // State borders
      svg.append('path')
        .datum(topojson.mesh(us, us.objects.states, (a: any, b: any) => a !== b))
        .attr('fill', 'none')
        .attr('stroke', '#fff')
        .attr('stroke-width', 1)
        .attr('d', path);

      // District count labels
      svg.append('g')
        .attr('class', 'labels')
        .selectAll('text')
        .data((states as any).features)
        .join('text')
        .attr('class', 'district-label')
        .attr('x', (d: any) => {
          const centroid = path.centroid(d);
          return centroid[0];
        })
        .attr('y', (d: any) => {
          const centroid = path.centroid(d);
          return centroid[1];
        })
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', '10px')
        .attr('font-weight', '600')
        .attr('fill', (d: any) => {
          const fips = d.id.toString().padStart(2, '0');
          const stateId = fipsToState[fips];
          const data = stateDataById[stateId];
          if (!data) return '#666';
          const districts = districtYear === '2032' ? data.districts2032 : data.districts;
          // Muted text for single-district states
          if (districts === 1) return '#888';
          // Use dark text on light backgrounds (near neutral)
          if (districtYear === '2032') {
            const lean = Math.abs(data.partisanLean);
            return lean < 8 ? '#333' : '#fff';
          }
          const eg = Math.abs(data.efficiencyGap);
          return eg < 0.08 ? '#333' : '#fff';
        })
        .attr('pointer-events', 'none')
        .text((d: any) => {
          const fips = d.id.toString().padStart(2, '0');
          const stateId = fipsToState[fips];
          const data = stateDataById[stateId];
          if (!data) return '';
          const districts = districtYear === '2032' ? data.districts2032 : data.districts;
          return districts.toString();
        });
    });
  }, [districtYear]);

  // Update highlighting when matches change
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);

    svg.selectAll('.state')
      .attr('stroke', function() {
        const stateId = d3.select(this).attr('data-state');
        if (lockedStateId && stateId === lockedStateId) {
          return '#000';
        }
        if (activeState && stateId === activeState.state.id) {
          return '#000';
        }
        if (matches.includes(stateId)) {
          return '#ffd700';
        }
        return '#fff';
      })
      .attr('stroke-width', function() {
        const stateId = d3.select(this).attr('data-state');
        if (lockedStateId && stateId === lockedStateId) {
          return 5;
        }
        if (activeState && stateId === activeState.state.id) {
          return 3;
        }
        if (matches.includes(stateId)) {
          return 3;
        }
        return 1;
      });
  }, [activeState, matches, lockedStateId]);

  return (
    <div className="map-wrapper">
      <svg ref={svgRef} className="us-map" />
      <MapLegend districtYear={districtYear} />
    </div>
  );
}
