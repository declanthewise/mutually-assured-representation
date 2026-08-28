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
 * A `duration` of zero sets the figure outright, with no run and no frame in between:
 * the match graph asks for that on a broken pact, where the state is going back to
 * what it was rather than arriving somewhere new.
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

    // A duration of zero means the figure isn't being counted to, it just *is* — the
    // match graph asks for that when a pact is broken, since an undo shouldn't read as
    // a second event. Taken here rather than by running the loop with a zero divisor,
    // which put a frame of `Infinity` on screen.
    if (duration <= 0) {
      shown.current = to;
      setDisplay(to);
      return;
    }

    let raf: number;

    const begin = () => {
      const start = performance.now();
      const tick = (now: number) => {
        // Clamped below as well as above: a rAF callback carries the frame's own
        // timestamp, which can predate the `performance.now()` taken just before it
        // was asked for, and a negative elapsed would step the figure past `from` in
        // the wrong direction for one frame.
        const t = Math.min(Math.max(now - start, 0) / duration, 1);
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
