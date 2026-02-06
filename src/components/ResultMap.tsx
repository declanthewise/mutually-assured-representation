import { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { MatchPair } from '../types';
import { stateDataById } from '../data/stateData';
import { fipsToState } from '../utils/fipsMapping';

interface ResultMapProps {
  topoData: any;
  selectedMatches: MatchPair[];
}

export function ResultMap({ topoData, selectedMatches }: ResultMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  // Set of all states that are part of a selected match
  const matchedStateIds = useMemo(() => {
    const ids = new Set<string>();
    for (const [a, b] of selectedMatches) {
      ids.add(a);
      ids.add(b);
    }
    return ids;
  }, [selectedMatches]);

  const hasMatches = selectedMatches.length > 0;

  useEffect(() => {
    if (!svgRef.current || !topoData) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 960;
    const height = 600;

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    // Green (competitive) to yellow (safe) based on % of safe seats
    const safeSeatsColorScale = d3.scaleLinear<string>()
      .domain([0, 100])
      .range(['#2ca25f', '#f0e442'])
      .clamp(true);

    const states = topojson.feature(topoData, topoData.objects.states);
    const projection = d3.geoAlbersUsa().fitSize([width, height], states as any);
    const path = d3.geoPath().projection(projection);

    // Compute centroids for arc drawing
    const centroids = new Map<string, [number, number]>();
    for (const feature of (states as any).features) {
      const fips = feature.id.toString().padStart(2, '0');
      const stateId = fipsToState[fips];
      if (stateId) {
        const centroid = path.centroid(feature);
        if (centroid[0] && centroid[1]) {
          centroids.set(stateId, centroid);
        }
      }
    }

    // Draw states
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

        if (hasMatches && !matchedStateIds.has(stateId)) {
          return '#e8e8e8';
        }
        const safePercent = (data.safeSeats / data.districts) * 100;
        return safeSeatsColorScale(safePercent);
      })
      .attr('stroke', (d: any) => {
        const fips = d.id.toString().padStart(2, '0');
        const stateId = fipsToState[fips];
        if (matchedStateIds.has(stateId)) return '#c9a227';
        return '#fff';
      })
      .attr('stroke-width', (d: any) => {
        const fips = d.id.toString().padStart(2, '0');
        const stateId = fipsToState[fips];
        if (matchedStateIds.has(stateId)) return 2.5;
        return 1;
      });

    // State borders
    svg.append('path')
      .datum(topojson.mesh(topoData, topoData.objects.states, (a: any, b: any) => a !== b))
      .attr('fill', 'none')
      .attr('stroke', '#fff')
      .attr('stroke-width', 0.5)
      .attr('d', path)
      .attr('pointer-events', 'none');

    // State labels
    svg.append('g')
      .selectAll('text')
      .data((states as any).features)
      .join('text')
      .attr('x', (d: any) => path.centroid(d)[0])
      .attr('y', (d: any) => path.centroid(d)[1])
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', (d: any) => {
        const fips = d.id.toString().padStart(2, '0');
        const stateId = fipsToState[fips];
        return matchedStateIds.has(stateId) ? '11px' : '9px';
      })
      .attr('font-weight', (d: any) => {
        const fips = d.id.toString().padStart(2, '0');
        const stateId = fipsToState[fips];
        return matchedStateIds.has(stateId) ? '700' : '500';
      })
      .attr('fill', (d: any) => {
        const fips = d.id.toString().padStart(2, '0');
        const stateId = fipsToState[fips];
        if (hasMatches && !matchedStateIds.has(stateId)) return '#bbb';
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

    // Draw connecting arcs for selected matches
    const arcGroup = svg.append('g').attr('class', 'arcs');

    for (const [stateA, stateB] of selectedMatches) {
      const c1 = centroids.get(stateA);
      const c2 = centroids.get(stateB);
      if (!c1 || !c2) continue;

      const midX = (c1[0] + c2[0]) / 2;
      const midY = (c1[1] + c2[1]) / 2;
      // Curve upward: offset the control point above the midpoint
      const dx = c2[0] - c1[0];
      const dy = c2[1] - c1[1];
      const dist = Math.sqrt(dx * dx + dy * dy);
      const curveOffset = Math.min(dist * 0.3, 80);
      const controlX = midX;
      const controlY = midY - curveOffset;

      arcGroup.append('path')
        .attr('d', `M ${c1[0]} ${c1[1]} Q ${controlX} ${controlY}, ${c2[0]} ${c2[1]}`)
        .attr('fill', 'none')
        .attr('stroke', '#c9a227')
        .attr('stroke-width', 2.5)
        .attr('stroke-linecap', 'round')
        .attr('opacity', 0.85);
    }
  }, [topoData, selectedMatches, matchedStateIds, hasMatches]);

  return (
    <div className="result-map-wrapper">
      <svg ref={svgRef} className="result-map" />
      {!hasMatches && (
        <p className="result-map-empty">
          Select match pairs from the sections above to build your de-escalation map.
        </p>
      )}
      {hasMatches && (
        <p className="result-map-count">
          {selectedMatches.length} {selectedMatches.length === 1 ? 'pact' : 'pacts'} selected
        </p>
      )}
    </div>
  );
}
