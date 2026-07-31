import { useEffect, useState } from 'react';
// `?url` emits the topology as its own hashed asset and hands back the URL —
// a plain JSON import would inline all ~112 KB into the JS bundle.
import topoUrl from './us-states-10m.json?url';

/**
 * Loads the US state boundaries at runtime rather than bundling them.
 *
 * Returns null until the fetch resolves. HeroMap already no-ops on a null
 * topology and builds once it arrives, so the map simply paints a beat late.
 */
export function useTopoData() {
  const [topoData, setTopoData] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(topoUrl)
      .then(res => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return res.json();
      })
      .then(data => {
        if (!cancelled) setTopoData(data);
      })
      .catch(err => console.error(`Failed to load map geometry from ${topoUrl}`, err));

    return () => {
      cancelled = true;
    };
  }, []);

  return topoData;
}
