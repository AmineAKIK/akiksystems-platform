import type { PlatformLocale, WritingKind } from '@akiksystems/core';
import type { MetaDescriptor } from 'react-router';

import {
  buildLocalizedPublicMeta,
  publicCanonicalUrl,
} from './public-seo';

export interface WritingSeoInput {
  locale: PlatformLocale;
  kind: WritingKind;
  slug: string;
  title: string;
  summary: string;
  publishedAt: string;
  categories: Array<{ name: string }>;
  tags: Array<{ name: string }>;
  systems: Array<{ title: string; href: string }>;
  alternate:
    | {
        locale: PlatformLocale;
        slug: string;
      }
    | null;
}

export function writingHref(locale: PlatformLocale, slug: string): string {
  return locale === 'fr' ? `/fr/ecrits/${slug}` : `/en/writings/${slug}`;
}

function writingsHref(locale: PlatformLocale): string {
  return locale === 'fr' ? '/fr/ecrits' : '/en/writings';
}

function writingKindLabel(kind: WritingKind): string {
  if (kind === 'note') return 'Note';
  if (kind === 'essay') return 'Essay';
  return 'Article';
}

export function buildWritingStructuredData(writing: WritingSeoInput) {
  const canonicalPath = writingHref(writing.locale, writing.slug);
  const keywords = [
    ...writing.categories.map((category) => category.name),
    ...writing.tags.map((tag) => tag.name),
  ];

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': publicCanonicalUrl(canonicalPath) + '#article',
    headline: writing.title,
    description: writing.summary,
    url: publicCanonicalUrl(canonicalPath),
    mainEntityOfPage: publicCanonicalUrl(canonicalPath),
    datePublished: writing.publishedAt,
    inLanguage: writing.locale === 'fr' ? 'fr-FR' : 'en',
    genre: writingKindLabel(writing.kind),
    ...(writing.categories.length > 0
      ? { articleSection: writing.categories.map((category) => category.name) }
      : {}),
    ...(keywords.length > 0 ? { keywords } : {}),
    author: {
      '@type': 'Person',
      name: 'Amine AKIK',
      url: publicCanonicalUrl(
        writing.locale === 'fr' ? '/fr/profil' : '/en/profile',
      ),
    },
    publisher: {
      '@type': 'Organization',
      name: 'AkikSystems',
      url: publicCanonicalUrl('/en'),
    },
    isPartOf: {
      '@type': 'CollectionPage',
      name: writing.locale === 'fr' ? 'Écrits' : 'Writings',
      url: publicCanonicalUrl(writingsHref(writing.locale)),
    },
    ...(writing.systems.length > 0
      ? {
          about: writing.systems.map((system) => ({
            '@type': 'Thing',
            name: system.title,
            url: publicCanonicalUrl(system.href),
          })),
        }
      : {}),
  };
}

export function buildWritingMeta(writing: WritingSeoInput): MetaDescriptor[] {
  const canonicalPath = writingHref(writing.locale, writing.slug);
  const descriptors = buildLocalizedPublicMeta({
    title: writing.title,
    description: writing.summary,
    locale: writing.locale,
    canonicalPath,
    alternate:
      writing.alternate === null
        ? null
        : {
            locale: writing.alternate.locale,
            path: writingHref(writing.alternate.locale, writing.alternate.slug),
          },
  }).map((descriptor) =>
    'property' in descriptor && descriptor.property === 'og:type'
      ? { ...descriptor, content: 'article' }
      : descriptor,
  );

  descriptors.push(
    { property: 'article:published_time', content: writing.publishedAt },
    { property: 'article:section', content: writingKindLabel(writing.kind) },
    ...writing.tags.map(
      (tag): MetaDescriptor => ({
        property: 'article:tag',
        content: tag.name,
      }),
    ),
    { 'script:ld+json': buildWritingStructuredData(writing) },
  );

  return descriptors;
}
