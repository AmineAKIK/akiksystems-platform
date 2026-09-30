import { data, useLoaderData, type MetaDescriptor } from 'react-router';

import { requireExactLocale, type Locale } from '../i18n/locales';
import { buildLocalizedPublicMeta } from '../lib/public-seo';
import { publicOrigins } from '../lib/public-locales';
import { profilePageContent } from '../profile/content';
import { ProfilePage } from '../profile/profile-page';

const profilePaths: Record<Locale, string> = { en: '/en/profile', fr: '/fr/profil' };

export function profileLoader(localeValue: string | undefined, expected: Locale) {
  const locale = requireExactLocale(localeValue, expected);

  return data(
    {
      locale,
      localContext: {
        title: null,
        alternateHref: profilePaths[locale === 'en' ? 'fr' : 'en'],
      },
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
      },
    },
  );
}

export function profileMeta(locale: Locale): MetaDescriptor[] {
  const alternateLocale: Locale = locale === 'en' ? 'fr' : 'en';
  const content = profilePageContent[locale];

  return [
    ...buildLocalizedPublicMeta({
      title: content.meta.title,
      description: content.meta.description,
      locale,
      canonicalPath: profilePaths[locale],
      alternate: { locale: alternateLocale, path: profilePaths[alternateLocale] },
    }),
    {
      'script:ld+json': {
        '@context': 'https://schema.org',
        '@type': 'ProfilePage',
        name: content.meta.title,
        description: content.meta.description,
        mainEntity: {
          '@type': 'Person',
          name: content.identity.name.join(' '),
          jobTitle: content.identity.role,
          worksFor: { '@type': 'Organization', name: 'AkikSystems', url: publicOrigins[locale] },
          homeLocation: { '@type': 'Place', name: 'Châtellerault, France' },
          knowsLanguage: ['fr', 'ar', 'en'],
          sameAs: [content.identity.contacts.linkedin.href, content.identity.contacts.github.href],
        },
      },
    },
  ];
}

export function ProfileView() {
  const { locale } = useLoaderData<typeof profileLoader>();
  return <ProfilePage content={profilePageContent[locale]} locale={locale} />;
}
