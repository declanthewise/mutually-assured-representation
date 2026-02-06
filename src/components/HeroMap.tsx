import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { HoveredState } from '../types';
import { stateDataById } from '../data/stateData';
import { fipsToState } from '../utils/fipsMapping';

interface HeroMapProps {
  topoData: any;
  onHoverState: (state: HoveredState | null) => void;
}

export function HeroMap({ topoData, onHoverState }: HeroMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const onHoverStateRef = useRef(onHoverState);

  useEffect(() => {
    onHoverStateRef.current = onHoverState;
  }, [onHoverState]);

  useEffect(() => {
    if (!svgRef.current || !topoData) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 960;
    const height = 600;

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    // Light gray (competitive) to yellow (safe) based on % of safe seats
    const safeSeatsColorScale = d3.scaleLinear<string>()
      .domain([0, 100])
      .range(['#e3e3e3', '#f0e442'])
      .clamp(true);

    const states = topojson.feature(topoData, topoData.objects.states);
    const projection = d3.geoAlbersUsa().fitSize([width, height], states as any);
    const path = d3.geoPath().projection(projection);

    svg.append('g')
      .selectAll('path')
      .data((states as any).features)
      .join('path')
      .attr('d', path as any)
      .attr('fill', (d: any) => {
        const fips = d.id.toString().padStart(2, '0');
        const stateId = fipsToState[fips];
        const data = stateDataById[stateId];
        if (!data) return '#ccc';
        const safePercent = (data.safeSeats / data.districts) * 100;
        return safeSeatsColorScale(safePercent);
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .style('cursor', 'pointer')
      .on('mouseenter', function(event: MouseEvent, d: any) {
        const fips = d.id.toString().padStart(2, '0');
        const stateId = fipsToState[fips];
        const data = stateDataById[stateId];
        if (data) {
          d3.select(this).attr('stroke', '#333').attr('stroke-width', 2);
          onHoverStateRef.current({ state: data, x: event.clientX, y: event.clientY });
        }
      })
      .on('mousemove', function(event: MouseEvent, d: any) {
        const fips = d.id.toString().padStart(2, '0');
        const stateId = fipsToState[fips];
        const data = stateDataById[stateId];
        if (data) {
          onHoverStateRef.current({ state: data, x: event.clientX, y: event.clientY });
        }
      })
      .on('mouseleave', function() {
        d3.select(this).attr('stroke', '#fff').attr('stroke-width', 1);
        onHoverStateRef.current(null);
      });

    // State borders
    svg.append('path')
      .datum(topojson.mesh(topoData, topoData.objects.states, (a: any, b: any) => a !== b))
      .attr('fill', 'none')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .attr('d', path)
      .attr('pointer-events', 'none');

    // State abbreviation labels
    svg.append('g')
      .attr('class', 'labels')
      .selectAll('text')
      .data((states as any).features)
      .join('text')
      .attr('x', (d: any) => path.centroid(d)[0])
      .attr('y', (d: any) => path.centroid(d)[1])
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .attr('fill', (d: any) => {
        const fips = d.id.toString().padStart(2, '0');
        const stateId = fipsToState[fips];
        const data = stateDataById[stateId];
        if (!data) return '#666';
        if (data.districts === 1) return '#888';
        return '#333'; // Dark text works on both green and yellow
      })
      .attr('pointer-events', 'none')
      .text((d: any) => {
        const fips = d.id.toString().padStart(2, '0');
        const stateId = fipsToState[fips];
        const data = stateDataById[stateId];
        if (!data) return '';
        return data.id;
      });

    // In-map annotation, positioned in the Northeast/Great Lakes gap
    const noteGroup = svg.append('g')
      .attr('pointer-events', 'none');

    noteGroup.append('text')
      .attr('x', 700)
      .attr('y', 60)
      .attr('font-size', '13px')
      .attr('font-weight', '500')
      .attr('fill', '#6f6f6f')
      .attr('letter-spacing', '0.01em')
      .selectAll('tspan')
      .data([
        'Percentage of safe seats',
        '(Cook PVI ≥ 10)',
      ])
      .join('tspan')
      .attr('x', 700)
      .attr('dy', (_d, i) => (i === 0 ? 0 : 17))
      .text(d => d);
  }, [topoData]);

  return (
    <div className="hero-map-wrapper">
      <svg ref={svgRef} className="hero-map" />
    </div>
  );
}
