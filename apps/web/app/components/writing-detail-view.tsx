import type {
  PublicSystemReference,
  PublicWritingCategory,
  PublicWritingTag,
  WritingPublicationAsset,
} from '@akiksystems/db';
import type {
  PlatformLocale,
  WritingDocument,
  WritingKind,
} from '@akiksystems/core';
import { Container, Heading, Link, Text } from '@akiksystems/ui';

import { SystemReference } from './system-reference';
import { WritingEditorialRenderer } from './writing-editorial-renderer';

export interface WritingDetailViewModel {
  locale: PlatformLocale;
  kind: WritingKind;
  title: string;
  summary: string;
  body: string | null;
  document: WritingDocument;
  assets: WritingPublicationAsset[];
  categories: PublicWritingCategory[];
  tags: PublicWritingTag[];
  systems: PublicSystemReference[];
}

function categoryHref(locale: PlatformLocale, slug: string): string {
  return locale === 'fr'
    ? `/fr/ecrits/categories/${slug}`
    : `/en/writings/categories/${slug}`;
}

function tagHref(locale: PlatformLocale, slug: string): string {
  return locale === 'fr'
    ? `/fr/ecrits/tags/${slug}`
    : `/en/writings/tags/${slug}`;
}

function kindLabel(kind: WritingKind, locale: PlatformLocale): string {
  if (kind === 'note') return 'Note';
  if (kind === 'article') return 'Article';
  return locale === 'fr' ? 'Essai' : 'Essay';
}

export function WritingDetailView({
  assetHref,
  backHref,
  backLabel,
  responsiveImages = false,
  writing,
}: {
  assetHref: (assetId: string, width?: number) => string;
  backHref: string;
  backLabel: string;
  responsiveImages?: boolean;
  writing: WritingDetailViewModel;
}) {
  return (
    <main className="aks-proof-page">
      <Container>
        <article className="aks-proof-stack">
          <header className="aks-proof-hero">
            <Text className="aks-proof-eyebrow" size="sm" tone="muted">
              {kindLabel(writing.kind, writing.locale)}
            </Text>
            <Heading level={1} size="lg">
              {writing.title}
            </Heading>
            <Text>{writing.summary}</Text>
          </header>

          {writing.categories.length > 0 ? (
            <nav
              className="aks-proof-actions"
              aria-label={
                writing.locale === 'fr'
                  ? 'Catégories éditoriales'
                  : 'Editorial categories'
              }
            >
              {writing.categories.map((category) => (
                <Link
                  href={categoryHref(writing.locale, category.slug)}
                  key={category.categoryId}
                >
                  {category.name}
                </Link>
              ))}
            </nav>
          ) : null}

          {writing.tags.length > 0 ? (
            <nav
              className="aks-proof-actions"
              aria-label={
                writing.locale === 'fr' ? 'Tags éditoriaux' : 'Editorial tags'
              }
            >
              {writing.tags.map((tag) => (
                <Link
                  href={tagHref(writing.locale, tag.slug)}
                  key={tag.tagId}
                >
                  {tag.name}
                </Link>
              ))}
            </nav>
          ) : null}

          {writing.systems.length > 0 ? (
            <section
              className="aks-proof-stack"
              aria-labelledby="writing-related-systems"
            >
              <div className="aks-profile-section-heading">
                <Heading id="writing-related-systems" level={2} size="sm">
                  {writing.locale === 'fr'
                    ? 'Systèmes liés'
                    : 'Related Systems'}
                </Heading>
                <Text size="sm" tone="muted">
                  {writing.locale === 'fr'
                    ? 'Références System publiées, résolues sans recopier leur contenu dans l’écrit.'
                    : 'Published System references resolved without copying System content into the Writing.'}
                </Text>
              </div>
              <div className="aks-system-reference-grid">
                {writing.systems.map((system) => (
                  <SystemReference key={system.id} reference={system} />
                ))}
              </div>
            </section>
          ) : null}

          <section
            aria-label={writing.locale === 'fr' ? 'Texte' : 'Text'}
            className="aks-writing-reader"
          >
            <WritingEditorialRenderer
              assetHref={assetHref}
              assets={writing.assets}
              document={writing.document}
              locale={writing.locale}
              responsiveImages={responsiveImages}
            />
          </section>

          <Text size="sm" tone="muted">
            {writing.locale === 'fr'
              ? 'Structure contrôlée par le produit · contenu éditorial administrable.'
              : 'Product-controlled structure · admin-managed editorial content.'}
          </Text>

          <Link href={backHref}>{backLabel}</Link>
        </article>
      </Container>
    </main>
  );
}
