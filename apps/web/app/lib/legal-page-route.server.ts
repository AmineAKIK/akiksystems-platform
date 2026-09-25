import {
  getPublishedLegalPage,
  legalPageDescription,
  type LegalPageKey,
} from '@akiksystems/db';
import type { PlatformLocale } from '@akiksystems/core';
import { data } from 'react-router';

import { legalPageHref } from '../i18n/legal-pages';
import { appDb } from './db.server';
import { publicNotFound } from './public-seo';

export async function loadLegalPage(
  pageKey: LegalPageKey,
  locale: PlatformLocale,
) {
  const page = await getPublishedLegalPage(appDb, { pageKey, locale });

  if (page === null) {
    throw publicNotFound('Legal page not found.');
  }

  const alternateLocale: PlatformLocale = locale === 'en' ? 'fr' : 'en';
  const alternate = await getPublishedLegalPage(appDb, {
    pageKey,
    locale: alternateLocale,
  });

  return data(
    {
      page,
      description: legalPageDescription(page),
      alternate:
        alternate === null
          ? null
          : {
              locale: alternateLocale,
              path: legalPageHref(pageKey, alternateLocale),
            },
      localContext: {
        title: page.title,
        alternateHref:
          alternate === null ? null : legalPageHref(pageKey, alternateLocale),
        shellMode: 'reading' as const,
      },
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      },
    },
  );
}
