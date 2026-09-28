import { Link as RouterLink } from 'react-router';

import type { SystemsPageContent } from '../../content/systems.types';
import type { Locale } from '../../i18n/locales';
import { publicLanguageHref } from '../../lib/public-locales';
import { SystemsMediaPicture } from './systems-ui';

function SystemsHeroLinks({ content, locale }: { content: SystemsPageContent; locale: Locale }) {
  const alternateLocale: Locale = locale === 'fr' ? 'en' : 'fr';
  const alternateHref = publicLanguageHref(alternateLocale, `/${alternateLocale}/systems`);

  return (
    <>
      <RouterLink prefetch="intent" to={`/${locale}`} viewTransition>
        {content.nav.home}
      </RouterLink>
      <RouterLink
        prefetch="intent"
        to={locale === 'fr' ? '/fr/travailler-ensemble' : '/en/work-with-us'}
        viewTransition
      >
        {content.nav.perspectives}
      </RouterLink>
      <RouterLink
        prefetch="intent"
        to={locale === 'fr' ? '/fr/profil' : '/en/profile'}
        viewTransition
      >
        {content.nav.profile}
      </RouterLink>
      <RouterLink
        prefetch="intent"
        to={locale === 'fr' ? '/fr/ecrits' : '/en/writings'}
        viewTransition
      >
        {content.nav.writings}
      </RouterLink>
      <a
        aria-label={alternateLocale === 'fr' ? 'Passer en français' : 'Switch to English'}
        className="aks-systems-language"
        href={alternateHref}
        hrefLang={alternateLocale}
        lang={alternateLocale}
      >
        {alternateLocale.toUpperCase()}
      </a>
    </>
  );
}

export function SystemsHero({ content, locale }: { content: SystemsPageContent; locale: Locale }) {
  return (
    <header className="aks-systems-hero" data-systems-reveal>
      <SystemsMediaPicture className="aks-systems-hero-media" media={content.hero.media} />
      <div aria-hidden="true" className="aks-systems-hero-scrim" />

      <div className="aks-systems-hero-chrome">
        <RouterLink
          aria-label={locale === 'fr' ? 'AkikSystems, accueil' : 'AkikSystems, home'}
          className="aks-systems-brand"
          prefetch="intent"
          to={`/${locale}`}
          viewTransition
        >
          <span className="aks-systems-brand-name">AkikSystems</span>
          <span aria-hidden="true" className="aks-systems-brand-dot" />
          <span className="aks-systems-brand-section">
            {locale === 'fr' ? 'SYSTÈMES' : 'SYSTEMS'}
          </span>
        </RouterLink>

        <nav
          aria-label={locale === 'fr' ? 'Navigation Systèmes' : 'Systems navigation'}
          className="aks-systems-desktop-nav"
        >
          <SystemsHeroLinks content={content} locale={locale} />
        </nav>

        <details className="aks-systems-mobile-menu">
          <summary aria-label={content.nav.menu}>
            <span>{content.nav.menu}</span>
            <span aria-hidden="true">+</span>
          </summary>
          <nav
            aria-label={
              locale === 'fr' ? 'Navigation Systèmes mobile' : 'Mobile Systems navigation'
            }
          >
            <SystemsHeroLinks content={content} locale={locale} />
          </nav>
        </details>
      </div>

      <div className="aks-systems-hero-copy">
        <p className="aks-systems-kicker">{content.hero.eyebrow}</p>
        <h1>
          <span>{content.hero.title}</span>
          <strong>{content.hero.state}</strong>
        </h1>
        <p>{content.hero.intro}</p>
      </div>
    </header>
  );
}
