import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { HoveredState } from '../types';
import { stateData, stateDataById } from '../data/stateData';
import { findMatches } from '../utils/findMatches';

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
  hoveredState: HoveredState | null;
}

export function USMap({ onHoverState, hoveredState }: USMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [matches, setMatches] = useState<string[]>([]);

  // Calculate matches when hovered state changes
  useEffect(() => {
    if (hoveredState) {
      const matchedStates = findMatches(hoveredState.state, stateData);
      setMatches(matchedStates.map(s => s.id));
    } else {
      setMatches([]);
    }
  }, [hoveredState]);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 960;
    const height = 600;

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    // Color scale: blue (D) to gray (neutral) to red (R)
    const colorScale = d3.scaleLinear<string>()
      .domain([-0.2, 0, 0.2])
      .range(['#2166ac', '#f0f0f0', '#b2182b'])
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
          return data ? colorScale(data.efficiencyGap) : '#ccc';
        })
        .attr('stroke', '#fff')
        .attr('stroke-width', 1)
        .style('cursor', 'pointer')
        .on('mouseenter', function(event: MouseEvent, d: any) {
          const fips = d.id.toString().padStart(2, '0');
          const stateId = fipsToState[fips];
          const data = stateDataById[stateId];
          if (data) {
            onHoverState({
              state: data,
              x: event.clientX,
              y: event.clientY
            });
          }
        })
        .on('mousemove', function(event: MouseEvent) {
          if (hoveredState) {
            onHoverState({
              ...hoveredState,
              x: event.clientX,
              y: event.clientY
            });
          }
        })
        .on('mouseleave', function() {
          onHoverState(null);
        });

      // State borders
      svg.append('path')
        .datum(topojson.mesh(us, us.objects.states, (a: any, b: any) => a !== b))
        .attr('fill', 'none')
        .attr('stroke', '#fff')
        .attr('stroke-width', 1)
        .attr('d', path);
    });
  }, [onHoverState]);

  // Update highlighting when matches change
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);

    svg.selectAll('.state')
      .attr('stroke', function() {
        const stateId = d3.select(this).attr('data-state');
        if (hoveredState && stateId === hoveredState.state.id) {
          return '#000';
        }
        if (matches.includes(stateId)) {
          return '#ffd700';
        }
        return '#fff';
      })
      .attr('stroke-width', function() {
        const stateId = d3.select(this).attr('data-state');
        if (hoveredState && stateId === hoveredState.state.id) {
          return 3;
        }
        if (matches.includes(stateId)) {
          return 3;
        }
        return 1;
      });
  }, [hoveredState, matches]);

  return (
    <svg ref={svgRef} className="us-map" />
  );
}
