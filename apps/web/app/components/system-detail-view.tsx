import type {
  PlatformLocale,
  PresentationBlock,
  PresentationDocument,
  SystemLinkKind,
} from '@akiksystems/core';
import { Container, Heading, Link, Text } from '@akiksystems/ui';

export interface SystemDetailTechnology {
  id: string;
  name: string;
}

export interface SystemDetailLink {
  id: string;
  kind: SystemLinkKind;
  url: string;
}

export interface SystemDetailAsset {
  id: string;
  url: string;
  altText: string | null;
  caption: string | null;
  mimeType: string;
}

export interface SystemDetailViewProps {
  locale: PlatformLocale;
  title: string;
  summary: string;
  presentationDocument: PresentationDocument;
  technologies: SystemDetailTechnology[];
  originTitle: string | null;
  originSummary: string | null;
  links: SystemDetailLink[];
  assets: SystemDetailAsset[];
  alternateHref?: string | null;
  preview?: boolean;
}

interface PresentationBlockViewProps {
  block: PresentationBlock;
  index: number;
  locale: PlatformLocale;
  assetById: ReadonlyMap<string, SystemDetailAsset>;
}

function linkLabel(kind: SystemLinkKind, locale: PlatformLocale): string {
  const labels = {
    live: locale === 'fr' ? 'Site' : 'Live',
    repository: locale === 'fr' ? 'Dépôt' : 'Repository',
    demo: 'Demo',
    documentation: 'Documentation',
  };

  return labels[kind];
}

export function PresentationBlockView({
  block,
  index,
  locale,
  assetById,
}: PresentationBlockViewProps) {
  const key = `${block.type}-${index}`;

  switch (block.type) {
    case 'heading':
      return (
        <Heading key={key} level={block.level} size="sm">
          {block.text}
        </Heading>
      );
    case 'paragraph':
      return <Text key={key}>{block.text}</Text>;
    case 'list': {
      const List = block.style === 'ordered' ? 'ol' : 'ul';

      return (
        <List className="aks-system-presentation-list" key={key}>
          {block.items.map((item, itemIndex) => (
            <li key={`${key}-${itemIndex}`}>{item}</li>
          ))}
        </List>
      );
    }
    case 'code':
      return (
        <pre className="aks-system-presentation-code" key={key}>
          <code data-language={block.language ?? undefined}>{block.code}</code>
        </pre>
      );
    case 'image': {
      const asset = assetById.get(block.assetId);

      if (asset === undefined) {
        return null;
      }

      if (!asset.mimeType.startsWith('image/')) {
        return (
          <p key={key}>
            <Link href={asset.url}>
              {asset.caption ??
                (locale === 'fr' ? 'Ouvrir le document' : 'Open document')}
            </Link>
          </p>
        );
      }

      return (
        <figure className="aks-system-presentation-figure" key={key}>
          <img
            alt={asset.altText ?? ''}
            decoding="async"
            loading="lazy"
            sizes="(max-width: 48rem) calc(100vw - 2rem), 44rem"
            src={asset.url}
          />
          {asset.caption !== null ? (
            <figcaption>{asset.caption}</figcaption>
          ) : null}
        </figure>
      );
    }
    case 'quote':
      return (
        <blockquote className="aks-system-presentation-quote" key={key}>
          <Text>{block.text}</Text>
          {block.attribution !== null ? (
            <footer>— {block.attribution}</footer>
          ) : null}
        </blockquote>
      );
  }
}

export function SystemPresentation({
  document,
  locale,
  assets,
}: {
  document: PresentationDocument;
  locale: PlatformLocale;
  assets: SystemDetailAsset[];
}) {
  const assetById = new Map(assets.map((asset) => [asset.id, asset]));

  return (
    <section
      aria-label={locale === 'fr' ? 'Présentation du système' : 'System presentation'}
      className="aks-system-presentation"
    >
      {document.blocks.map((block, index) => (
        <PresentationBlockView
          assetById={assetById}
          block={block}
          index={index}
          key={`${block.type}-${index}`}
          locale={locale}
        />
      ))}
    </section>
  );
}

export function SystemDetailView({
  locale,
  title,
  summary,
  presentationDocument,
  technologies,
  originTitle,
  originSummary,
  links,
  assets,
  alternateHref = null,
  preview = false,
}: SystemDetailViewProps) {
  const alternateLocale: PlatformLocale = locale === 'en' ? 'fr' : 'en';
  const languageHref = alternateHref ?? `/${alternateLocale}`;

  return (
    <>
      <a className="aks-skip-link" href="#system-content">
        {locale === 'fr' ? 'Aller au contenu' : 'Skip to content'}
      </a>

      <header className="aks-system-context-bar">
        <Container width="wide">
          <div className="aks-system-context-inner">
            <Link className="aks-system-brand" href={`/${locale}`}>
              AkikSystems
            </Link>
            <nav
              aria-label={locale === 'fr' ? 'Contexte AkikSystems' : 'AkikSystems context'}
              className="aks-system-context-nav"
            >
              <span className="aks-system-context-current" aria-current="page">
                {locale === 'fr' ? 'Systèmes' : 'Systems'} · {title}
              </span>
              <Link
                href={languageHref}
                hrefLang={alternateLocale}
                lang={alternateLocale}
              >
                {alternateLocale === 'fr' ? 'Français' : 'English'}
              </Link>
            </nav>
          </div>
        </Container>
      </header>

      <main className="aks-system-detail" id="system-content" tabIndex={-1}>
        <Container>
          <article className="aks-system-detail-stack">
            <header className="aks-system-detail-header">
              {preview ? (
                <Text className="aks-proof-eyebrow" size="sm" tone="muted">
                  {locale === 'fr' ? 'Aperçu privé' : 'Private preview'}
                </Text>
              ) : null}

              <Heading level={1} size="lg">
                {title}
              </Heading>
              <Text>{summary}</Text>

              {technologies.length > 0 ? (
                <ul className="aks-system-detail-tags" aria-label="Technologies">
                  {technologies.map((technology) => (
                    <li key={technology.id}>{technology.name}</li>
                  ))}
                </ul>
              ) : null}

              {links.length > 0 ? (
                <nav
                  aria-label={
                    locale === 'fr' ? 'Liens du système' : 'System links'
                  }
                  className="aks-proof-actions"
                >
                  {links.map((link) => (
                    <Link href={link.url} key={link.id}>
                      {linkLabel(link.kind, locale)}
                    </Link>
                  ))}
                </nav>
              ) : null}
            </header>

            {originTitle !== null ? (
              <aside className="aks-system-detail-context">
                <Text className="aks-proof-eyebrow" size="sm" tone="muted">
                  {locale === 'fr' ? 'Contexte d’origine' : 'Origin context'}
                </Text>
                <Heading level={2} size="sm">
                  {originTitle}
                </Heading>
                {originSummary !== null ? (
                  <Text tone="muted">{originSummary}</Text>
                ) : null}
              </aside>
            ) : null}

            <SystemPresentation
              assets={assets}
              document={presentationDocument}
              locale={locale}
            />
          </article>
        </Container>
      </main>
    </>
  );
}
