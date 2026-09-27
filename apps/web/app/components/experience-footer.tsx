import { Container } from '@akiksystems/ui';
import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from 'react';
import { Link, useNavigate } from 'react-router';

import { legalPageHref, legalPages } from '../i18n/legal-pages';
import type { Locale } from '../i18n/locales';
import { announceHomeDescription } from './home-description-events';
import { homeLegalPresentation } from './home-portal-content';

export function ExperienceFooter({
  home = false,
  locale,
}: {
  home?: boolean;
  locale: Locale;
}) {
  const navigate = useNavigate();
  const [activeHref, setActiveHref] = useState<string | null>(null);
  const lastPointerType = useRef<string | null>(null);

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

      setActiveHref(null);

      const activeElement = document.activeElement;
      if (
        activeElement instanceof HTMLElement &&
        activeElement.matches('[data-home-preview-target="legal"]')
      ) {
        activeElement.blur();
      }

      announceHomeDescription({ channel: 'pointer', content: null });
      announceHomeDescription({ channel: 'focus', content: null });
    };

    document.addEventListener('pointerdown', clearSelectionOutsideLegal);
    return () =>
      document.removeEventListener('pointerdown', clearSelectionOutsideLegal);
  }, [home]);

  const previewFor = (page: (typeof legalPages)[number]) => ({
    description: home
      ? homeLegalPresentation[page.id].description[locale]
      : page.content[locale].description,
    label: page.label[locale],
  });

  const followLegalPage = (
    event: MouseEvent<HTMLAnchorElement>,
    href: string,
    page: (typeof legalPages)[number],
  ) => {
    if (
      !home ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const tactile =
      lastPointerType.current === 'touch' ||
      lastPointerType.current === 'pen';

    if (tactile && activeHref !== href) {
      event.preventDefault();
      setActiveHref(href);
      announceHomeDescription({
        channel: 'pointer',
        content: previewFor(page),
      });
      return;
    }

    event.preventDefault();
    setActiveHref(href);
    window.setTimeout(() => navigate(href), 160);
  };

  return (
    <footer
      className="aks-experience-footer aks-section-separator-before"
      data-home={home || undefined}
    >
      <Container width="wide">
        <div className="aks-experience-footer-inner">
          <p>© {new Date().getUTCFullYear()} AkikSystems</p>
          <nav
            aria-label={
              locale === 'fr' ? 'Informations légales' : 'Legal information'
            }
          >
            {legalPages.map((page) => {
              const href = legalPageHref(page.id, locale);
              const preview = previewFor(page);

              return (
                <Link
                  className={
                    'aks-link' + (activeHref === href ? ' is-active' : '')
                  }
                  data-home-preview-target={home ? 'legal' : undefined}
                  data-preview-copy={preview.description}
                  key={page.id}
                  onBlur={
                    home
                      ? () =>
                          announceHomeDescription({
                            channel: 'focus',
                            content: null,
                          })
                      : undefined
                  }
                  onFocus={
                    home
                      ? () =>
                          announceHomeDescription({
                            channel: 'focus',
                            content: preview,
                          })
                      : undefined
                  }
                  onKeyDown={
                    home
                      ? () => {
                          lastPointerType.current = null;
                        }
                      : undefined
                  }
                  onPointerDown={
                    home
                      ? (event: PointerEvent<HTMLAnchorElement>) => {
                          lastPointerType.current = event.pointerType;
                        }
                      : undefined
                  }
                  onPointerEnter={
                    home
                      ? (event) => {
                          if (
                            event.pointerType !== 'touch' &&
                            event.pointerType !== 'pen'
                          ) {
                            announceHomeDescription({
                              channel: 'pointer',
                              content: preview,
                            });
                          }
                        }
                      : undefined
                  }
                  onPointerLeave={
                    home
                      ? (event) => {
                          if (
                            event.pointerType !== 'touch' &&
                            event.pointerType !== 'pen'
                          ) {
                            announceHomeDescription({
                              channel: 'pointer',
                              content: null,
                            });
                          }
                        }
                      : undefined
                  }
                  onClick={(event) => followLegalPage(event, href, page)}
                  prefetch="intent"
                  to={href}
                >
                  {page.label[locale]}
                </Link>
              );
            })}
          </nav>
        </div>
      </Container>
    </footer>
  );
}
