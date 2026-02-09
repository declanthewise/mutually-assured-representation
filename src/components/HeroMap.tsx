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

    // Green (competitive) to gray (safe) based on % of safe seats
    const safeSeatsColorScale = d3.scaleLinear<string>()
      .domain([0, 100])
      .range(['#2ca25f', '#d0d0d0'])
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

    // Circles sized by nominal number of safe seats
    const maxSafeSeats = 32;
    const maxRadius = 35;
    const safeSeatsRadius = d3.scaleSqrt()
      .domain([0, maxSafeSeats])
      .range([0, maxRadius]);

    svg.append('g')
      .attr('class', 'safe-seat-circles')
      .selectAll('circle')
      .data((states as any).features)
      .join('circle')
      .attr('cx', (d: any) => path.centroid(d)[0])
      .attr('cy', (d: any) => path.centroid(d)[1])
      .attr('r', (d: any) => {
        const fips = d.id.toString().padStart(2, '0');
        const stateId = fipsToState[fips];
        const data = stateDataById[stateId];
        if (!data || data.safeSeats === 0) return 0;
        return safeSeatsRadius(data.safeSeats);
      })
      .attr('fill', '#e8a832')
      .attr('fill-opacity', 0.75)
      .attr('stroke', '#c98a1a')
      .attr('stroke-width', 0.5)
      .attr('pointer-events', 'none');

    // State abbreviation labels (drawn after circles so they render on top)
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
        return '#333';
      })
      .attr('pointer-events', 'none')
      .text((d: any) => {
        const fips = d.id.toString().padStart(2, '0');
        const stateId = fipsToState[fips];
        const data = stateDataById[stateId];
        if (!data) return '';
        return data.id;
      });

    // In-map annotation above NY/Michigan
    svg.append('text')
      .attr('x', 700)
      .attr('y', 42)
      .attr('font-size', '10px')
      .attr('fill', '#888')
      .attr('pointer-events', 'none')
      .selectAll('tspan')
      .data([
        'Circles sized by number of safe seats. States',
        'colored by percentage of competitive seats.',
        '(Safe = Cook PVI ≥ 10); 2020 apportionment'
      ])
      .join('tspan')
      .attr('x', 700)
      .attr('dy', (_d, i) => (i === 0 ? 0 : 13))
      .text(d => d);

  }, [topoData]);

  return (
    <svg ref={svgRef} className="hero-map" />
  );
}
