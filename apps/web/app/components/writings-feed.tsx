import type { PublishedWritingListItem } from '@akiksystems/db';
import { Heading, Link, Text } from '@akiksystems/ui';

import type { Locale } from '../i18n/locales';

import './writings-feed.css';

function writingHref(locale: Locale, slug: string): string {
  return locale === 'fr'
    ? `/fr/ecrits/${slug}`
    : `/en/writings/${slug}`;
}

function categoryHref(locale: Locale, slug: string): string {
  return locale === 'fr'
    ? `/fr/ecrits/categories/${slug}`
    : `/en/writings/categories/${slug}`;
}

function tagHref(locale: Locale, slug: string): string {
  return locale === 'fr'
    ? `/fr/ecrits/tags/${slug}`
    : `/en/writings/tags/${slug}`;
}

function kindLabel(
  kind: PublishedWritingListItem['kind'],
  locale: Locale,
): string {
  if (kind === 'note') return 'Note';
  if (kind === 'article') return 'Article';
  return locale === 'fr' ? 'Essai' : 'Essay';
}

function publishedDate(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function WritingsFeed({
  emptyMessage,
  locale,
  writings,
}: {
  emptyMessage: string;
  locale: Locale;
  writings: PublishedWritingListItem[];
}) {
  if (writings.length === 0) {
    return (
      <Text className="aks-writings-feed-empty" tone="muted">
        {emptyMessage}
      </Text>
    );
  }

  return (
    <ol
      aria-label={locale === 'fr' ? 'Flux éditorial' : 'Editorial feed'}
      className="aks-writings-feed"
      data-writing-feed
    >
      {writings.map((writing) => (
        <li
          className="aks-writings-feed-item"
          data-writing-kind={writing.kind}
          key={writing.writingId}
        >
          <article className="aks-writings-feed-entry">
            <div className="aks-writings-feed-meta">
              <Text className="aks-proof-eyebrow" size="sm" tone="muted">
                {kindLabel(writing.kind, locale)}
              </Text>
              <Text size="sm" tone="muted">
                <time dateTime={writing.publishedAt.toISOString()}>
                  {publishedDate(writing.publishedAt, locale)}
                </time>
              </Text>
            </div>

            <div className="aks-writings-feed-copy">
              <Heading level={3} size="sm">
                <Link href={writingHref(locale, writing.slug)}>
                  {writing.title}
                </Link>
              </Heading>
              <Text className="aks-writings-feed-summary">
                {writing.summary}
              </Text>
            </div>

            {writing.categories.length > 0 || writing.tags.length > 0 ? (
              <div className="aks-writings-feed-taxonomy">
                {writing.categories.map((category) => (
                  <Link
                    href={categoryHref(locale, category.slug)}
                    key={category.categoryId}
                  >
                    {category.name}
                  </Link>
                ))}
                {writing.tags.map((tag) => (
                  <Link
                    aria-label={tag.name}
                    href={tagHref(locale, tag.slug)}
                    key={tag.tagId}
                  >
                    <span aria-hidden="true">#</span>
                    {tag.name}
                  </Link>
                ))}
              </div>
            ) : null}

            <Link
              className="aks-writings-feed-read"
              href={writingHref(locale, writing.slug)}
            >
              {locale === 'fr' ? 'Lire l’écrit' : 'Read writing'}
            </Link>
          </article>
        </li>
      ))}
    </ol>
  );
}
