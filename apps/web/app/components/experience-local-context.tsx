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
}

export function ExperienceLocalContext({
  destinationId,
  locale,
  currentTitle = null,
}: ExperienceLocalContextProps) {
  const dictionary = dictionaryFor(locale);
  const destination =
    destinationId === null ? null : destinationById(destinationId);
  const normalizedCurrentTitle = currentTitle?.trim() ?? '';
  const sectionLabel =
    destination === null
      ? normalizedCurrentTitle || dictionary.shell.homeLabel
      : destination.label[locale];
  const hasChildContext =
    destination !== null &&
    normalizedCurrentTitle.length > 0 &&
    normalizedCurrentTitle !== sectionLabel;

  return (
    <nav
      aria-label={dictionary.shell.currentContextLabel}
      className="aks-experience-context"
    >
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
