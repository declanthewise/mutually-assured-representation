import { useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { HoveredState, MatchPair } from '../types';
import { EVEN_GRAY, FAIR_BLACK, LEAN_DOMAIN, LEAN_RANGE, PARTY_COLORS } from '../colors';
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

/**
 * Sealing a pact flies each badge in from its partner. The seats a badge counts
 * are seats the other state gave up, so the badge arrives from over there rather
 * than fading in where it lands — California's red badge sets out from Texas and
 * Texas's blue one from California, the two crossing at the midpoint because a
 * pact returns the same number on both sides.
 */
const PACT_TRAVEL_MS = 900;
/** The clouds take 500ms to clear; the flight leaves into the space they free. */
const PACT_TRAVEL_DELAY = 250;
/** Short enough that the badge is solid for nearly all of its flight. */
const PACT_FADE_MS = 250;
/** Gentle at both ends: a thing handed over, not fired across. */
const PACT_EASE = d3.easeCubicInOut;

function featureStateId(feature: any): string {
  return fipsToState[feature.id.toString().padStart(2, '0')];
}

/** One pact badge: the seats it counts, and the flight it makes to say so. */
interface BadgeDatum {
  id: string;
  gain: number;
  /** Its pact, which is the arc it rides. */
  key: string;
  /** True where it runs that arc from the far end back to the near one. */
  reverse: boolean;
  home: [number, number];
  from: [number, number];
}

/**
 * The party a pact hands seats to in a given state — the one the enacted map
 * shorted, so the opposite of whoever its gap favors. Texas is drawn R+9, so a
 * pact there returns seats to D; California is drawn D−16, so it returns R.
 * Read off the baseline gap, not the residual: sealing a pact would otherwise
 * repaint the badge it just drew.
 *
 * A pact capped at zero hands nothing to anybody, so both its badges go gray
 * however their states are drawn — a party color on a `0` would name a winner
 * of a trade that never happened.
 */
function badgeColor(d: BadgeDatum): string {
  if (d.gain === 0) return EVEN_GRAY;
  const gap = baselineGaps[d.id] ?? 0;
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

    // Reduced motion keeps the badges and the arc and drops the journey: the
    // pact still says what it says, it just doesn't fly across to say it.
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

    // The arc ties a pact's two badges together, so it is drawn in the same black
    // as the ring around each of them — one continuous line through both. Black
    // is the fair-representation color, which is what the arc is reporting: two
    // party-colored badges, joined by the pact that got them there. Full opacity,
    // so the map underneath can't tint it out of the match with the rings.
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
        enter => {
          const arc = enter.append('path')
            .attr('fill', 'none')
            .attr('stroke', FAIR_BLACK)
            .attr('stroke-width', 2.5)
            .attr('stroke-linecap', 'round')
            .attr('d', arcPath);

          if (reduceMotion) {
            return arc.attr('opacity', 0).call(s => s.transition().duration(450).attr('opacity', 1));
          }

          // The line exists only where a badge has already been: two tails, each
          // growing from the end its badge left from, at exactly the badge's pace.
          // They meet in the middle, which is where the badges cross, so the arc
          // completes on the frame the two pass each other and the second half of
          // the flight is flown over a finished line.
          //
          // One path draws both, as a dash pattern: a dash of the distance the
          // forward badge has covered, the untravelled gap, then a dash of the
          // same length for the badge coming the other way. Past the midpoint the
          // two tails overlap and it is simply solid.
          return arc
            .attr('stroke-dasharray', function () {
              return `0 ${this.getTotalLength()} 0`;
            })
            .call(s => s.transition()
              .delay(PACT_TRAVEL_DELAY)
              .duration(PACT_TRAVEL_MS)
              .ease(PACT_EASE)
              .attrTween('stroke-dasharray', function () {
                const len = this.getTotalLength();
                return (t: number) => {
                  if (t >= 0.5) return `${len}`;
                  const tail = t * len;
                  return `${tail} ${len - 2 * tail} ${tail}`;
                };
              })
              // Back to a plain solid line, so nothing downstream has to reason
              // about a dash pattern that has finished saying what it had to say.
              .on('end', function () {
                d3.select(this).attr('stroke-dasharray', null);
              }));
        },
        update => update.attr('d', arcPath),
        exit => exit.transition().duration(200).attr('opacity', 0).remove(),
      );

    // Sampled for the flight below: the badges ride the arc their pact just drew,
    // so they read their positions off the same geometry rather than a second copy
    // of the curve that could drift from it.
    const arcNodes = new Map<string, SVGPathElement>();
    svg.select('.match-arcs')
      .selectAll<SVGPathElement, any>('path')
      .each(function (d: any) {
        arcNodes.set(d.key, this);
      });

    // Badges: seats a pact hands back in each state, drawn in the color of the
    // party receiving them and sized by how many. Both partners return the same
    // number, so a pact reads as two circles of one size in the two party colors.
    const badgeRadius = d3.scaleSqrt()
      .domain([0, MAX_PACT_GAIN])
      .range([0, MAX_BADGE_RADIUS])
      .clamp(true);
    const radiusFor = (gain: number) => Math.max(MIN_BADGE_RADIUS, badgeRadius(gain));

    // Each badge lands on its own state and sets out from its partner's, so the
    // pair runs the one arc in opposite directions. The arc is drawn from the
    // pair's first state to its second, which is what `reverse` reads: the badge
    // that belongs to the first travels the curve back to front.
    const badgeData = selectedMatches
      .flatMap(([a, b]) => {
        const gain = pactSeatsReturned(a, b);
        const key = [a, b].slice().sort().join('-');
        return [
          { id: a, gain, key, reverse: true, home: centroids.get(a), from: centroids.get(b) },
          { id: b, gain, key, reverse: false, home: centroids.get(b), from: centroids.get(a) },
        ];
      })
      .filter((d): d is BadgeDatum => !!d.home && !!d.from);

    /** Where a badge sits at eased progress `t` of its flight. */
    const flightAt = (d: BadgeDatum) => {
      const arc = arcNodes.get(d.key);
      if (!arc) return () => `translate(${d.home[0]}, ${d.home[1]})`;
      const len = arc.getTotalLength();
      return (t: number) => {
        const point = arc.getPointAtLength((d.reverse ? 1 - t : t) * len);
        return `translate(${point.x}, ${point.y})`;
      };
    };

    // Keyed by state, so re-pairing one updates a badge in place rather than
    // replacing it. Size and color have to be set on the merged selection for
    // that reason — an enter-only assignment would strand the old partner's.
    const badges = svg.select('.match-badges')
      .selectAll<SVGGElement, BadgeDatum>('g.match-badge')
      .data(badgeData, (d: any) => d.id)
      .join(
        enter => {
          const g = enter.append('g')
            .attr('class', 'match-badge')
            .attr('opacity', 0)
            .attr('transform', d =>
              reduceMotion
                ? `translate(${d.home[0]}, ${d.home[1]})`
                : `translate(${d.from[0]}, ${d.from[1]})`);
          g.append('circle')
            .attr('stroke', FAIR_BLACK)
            .attr('stroke-width', 2.5);
          g.append('text')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'central')
            .attr('fill', '#fff')
            .attr('font-weight', 700);

          if (reduceMotion) {
            g.transition().duration(400).delay(PACT_TRAVEL_DELAY).attr('opacity', 1);
            return g;
          }

          // Two named transitions, so they run alongside each other: the badge
          // has to be solid early to be worth watching cross, but the flight is
          // what takes the time. Same delay, duration and easing as the arc, which
          // is what keeps each tail pinned to the badge laying it down.
          g.transition('fade').delay(PACT_TRAVEL_DELAY).duration(PACT_FADE_MS).attr('opacity', 1);
          g.transition('travel')
            .delay(PACT_TRAVEL_DELAY)
            .duration(PACT_TRAVEL_MS)
            .ease(PACT_EASE)
            .attrTween('transform', d => flightAt(d))
            // Sampling the curve lands within a rounding error of the centroid;
            // this puts the badge exactly on the state it belongs to.
            .on('end', function (d) {
              d3.select(this).attr('transform', `translate(${d.home[0]}, ${d.home[1]})`);
            });
          return g;
        },
        update => update.each(function (d) {
          // A badge still in the air keeps flying — writing its home position here
          // would snap it there mid-arc, with its tail already drawn behind it.
          if (!d3.active(this, 'travel')) {
            d3.select(this).attr('transform', `translate(${d.home[0]}, ${d.home[1]})`);
          }
        }),
        exit => exit.transition().duration(200).attr('opacity', 0).remove(),
      );

    badges.select('circle')
      .attr('r', d => radiusFor(d.gain))
      .attr('fill', badgeColor);

    badges.select('text')
      .attr('font-size', d => Math.round(radiusFor(d.gain) * 0.95))
      .text(d => (d.gain > 0 ? `+${d.gain}` : '0'));
  }, [topoData, selectedMatches, matchedStateIds, residualGaps]);

  return <svg ref={svgRef} className="hero-map" />;
}
