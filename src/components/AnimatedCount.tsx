import { ReactNode, useEffect, useRef, useState } from 'react';

/** How long a count takes to run from its old value to its new one. */
export const COUNT_DURATION_MS = 400;

/**
 * Counts from the previous value to the next one whenever `value` changes.
 *
 * A `delay` holds the run back so it can follow something else — a pact's gap
 * waits for its row to finish swelling. The old value stays on screen for the
 * whole wait, which is the point: it's the figure the delay exists to let you
 * read before it starts falling.
 *
 * Pass a function as the child to render the running figure yourself — for
 * anything that has to answer to the number actually on screen rather than the
 * one being counted towards, such as the colour it's drawn in.
 *
 * A run picks up from the figure on screen, not from the last value asked for,
 * so changing `duration` or `delay` mid-count carries on from there at the new
 * pace instead of stranding the count part-way. That's what happens when a pact
 * is sealed over a previous one that is still counting down: its boxes stop
 * settling, the count loses its swelled pace, and it has to finish anyway.
 */
export function AnimatedCount({
  value,
  duration = COUNT_DURATION_MS,
  delay = 0,
  children,
}: {
  value: number;
  duration?: number;
  delay?: number;
  children?: (shown: number) => ReactNode;
}) {
  const [display, setDisplay] = useState(value);
  /** The figure on screen, which is where the next run starts from. */
  const shown = useRef(value);

  useEffect(() => {
    const from = shown.current;
    const to = value;
    if (from === to) return;

    let raf: number;

    const begin = () => {
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min((now - start) / duration, 1);
        shown.current = Math.round(from + (to - from) * t);
        setDisplay(shown.current);
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    if (!delay) {
      begin();
      return () => cancelAnimationFrame(raf);
    }

    const timeoutId = setTimeout(begin, delay);
    return () => {
      clearTimeout(timeoutId);
      cancelAnimationFrame(raf);
    };
  }, [value, duration, delay]);

  return <>{children ? children(display) : display}</>;
}
