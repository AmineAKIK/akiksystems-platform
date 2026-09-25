import { Container } from '@akiksystems/ui';
import { useState, type MouseEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { legalPageHref, legalPages } from '../i18n/legal-pages';
import type { Locale } from '../i18n/locales';
import { announceHomeDescription } from './home-description-events';

export function ExperienceFooter({ home = false, locale }: { home?: boolean; locale: Locale }) {
  const navigate = useNavigate();
  const [activeHref, setActiveHref] = useState<string | null>(null);

  const followLegalPage = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (
      !home ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    setActiveHref(href);
    window.setTimeout(() => navigate(href), 220);
  };

  return (
    <footer className="aks-experience-footer" data-home={home || undefined}>
      <Container width="wide">
        <div className="aks-experience-footer-inner">
          <p>© {new Date().getUTCFullYear()} AkikSystems</p>
          <nav aria-label={locale === 'fr' ? 'Informations légales' : 'Legal information'}>
            {legalPages.map((page) => {
              const href = legalPageHref(page.id, locale);
              return (
                <Link
                  className={`aks-link${activeHref === href ? ' is-active' : ''}`}
                  data-preview-copy={page.content[locale].description}
                  key={page.id}
                  onBlur={
                    home
                      ? () => announceHomeDescription({ channel: 'focus', content: null })
                      : undefined
                  }
                  onFocus={
                    home
                      ? () =>
                          announceHomeDescription({
                            channel: 'focus',
                            content: {
                              description: page.content[locale].description,
                              label: page.label[locale],
                            },
                          })
                      : undefined
                  }
                  onPointerEnter={
                    home
                      ? () =>
                          announceHomeDescription({
                            channel: 'pointer',
                            content: {
                              description: page.content[locale].description,
                              label: page.label[locale],
                            },
                          })
                      : undefined
                  }
                  onPointerLeave={
                    home
                      ? () => announceHomeDescription({ channel: 'pointer', content: null })
                      : undefined
                  }
                  onClick={(event) => followLegalPage(event, href)}
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
