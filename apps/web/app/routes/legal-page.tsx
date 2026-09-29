import { LegalPageView } from '../components/legal-page-view';
import { isLegalPageOpen } from '../i18n/legal-navigation';
import { legalPageById, legalPageHref, type LegalPageId } from '../i18n/legal-pages';
import { requireExactLocale, type Locale } from '../i18n/locales';
import { buildLocalizedPublicMeta, buildNoIndexMeta } from '../lib/public-seo';
import { PendingPage } from './pending-destination';

// A legal page in preparation, like Writings and Learning, keeps its content in legal-pages.ts
// and answers with the pending page, unindexed, until it opens.

export function legalPageLoader(
  localeValue: string | undefined,
  expectedLocale: Locale,
  id: LegalPageId,
) {
  const locale = requireExactLocale(localeValue, expectedLocale);
  const page = legalPageById(id);
  return {
    content: isLegalPageOpen(id) ? page.content[locale] : null,
    id,
    locale,
    title: page.label[locale],
    localContext: {
      title: page.label[locale],
      alternateHref: legalPageHref(id, locale === 'en' ? 'fr' : 'en'),
    },
  };
}

export function legalPageMeta(id: LegalPageId, locale: Locale) {
  const page = legalPageById(id);
  if (!isLegalPageOpen(id)) return buildNoIndexMeta(`${page.label[locale]} · AkikSystems`);

  const content = page.content[locale];
  const alternateLocale = locale === 'en' ? 'fr' : 'en';
  return buildLocalizedPublicMeta({
    title: content.title,
    description: content.description,
    locale,
    canonicalPath: legalPageHref(id, locale),
    alternate: { locale: alternateLocale, path: legalPageHref(id, alternateLocale) },
  });
}

export function LegalPageRoute(props: ReturnType<typeof legalPageLoader>) {
  if (props.content === null) {
    return <PendingPage locale={props.locale} marker={props.id} title={props.title} />;
  }
  return <LegalPageView content={props.content} id={props.id} locale={props.locale} />;
}
