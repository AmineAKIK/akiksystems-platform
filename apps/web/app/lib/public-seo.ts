import type { PlatformLocale } from '@akiksystems/core';
import { data, type MetaDescriptor } from 'react-router';

import { publicCanonicalUrl, publicUrlForLocale } from './public-locales';
const noIndexDirective = 'noindex, nofollow, noarchive, nosnippet';

function openGraphLocale(locale: PlatformLocale): 'en_US' | 'fr_FR' {
  return locale === 'fr' ? 'fr_FR' : 'en_US';
}

export function publicNotFound(message: string) {
  return data(message, {
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
  alternate: {
    locale: PlatformLocale;
    path: string;
  } | null;
}): MetaDescriptor[] {
  const canonicalUrl = publicCanonicalUrl(canonicalPath);
  const socialImageUrl = publicUrlForLocale(locale, '/brand/og-akiksystems.png');
  const socialImageAlt =
    locale === 'fr' ? 'AkikSystems — Systemic Scale' : 'AkikSystems — Systemic Scale';
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
    { property: 'og:image', content: socialImageUrl },
    { property: 'og:image:width', content: '1200' },
    { property: 'og:image:height', content: '630' },
    { property: 'og:image:type', content: 'image/png' },
    { property: 'og:image:alt', content: socialImageAlt },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    { name: 'twitter:image', content: socialImageUrl },
    { name: 'twitter:image:alt', content: socialImageAlt },
    { tagName: 'link', rel: 'canonical', href: canonicalUrl },
    {
      tagName: 'link',
      rel: 'alternate',
      hrefLang: locale,
      href: canonicalUrl,
    },
  ];

  if (alternate !== null) {
    const alternateUrl = publicCanonicalUrl(alternate.path);
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
        ? publicCanonicalUrl(alternate.path)
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
