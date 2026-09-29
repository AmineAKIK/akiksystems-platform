import { legalPageById, legalPageHref, type LegalPageId } from '../i18n/legal-pages';
import { requireExactLocale, type Locale } from '../i18n/locales';
import { buildNoIndexMeta } from '../lib/public-seo';
import { PendingPage } from './pending-destination';

// The legal pages are in preparation, like Writings and Learning: their content stays in
// legal-pages.ts for when they open, the routes answer with the pending page, unindexed.

export function legalPageLoader(
  localeValue: string | undefined,
  expectedLocale: Locale,
  id: LegalPageId,
) {
  const locale = requireExactLocale(localeValue, expectedLocale);
  const page = legalPageById(id);
  return {
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
  return buildNoIndexMeta(`${legalPageById(id).label[locale]} · AkikSystems`);
}

export function LegalPageRoute(props: ReturnType<typeof legalPageLoader>) {
  return <PendingPage locale={props.locale} marker={props.id} title={props.title} />;
}
