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
  const prev = useRef(value);

  useEffect(() => {
    const from = prev.current;
    const to = value;
    prev.current = value;
    if (from === to) return;

    let raf: number;

    const begin = () => {
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min((now - start) / duration, 1);
        setDisplay(Math.round(from + (to - from) * t));
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
