import { useEffect, useRef } from 'react';

import { MapFullscreenFrame } from './map-fullscreen-frame';

/** The map is written in French; the English page loads its dictionary alongside it. */
export function ProtocapMap({ label, locale }: { label: string; locale: 'en' | 'fr' }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (node === null) return;
    let active = true;
    let teardown: (() => void) | undefined;

    const mount = async () => {
      const [{ mountProtocapMap }, dictionary] = await Promise.all([
        import('./protocap-map'),
        locale === 'en'
          ? import('./protocap-map.en').then((module) => module.default)
          : Promise.resolve(undefined),
      ]);
      if (!active) return;
      teardown = mountProtocapMap(node, dictionary);
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

  return (
    <MapFullscreenFrame locale={locale} name="ProtoCap">
      <div aria-label={label} className="aks-systems-protocap-map" ref={ref} role="region" />
    </MapFullscreenFrame>
  );
}
