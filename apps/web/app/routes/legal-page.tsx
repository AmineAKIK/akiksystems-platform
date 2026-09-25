import { LegalPageView } from '../components/legal-page-view';
import { legalPageById, legalPageHref, type LegalPageId } from '../i18n/legal-pages';
import { requireExactLocale, type Locale } from '../i18n/locales';
import { buildLocalizedPublicMeta } from '../lib/public-seo';

export function legalPageLoader(
  localeValue: string | undefined,
  expectedLocale: Locale,
  id: LegalPageId,
) {
  const locale = requireExactLocale(localeValue, expectedLocale);
  const page = legalPageById(id);
  return {
    content: page.content[locale],
    id,
    locale,
    localContext: {
      title: page.label[locale],
      alternateHref: legalPageHref(id, locale === 'en' ? 'fr' : 'en'),
    },
  };
}

export function legalPageMeta(id: LegalPageId, locale: Locale) {
  const page = legalPageById(id);
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
  return <LegalPageView content={props.content} id={props.id} locale={props.locale} />;
}
