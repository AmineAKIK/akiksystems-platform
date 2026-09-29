import { useEffect, useRef } from 'react';

/** The map is written in French; the English page loads its dictionary alongside it. */
export function SentinelMap({ label, locale }: { label: string; locale: 'en' | 'fr' }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (node === null) return;
    let active = true;
    let teardown: (() => void) | undefined;

    const mount = async () => {
      const [{ mountSentinelMap }, dictionary] = await Promise.all([
        import('./sentinel-map'),
        locale === 'en'
          ? import('./sentinel-map.en').then((module) => module.default)
          : Promise.resolve(undefined),
      ]);
      if (!active) return;
      teardown = mountSentinelMap(node, dictionary);
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
  }, [locale]);

  return <div aria-label={label} className="aks-systems-sentinel-map" ref={ref} role="region" />;
}
