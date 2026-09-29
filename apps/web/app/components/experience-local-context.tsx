import { Link } from 'react-router';

import {
  destinationById,
  destinationHref,
  type GlobalDestinationId,
} from '../i18n/global-destinations';
import { dictionaryFor, type Locale } from '../i18n/locales';

export interface ExperienceLocalContextProps {
  destinationId: GlobalDestinationId | null;
  locale: Locale;
  currentTitle?: string | null;
  /** Outside Home and the main destinations, the page's own title names the context. */
  home?: boolean;
}

export function ExperienceLocalContext({
  destinationId,
  locale,
  currentTitle = null,
  home = true,
}: ExperienceLocalContextProps) {
  const dictionary = dictionaryFor(locale);
  const destination = destinationId === null ? null : destinationById(destinationId);
  const standaloneTitle = currentTitle?.trim() ?? '';
  if (destination === null && !home && standaloneTitle.length === 0) return null;
  const sectionLabel =
    destination !== null
      ? destination.label[locale]
      : home
        ? dictionary.shell.homeLabel
        : standaloneTitle;
  const hasChildContext =
    currentTitle !== null && currentTitle.trim().length > 0 && currentTitle !== sectionLabel;

  return (
    <nav aria-label={dictionary.shell.currentContextLabel} className="aks-experience-context">
      <ol className="aks-experience-context-list">
        {hasChildContext && destination !== null ? (
          <>
            <li>
              <Link
                className="aks-link"
                prefetch="intent"
                to={destinationHref(destination.id, locale)}
                viewTransition
              >
                {sectionLabel}
              </Link>
            </li>
            <li aria-hidden="true" className="aks-experience-context-separator">
              /
            </li>
            <li>
              <span aria-current="page">{currentTitle}</span>
            </li>
          </>
        ) : (
          <li>
            <span aria-current="page">{sectionLabel}</span>
          </li>
        )}
      </ol>
    </nav>
  );
}
