import { useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { HoveredState } from '../types';
import { stateDataById } from '../data/stateData/stateData';
import { stateSafeSeats } from '../data/districtData/safeSeats';
import { computeSeatMisallocation, computeNationalSeatMisallocation } from '../utils/computeSeatMisallocation';
import { fipsToState } from '../utils/fipsMapping';

interface HeroMapProps {
  topoData: any;
  onHoverState: (state: HoveredState | null) => void;
}

export function HeroMap({ topoData, onHoverState }: HeroMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const onHoverStateRef = useRef(onHoverState);

  const totalNationalSeatMisallocation = useMemo(
    () => computeNationalSeatMisallocation(stateSafeSeats),
    []
  );

  useEffect(() => {
    onHoverStateRef.current = onHoverState;
  }, [onHoverState]);

  useLayoutEffect(() => {
    if (!svgRef.current || !topoData) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 960;
    const height = 600;

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    // Red/blue based on partisan lean (negative = R, positive = D)
    const leanColorScale = d3.scaleLinear<string>()
      .domain([-20, 0, 20])
      .range(['#c93135', '#f0f0f0', '#2e6da4'])
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
        return leanColorScale(data.partisanLean);
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

    // Icons sized by seat misallocation magnitude
    const maxMisallocation = 12;
    const maxRadius = 70;
    const misallocationRadius = d3.scaleSqrt()
      .domain([0, maxMisallocation])
      .range([0, maxRadius]);

    const featuresYSorted = [...(states as any).features].sort(
      (a: any, b: any) => path.centroid(a)[1] - path.centroid(b)[1]
    );

    svg.append('g')
      .attr('class', 'safe-seat-icons')
      .selectAll('image')
      .data(featuresYSorted)
      .join('image')
      .attr('href', '/mushroom-cloud.png')
      .attr('pointer-events', 'none')
      .each(function(d: any) {
        const fips = d.id.toString().padStart(2, '0');
        const stateId = fipsToState[fips];
        const safeCounts = stateSafeSeats[stateId];
        const stateData = stateDataById[stateId];
        const centroid = path.centroid(d);

        let diameter = 0;
        if (safeCounts && stateData) {
          const misallocation = Math.abs(computeSeatMisallocation(stateData, safeCounts));
          diameter = misallocation > 0 ? misallocationRadius(misallocation) * 2 : 0;
        }

        d3.select(this)
          .attr('x', centroid[0] - diameter / 2)
          .attr('y', centroid[1] - diameter / 2)
          .attr('width', diameter)
          .attr('height', diameter);
      });

  }, [topoData]);

  return (
    <>
      <div className="hero-stat-bar">
        <div className="hero-stat-label">Total Gerrymandered Seats</div>
        <div className="hero-stat-number"><span style={{ color: '#e8a832' }}>{totalNationalSeatMisallocation}</span><span style={{ color: '#000' }}>/435</span></div>
      </div>
      <svg ref={svgRef} className="hero-map" />
      <p className="hero-map-caption">
        Note: States colored by partisan lean (Cook PVI). Icons sized by seat misallocation — how many seats the enacted map over- or under-allocates to the minority party relative to each state's Cook PVI proportional ideal.
      </p>
    </>
  );
}
