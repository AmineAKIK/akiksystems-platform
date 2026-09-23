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
    <main
      className="aks-writing-detail-page"
      data-writing-kind={writing.kind}
    >
      <Container width="wide">
        <div className="aks-writing-detail-layout">
          <article className="aks-writing-article">
            <header className="aks-writing-detail-header">
              <Text className="aks-proof-eyebrow" size="sm" tone="muted">
                {kindLabel(writing.kind, writing.locale)}
              </Text>
              <Heading className="aks-writing-detail-title" level={1} size="lg">
                {writing.title}
              </Heading>
              <Text className="aks-writing-detail-summary" size="lg">
                {writing.summary}
              </Text>

              {writing.categories.length > 0 || writing.tags.length > 0 ? (
                <div className="aks-writing-taxonomy">
                  {writing.categories.length > 0 ? (
                    <nav
                      aria-label={
                        writing.locale === 'fr'
                          ? 'Catégories éditoriales'
                          : 'Editorial categories'
                      }
                      className="aks-writing-taxonomy-group"
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
                      aria-label={
                        writing.locale === 'fr'
                          ? 'Tags éditoriaux'
                          : 'Editorial tags'
                      }
                      className="aks-writing-taxonomy-group"
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
                </div>
              ) : null}
            </header>

            <section
              aria-label={writing.locale === 'fr' ? 'Texte' : 'Text'}
              className="aks-writing-reader"
              data-long-form-reader
            >
              <WritingEditorialRenderer
                assetHref={assetHref}
                assets={writing.assets}
                document={writing.document}
                locale={writing.locale}
                responsiveImages={responsiveImages}
              />
            </section>

            <footer className="aks-writing-detail-footer">
              <Text size="sm" tone="muted">
                {writing.locale === 'fr'
                  ? 'Structure contrôlée par le produit · contenu éditorial administrable.'
                  : 'Product-controlled structure · admin-managed editorial content.'}
              </Text>
              <Link href={backHref}>{backLabel}</Link>
            </footer>
          </article>

          {writing.systems.length > 0 ? (
            <aside
              aria-labelledby="writing-related-systems"
              className="aks-writing-related-systems"
            >
              <div className="aks-writing-related-heading">
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
            </aside>
          ) : null}
        </div>
      </Container>
    </main>
  );
}
