import { Container } from '@akiksystems/ui';
import { useEffect, useState, type PointerEvent } from 'react';

import { legalNavigationPages, type LegalNavigationPage } from '../i18n/legal-navigation';
import type { Locale } from '../i18n/locales';
import { announceHomeDescription } from './home-description-events';
import { homeLegalPresentation, homeSoonLabel } from './home-portal-content';

/**
 * The legal pages are in preparation, like the Writings and Learning doors: named, described on
 * the portal, never a link.
 */
export function ExperienceFooter({ home = false, locale }: { home?: boolean; locale: Locale }) {
  const [activeId, setActiveId] = useState<LegalNavigationPage['id'] | null>(null);

  useEffect(() => {
    if (!home) return;

    const clearSelectionOutsideLegal = (event: globalThis.PointerEvent) => {
      if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest('[data-home-preview-target="legal"]') !== null
      ) {
        return;
      }

      setActiveId(null);
      announceHomeDescription({ channel: 'pointer', content: null });
    };

    document.addEventListener('pointerdown', clearSelectionOutsideLegal);
    return () => document.removeEventListener('pointerdown', clearSelectionOutsideLegal);
  }, [home]);

  const previewFor = (page: LegalNavigationPage) => ({
    description: homeLegalPresentation[page.id].description[locale],
    label: page.label[locale],
  });

  const tactile = (event: PointerEvent<HTMLSpanElement>) =>
    event.pointerType === 'touch' || event.pointerType === 'pen';

  return (
    <footer
      className="aks-experience-footer aks-section-separator-before"
      data-home={home || undefined}
    >
      <Container width="wide">
        <div className="aks-experience-footer-inner">
          <p>© {new Date().getUTCFullYear()} AkikSystems</p>
          <nav aria-label={locale === 'fr' ? 'Informations légales' : 'Legal information'}>
            {legalNavigationPages.map((page) => (
              <span
                className={'aks-link' + (activeId === page.id ? ' is-active' : '')}
                data-home-preview-target={home ? 'legal' : undefined}
                data-state="soon"
                key={page.id}
                onPointerDown={
                  home
                    ? (event) => {
                        if (!tactile(event)) return;
                        setActiveId(page.id);
                        announceHomeDescription({ channel: 'pointer', content: previewFor(page) });
                      }
                    : undefined
                }
                onPointerEnter={
                  home
                    ? (event) => {
                        if (tactile(event)) return;
                        announceHomeDescription({ channel: 'pointer', content: previewFor(page) });
                      }
                    : undefined
                }
                onPointerLeave={
                  home
                    ? (event) => {
                        if (tactile(event)) return;
                        announceHomeDescription({ channel: 'pointer', content: null });
                      }
                    : undefined
                }
              >
                {page.label[locale]}
              </span>
            ))}
            <span className="aks-experience-footer-status">{homeSoonLabel[locale]}</span>
          </nav>
        </div>
      </Container>
    </footer>
  );
}
