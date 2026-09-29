import { useEffect, useRef } from 'react';

export function SentinelMap({ label }: { label: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (node === null) return;
    let active = true;
    let teardown: (() => void) | undefined;

    const mount = async () => {
      const { mountSentinelMap } = await import('./sentinel-map');
      if (!active) return;
      teardown = mountSentinelMap(node);
    };

    if (!('IntersectionObserver' in window)) {
      void mount();
      return () => {
        active = false;
        teardown?.();
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        void mount();
      },
      { rootMargin: '300px 0px' },
    );
    observer.observe(node);

    return () => {
      active = false;
      observer.disconnect();
      teardown?.();
    };
  }, []);

  return <div aria-label={label} className="aks-systems-sentinel-map" ref={ref} role="region" />;
}
