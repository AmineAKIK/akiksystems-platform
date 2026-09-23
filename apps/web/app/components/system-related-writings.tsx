import type { PlatformLocale, WritingKind } from '@akiksystems/core';
import { Heading, Link, Text } from '@akiksystems/ui';

export interface SystemRelatedWritingItem {
  id: string;
  title: string;
  summary: string;
  href: string;
  kind: WritingKind;
}

function kindLabel(kind: WritingKind, locale: PlatformLocale): string {
  if (kind === 'note') return 'Note';
  if (kind === 'article') return 'Article';
  return locale === 'fr' ? 'Essai' : 'Essay';
}

export function SystemRelatedWritings({
  items,
  locale,
}: {
  items: SystemRelatedWritingItem[];
  locale: PlatformLocale;
}) {
  if (items.length === 0) return null;

  return (
    <section className="aks-proof-stack" aria-labelledby="related-writings">
      <div className="aks-profile-section-heading">
        <Heading id="related-writings" level={2} size="sm">
          {locale === 'fr' ? 'Écrits liés' : 'Related writings'}
        </Heading>
        <Text size="sm" tone="muted">
          {locale === 'fr'
            ? 'Écrits publiés qui référencent ce système depuis leur propre snapshot éditorial.'
            : 'Published Writings that reference this System from their own editorial snapshot.'}
        </Text>
      </div>

      <div className="aks-proof-stack">
        {items.map((writing) => (
          <article className="aks-admin-card" key={writing.id}>
            <div className="aks-proof-stack">
              <Text className="aks-proof-eyebrow" size="sm" tone="muted">
                {kindLabel(writing.kind, locale)}
              </Text>
              <Heading level={3} size="sm">
                {writing.title}
              </Heading>
              <Text>{writing.summary}</Text>
              <Link href={writing.href}>{locale === 'fr' ? 'Lire' : 'Read'}</Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
