import type { PlatformLocale } from '@akiksystems/core';
import type { MetaDescriptor } from 'react-router';

const canonicalOrigin = 'https://akiksystems.com';
const noIndexDirective = 'noindex, nofollow, noarchive, nosnippet';

function openGraphLocale(locale: PlatformLocale): 'en_US' | 'fr_FR' {
  return locale === 'fr' ? 'fr_FR' : 'en_US';
}

export function publicNotFound(message: string): Response {
  return new Response(message, {
    status: 404,
    headers: {
      'X-Robots-Tag': noIndexDirective,
    },
  });
}

export function buildNoIndexMeta(title: string): MetaDescriptor[] {
  return [
    { title },
    {
      name: 'robots',
      content: noIndexDirective,
    },
  ];
}

export function buildLocalizedPublicMeta({
  title,
  description,
  locale,
  canonicalPath,
  alternate,
}: {
  title: string;
  description: string;
  locale: PlatformLocale;
  canonicalPath: string;
  alternate:
    | {
        locale: PlatformLocale;
        path: string;
      }
    | null;
}): MetaDescriptor[] {
  const canonicalUrl = canonicalOrigin + canonicalPath;
  const descriptors: MetaDescriptor[] = [
    { title: title + ' · AkikSystems' },
    { name: 'description', content: description },
    {
      name: 'robots',
      content: 'index, follow, max-image-preview:large, max-snippet:-1',
    },
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: 'AkikSystems' },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:url', content: canonicalUrl },
    { property: 'og:locale', content: openGraphLocale(locale) },
    { name: 'twitter:card', content: 'summary' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    { tagName: 'link', rel: 'canonical', href: canonicalUrl },
    {
      tagName: 'link',
      rel: 'alternate',
      hrefLang: locale,
      href: canonicalUrl,
    },
  ];

  if (alternate !== null) {
    const alternateUrl = canonicalOrigin + alternate.path;
    descriptors.push(
      {
        property: 'og:locale:alternate',
        content: openGraphLocale(alternate.locale),
      },
      {
        tagName: 'link',
        rel: 'alternate',
        hrefLang: alternate.locale,
        href: alternateUrl,
      },
    );
  }

  const englishUrl =
    locale === 'en'
      ? canonicalUrl
      : alternate?.locale === 'en'
        ? canonicalOrigin + alternate.path
        : null;

  if (englishUrl !== null) {
    descriptors.push({
      tagName: 'link',
      rel: 'alternate',
      hrefLang: 'x-default',
      href: englishUrl,
    });
  }

  return descriptors;
}
