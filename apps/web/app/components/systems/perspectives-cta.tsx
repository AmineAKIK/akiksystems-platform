import { Link as RouterLink } from 'react-router';

import type { SystemsPageContent } from '../../content/systems.types';
import type { Locale } from '../../i18n/locales';
import { SystemsActionLink } from './systems-ui';

export function PerspectivesCTA({
  content,
  locale,
}: {
  content: SystemsPageContent;
  locale: Locale;
}) {
  return (
    <section className="aks-systems-perspectives" data-systems-reveal id="perspectives">
      <div className="aks-systems-perspectives-inner">
        <p className="aks-systems-kicker">{content.perspectives.eyebrow}</p>
        <h2>{content.perspectives.title}</h2>
        <p className="aks-systems-perspectives-intro">{content.perspectives.intro}</p>
        <div className="aks-systems-actions">
          {content.perspectives.actions.map((action) => (
            <SystemsActionLink action={action} key={action.label} />
          ))}
        </div>
      </div>

      <footer className="aks-systems-footer">
        <RouterLink
          className="aks-systems-footer-brand"
          prefetch="intent"
          to={`/${locale}`}
          viewTransition
        >
          <strong>AkikSystems</strong>
          <span>{content.footer.brandTagline}</span>
        </RouterLink>
        <nav aria-label={locale === 'fr' ? 'Liens légaux' : 'Legal links'}>
          {content.footer.legal.map((item) => (
            <RouterLink key={item.href} prefetch="intent" to={item.href} viewTransition>
              {item.label}
            </RouterLink>
          ))}
        </nav>
        <p>{content.footer.copyright}</p>
      </footer>
    </section>
  );
}
