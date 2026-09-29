import { useEffect, useRef } from 'react';

import { mountSentinelMap } from './sentinel-map';

export function SentinelMap({ label }: { label: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (node === null) return;
    return mountSentinelMap(node);
  }, []);

  return <div aria-label={label} className="aks-systems-sentinel-map" ref={ref} role="region" />;
}
