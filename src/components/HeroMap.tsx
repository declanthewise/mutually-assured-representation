import { useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { HoveredState, MatchPair } from '../types';
import { stateDataById } from '../data/stateData';
import { pactSeatsReturned } from '../data/computeRepresentationGap';
import { fipsToState } from '../map/fipsMapping';
import cloudUrl from '../map/mushroom-cloud.png';

interface HeroMapProps {
  topoData: any;
  onHoverState: (state: HoveredState | null) => void;
  selectedMatches: MatchPair[];
  residualGaps: Record<string, number>;
}

const WIDTH = 960;
const HEIGHT = 600;

const MAX_REP_GAP = 16;
const MAX_ICON_RADIUS = 70;
const BADGE_RADIUS = 17;

const MATCH_GOLD = '#c9a227';
const MATCH_GREEN = '#2ca25f';

function featureStateId(feature: any): string {
  return fipsToState[feature.id.toString().padStart(2, '0')];
}

export function HeroMap({ topoData, onHoverState, selectedMatches, residualGaps }: HeroMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const onHoverStateRef = useRef(onHoverState);
  const pathRef = useRef<d3.GeoPath | null>(null);
  const centroidsRef = useRef(new Map<string, [number, number]>());
  const matchedIdsRef = useRef(new Set<string>());
  const builtRef = useRef(false);

  const matchedStateIds = useMemo(() => {
    const ids = new Set<string>();
    for (const [a, b] of selectedMatches) {
      ids.add(a);
      ids.add(b);
    }
    return ids;
  }, [selectedMatches]);

  useEffect(() => {
    onHoverStateRef.current = onHoverState;
  }, [onHoverState]);

  // Keep the hover handlers (bound once) reading the latest match set.
  matchedIdsRef.current = matchedStateIds;

  // --- Build: geometry, state shapes and the layer stack. Runs once per topology.
  useLayoutEffect(() => {
    if (!svgRef.current || !topoData) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('viewBox', `0 0 ${WIDTH} ${HEIGHT}`);

    // Red/blue based on partisan lean (negative = R, positive = D)
    const leanColorScale = d3.scaleLinear<string>()
      .domain([-20, 0, 20])
      .range(['#c93135', '#f0f0f0', '#2e6da4'])
      .clamp(true);

    const states = topojson.feature(topoData, topoData.objects.states);
    const projection = d3.geoAlbersUsa().fitSize([WIDTH, HEIGHT], states as any);
    const path = d3.geoPath().projection(projection);
    pathRef.current = path;

    const centroids = new Map<string, [number, number]>();
    for (const feature of (states as any).features) {
      const stateId = featureStateId(feature);
      const centroid = path.centroid(feature);
      if (stateId && centroid[0] && centroid[1]) {
        centroids.set(stateId, centroid as [number, number]);
      }
    }
    centroidsRef.current = centroids;

    svg.append('g')
      .attr('class', 'state-shapes')
      .selectAll('path')
      .data((states as any).features)
      .join('path')
      .attr('d', path as any)
      .attr('fill', (d: any) => {
        const data = stateDataById[featureStateId(d)];
        return data ? leanColorScale(data.partisanLean) : '#ccc';
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .style('cursor', 'pointer')
      .on('mouseenter', function (event: MouseEvent, d: any) {
        const data = stateDataById[featureStateId(d)];
        if (!data) return;
        d3.select(this).attr('stroke', '#333').attr('stroke-width', 2);
        onHoverStateRef.current({ state: data, x: event.clientX, y: event.clientY });
      })
      .on('mousemove', function (event: MouseEvent, d: any) {
        const data = stateDataById[featureStateId(d)];
        if (!data) return;
        onHoverStateRef.current({ state: data, x: event.clientX, y: event.clientY });
      })
      .on('mouseleave', function (_event: MouseEvent, d: any) {
        const matched = matchedIdsRef.current.has(featureStateId(d));
        d3.select(this)
          .attr('stroke', matched ? MATCH_GOLD : '#fff')
          .attr('stroke-width', matched ? 2.5 : 1);
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

    // Mushroom clouds, largest-first so northern states don't bury southern ones
    const featuresYSorted = [...(states as any).features].sort(
      (a: any, b: any) => path.centroid(a)[1] - path.centroid(b)[1]
    );

    svg.append('g')
      .attr('class', 'safe-seat-icons')
      .selectAll('image')
      .data(featuresYSorted)
      .join('image')
      .attr('href', cloudUrl)
      .attr('pointer-events', 'none')
      .attr('x', (d: any) => path.centroid(d)[0])
      .attr('y', (d: any) => path.centroid(d)[1])
      .attr('width', 0)
      .attr('height', 0);

    svg.append('g').attr('class', 'match-arcs').attr('pointer-events', 'none');
    svg.append('g').attr('class', 'match-badges').attr('pointer-events', 'none');

    builtRef.current = true;
  }, [topoData]);

  // --- Update: swap clouds for pact badges as matches are made.
  useLayoutEffect(() => {
    if (!svgRef.current || !builtRef.current) return;

    const svg = d3.select(svgRef.current);
    const path = pathRef.current!;
    const centroids = centroidsRef.current;

    const repGapRadius = d3.scaleSqrt()
      .domain([0, MAX_REP_GAP])
      .range([0, MAX_ICON_RADIUS]);

    // Clouds track the gap that survives the pacts — a fully offset state clears.
    const cloudDiameter = (d: any) => {
      const repGap = Math.abs(residualGaps[featureStateId(d)] ?? 0);
      return repGap > 0 ? repGapRadius(repGap) * 2 : 0;
    };

    svg.select('.safe-seat-icons')
      .selectAll<SVGImageElement, any>('image')
      .transition()
      .duration(500)
      .ease(d3.easeCubicOut)
      .attr('width', cloudDiameter)
      .attr('height', cloudDiameter)
      .attr('x', (d: any) => path.centroid(d)[0] - cloudDiameter(d) / 2)
      .attr('y', (d: any) => path.centroid(d)[1] - cloudDiameter(d) / 2);

    svg.select('.state-shapes')
      .selectAll<SVGPathElement, any>('path')
      .transition()
      .duration(400)
      .attr('stroke', (d: any) => (matchedStateIds.has(featureStateId(d)) ? MATCH_GOLD : '#fff'))
      .attr('stroke-width', (d: any) => (matchedStateIds.has(featureStateId(d)) ? 2.5 : 1));

    // Gold arcs tie each pact together
    const arcData = selectedMatches
      .map(([a, b]) => ({ key: [a, b].slice().sort().join('-'), c1: centroids.get(a), c2: centroids.get(b) }))
      .filter((d): d is { key: string; c1: [number, number]; c2: [number, number] } => !!d.c1 && !!d.c2);

    const arcPath = (d: { c1: [number, number]; c2: [number, number] }) => {
      const [x1, y1] = d.c1;
      const [x2, y2] = d.c2;
      const dist = Math.hypot(x2 - x1, y2 - y1);
      const curveOffset = Math.min(dist * 0.3, 80);
      return `M ${x1} ${y1} Q ${(x1 + x2) / 2} ${(y1 + y2) / 2 - curveOffset}, ${x2} ${y2}`;
    };

    svg.select('.match-arcs')
      .selectAll<SVGPathElement, any>('path')
      .data(arcData, (d: any) => d.key)
      .join(
        enter => enter.append('path')
          .attr('fill', 'none')
          .attr('stroke', MATCH_GOLD)
          .attr('stroke-width', 2.5)
          .attr('stroke-linecap', 'round')
          .attr('opacity', 0)
          .attr('d', arcPath)
          .call(s => s.transition().duration(450).attr('opacity', 0.85)),
        update => update.attr('d', arcPath),
        exit => exit.transition().duration(200).attr('opacity', 0).remove(),
      );

    // Badges: seats a pact hands back to the under-represented party in each state
    const badgeData = selectedMatches
      .flatMap(([a, b]) => {
        const gain = pactSeatsReturned(a, b);
        return [a, b].map(id => ({ id, gain, centroid: centroids.get(id) }));
      })
      .filter((d): d is { id: string; gain: number; centroid: [number, number] } => !!d.centroid);

    svg.select('.match-badges')
      .selectAll<SVGGElement, any>('g.match-badge')
      .data(badgeData, (d: any) => d.id)
      .join(
        enter => {
          const g = enter.append('g')
            .attr('class', 'match-badge')
            .attr('opacity', 0);
          g.append('circle')
            .attr('r', BADGE_RADIUS)
            .attr('fill', MATCH_GREEN)
            .attr('stroke', '#fff')
            .attr('stroke-width', 2.5);
          g.append('text')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'central')
            .attr('fill', '#fff')
            .attr('font-size', 17)
            .attr('font-weight', 700);
          g.call(s => s.transition().duration(400).delay(250).attr('opacity', 1));
          return g;
        },
        update => update,
        exit => exit.transition().duration(200).attr('opacity', 0).remove(),
      )
      .attr('transform', d => `translate(${d.centroid[0]}, ${d.centroid[1]})`)
      .select('text')
      .text(d => (d.gain > 0 ? `+${d.gain}` : '0'));
  }, [topoData, selectedMatches, matchedStateIds, residualGaps]);

  return (
    <>
      <svg ref={svgRef} className="hero-map" />
      <p className="hero-map-caption">
        Note: States colored by partisan lean (2026 Cook PVI). Clouds sized by representation gap — the difference
        between the seats each party wins under the enacted district PVIs and the seats it would win under a
        proportional split of the state's own Cook PVI. A pact unwinds the lesser of its two partners' gaps in both
        states at once; the green badge counts the seats returned in each, and whatever gap survives keeps its cloud.
      </p>
    </>
  );
}
