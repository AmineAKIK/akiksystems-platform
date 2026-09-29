import { useEffect, useRef } from 'react';

import { mountProtocapMap } from './protocap-map';

export function ProtocapMap({ label }: { label: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (node === null) return;
    return mountProtocapMap(node);
  }, []);

  return <div aria-label={label} className="aks-systems-protocap-map" ref={ref} role="region" />;
}
