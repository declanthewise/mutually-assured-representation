import { useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { HoveredState, MatchPair } from '../types';
import { EVEN_GRAY, LEAN_DOMAIN, LEAN_RANGE, PARTY_COLORS } from '../colors';
import { stateDataById } from '../data/stateData';
import { baselineGaps, pactSeatsReturned } from '../data/computeRepresentationGap';
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
/** Breathing room left above and below the cropped map bounds. */
const VIEW_PAD = 4;

const MAX_REP_GAP = 16;
const MAX_ICON_RADIUS = 70;

/**
 * Badges are sized against the largest trade on the board rather than the largest
 * gap: a pact is capped by its smaller partner, so nine is the most any state can
 * win — California's 16 against Texas's or Florida's 9. Sizing against 16 would
 * leave every badge in the bottom half of the scale.
 */
const MAX_PACT_GAIN = 9;
const MAX_BADGE_RADIUS = 30;
/** A badge still has a number to hold when the pact returns nothing. */
const MIN_BADGE_RADIUS = 10;

function featureStateId(feature: any): string {
  return fipsToState[feature.id.toString().padStart(2, '0')];
}

/**
 * The party a pact hands seats to in a given state — the one the enacted map
 * shorted, so the opposite of whoever its gap favors. Texas is drawn R+9, so a
 * pact there returns seats to D; California is drawn D−16, so it returns R.
 * Read off the baseline gap, not the residual: sealing a pact would otherwise
 * repaint the badge it just drew.
 */
function gainingPartyColor(stateId: string): string {
  const gap = baselineGaps[stateId] ?? 0;
  if (gap === 0) return EVEN_GRAY;
  return gap > 0 ? PARTY_COLORS.D : PARTY_COLORS.R;
}

export function HeroMap({ topoData, onHoverState, selectedMatches, residualGaps }: HeroMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const onHoverStateRef = useRef(onHoverState);
  const pathRef = useRef<d3.GeoPath | null>(null);
  const centroidsRef = useRef(new Map<string, [number, number]>());
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

  // --- Build: geometry, state shapes and the layer stack. Runs once per topology.
  useLayoutEffect(() => {
    if (!svgRef.current || !topoData) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Red/blue based on partisan lean (negative = R, positive = D)
    const leanColorScale = d3.scaleLinear<string>()
      .domain(LEAN_DOMAIN)
      .range(LEAN_RANGE)
      .clamp(true);

    const states = topojson.feature(topoData, topoData.objects.states);
    const projection = d3.geoAlbersUsa().fitSize([WIDTH, HEIGHT], states as any);
    const path = d3.geoPath().projection(projection);
    pathRef.current = path;

    const centroids = new Map<string, [number, number]>();
    let californiaLeft = 0;
    for (const feature of (states as any).features) {
      const stateId = featureStateId(feature);
      const centroid = path.centroid(feature);
      if (stateId && centroid[0] && centroid[1]) {
        centroids.set(stateId, centroid as [number, number]);
      }
      if (stateId === 'CA') californiaLeft = path.bounds(feature)[0][0];
    }
    centroidsRef.current = centroids;

    // The AlbersUsa fit is width-bound, so it leaves ~19 units of dead space
    // above and below the geometry. Crop to what's actually drawn — clouds stay
    // inside those bounds, since they're centered on state centroids.
    const [[, minY], [, maxY]] = path.bounds(states as any);
    const viewTop = Math.max(0, minY - VIEW_PAD);
    const viewBottom = Math.min(HEIGHT, maxY + VIEW_PAD);

    // Sideways the fit is bound by Alaska's Aleutian tail: three dozen islands
    // too small to read, the westernmost of them a good 26 units past Alaska's
    // own mainland. Take California's coast as the left edge instead — the
    // furthest west anyone can actually see — and set it flush against the
    // frame, the way the fit already leaves Maine's easternmost point. No pad
    // on this side: the pad exists to keep a coast off the edge, and here the
    // coast on the edge is the point.
    svg.attr('viewBox', `${californiaLeft} ${viewTop} ${WIDTH - californiaLeft} ${viewBottom - viewTop}`);

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
      .on('mouseleave', function () {
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

    // Clouds track the gap, but a pact always clears both partners' — the badge
    // takes over from there, even where some gap survives the pact.
    const cloudDiameter = (d: any) => {
      const stateId = featureStateId(d);
      if (matchedStateIds.has(stateId)) return 0;
      const repGap = Math.abs(residualGaps[stateId] ?? 0);
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

    // The arc ties a pact's two badges together, so it is drawn in the same white
    // as the ring around each of them — one continuous white line through both,
    // reading over the map the way the state borders do. Full opacity for that
    // reason: at 0.85 the map tinted it and it stopped matching the rings.
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
          .attr('stroke', '#fff')
          .attr('stroke-width', 2.5)
          .attr('stroke-linecap', 'round')
          .attr('opacity', 0)
          .attr('d', arcPath)
          .call(s => s.transition().duration(450).attr('opacity', 1)),
        update => update.attr('d', arcPath),
        exit => exit.transition().duration(200).attr('opacity', 0).remove(),
      );

    // Badges: seats a pact hands back in each state, drawn in the color of the
    // party receiving them and sized by how many. Both partners return the same
    // number, so a pact reads as two circles of one size in the two party colors.
    const badgeRadius = d3.scaleSqrt()
      .domain([0, MAX_PACT_GAIN])
      .range([0, MAX_BADGE_RADIUS])
      .clamp(true);
    const radiusFor = (gain: number) => Math.max(MIN_BADGE_RADIUS, badgeRadius(gain));

    const badgeData = selectedMatches
      .flatMap(([a, b]) => {
        const gain = pactSeatsReturned(a, b);
        return [a, b].map(id => ({ id, gain, centroid: centroids.get(id) }));
      })
      .filter((d): d is { id: string; gain: number; centroid: [number, number] } => !!d.centroid);

    // Keyed by state, so re-pairing one updates a badge in place rather than
    // replacing it. Size and color have to be set on the merged selection for
    // that reason — an enter-only assignment would strand the old partner's.
    const badges = svg.select('.match-badges')
      .selectAll<SVGGElement, any>('g.match-badge')
      .data(badgeData, (d: any) => d.id)
      .join(
        enter => {
          const g = enter.append('g')
            .attr('class', 'match-badge')
            .attr('opacity', 0);
          g.append('circle')
            .attr('stroke', '#fff')
            .attr('stroke-width', 2.5);
          g.append('text')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'central')
            .attr('fill', '#fff')
            .attr('font-weight', 700);
          g.call(s => s.transition().duration(400).delay(250).attr('opacity', 1));
          return g;
        },
        update => update,
        exit => exit.transition().duration(200).attr('opacity', 0).remove(),
      )
      .attr('transform', d => `translate(${d.centroid[0]}, ${d.centroid[1]})`);

    badges.select('circle')
      .attr('r', d => radiusFor(d.gain))
      .attr('fill', d => gainingPartyColor(d.id));

    badges.select('text')
      .attr('font-size', d => Math.round(radiusFor(d.gain) * 0.95))
      .text(d => (d.gain > 0 ? `+${d.gain}` : '0'));
  }, [topoData, selectedMatches, matchedStateIds, residualGaps]);

  return <svg ref={svgRef} className="hero-map" />;
}
