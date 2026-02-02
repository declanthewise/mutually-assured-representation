import { useState, useEffect } from 'react';

export function useTopoData() {
  const [topoData, setTopoData] = useState<any>(null);

  useEffect(() => {
    fetch('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json')
      .then(res => res.json())
      .then(data => setTopoData(data));
  }, []);

  return topoData;
}
