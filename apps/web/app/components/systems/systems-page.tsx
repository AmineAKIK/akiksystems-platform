import { useEffect } from 'react';

import { systemsPageContent } from '../../content/systems-page-content';
import type { Locale } from '../../i18n/locales';
import { AtlasWorkspace } from './atlas-workspace';
import { Manifesto } from './manifesto';
import { OperationRail } from './operation-rail';
import { PerspectivesCTA } from './perspectives-cta';
import { QuickStationRow } from './quick-station-row';
import { StationFeature } from './station-feature';
import { StationPair } from './station-pair';
import { SystemsHero } from './systems-hero';
import { Workbench } from './workbench';

export function SystemsPage({ locale }: { locale: Locale }) {
  const content = systemsPageContent[locale];
  const [cirrus, mosaic, radar, sonar, detour] = content.stations;

  useEffect(() => {
    const page = document.querySelector('.aks-systems-page');
    if (!(page instanceof HTMLElement)) return;

    page.classList.add('is-motion-ready');
    const targets = [...page.querySelectorAll<HTMLElement>('[data-systems-reveal]')];

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      targets.forEach((target) => target.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);

  return (
    <main className="aks-systems-page" id="systems-main">
      <SystemsHero content={content} locale={locale} />
      <OperationRail items={content.rail} />

      <div className="aks-systems-canvas">
        <AtlasWorkspace content={content.atlas} />

        <section className="aks-systems-operations aks-systems-section" id="operations">
          <div className="aks-systems-section-heading" data-systems-reveal>
            <p className="aks-systems-kicker">{content.operations.eyebrow}</p>
            <h2>{content.operations.title}</h2>
            <p>{content.operations.intro}</p>
          </div>
          <StationFeature station={cirrus} />
          <StationPair stations={[mosaic, radar]} />
          <div className="aks-quick-stations">
            <QuickStationRow station={sonar} />
            <QuickStationRow station={detour} />
          </div>
        </section>
      </div>

      <Manifesto content={content.manifesto} />

      <div className="aks-systems-canvas">
        <Workbench content={content.workbench} />
      </div>

      <PerspectivesCTA content={content} locale={locale} />
    </main>
  );
}
