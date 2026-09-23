import type { WritingPublicationAsset } from '@akiksystems/db';
import type {
  PlatformLocale,
  WritingDocument,
  WritingParagraphNode,
  WritingTextNode,
} from '@akiksystems/core';
import { Heading, Text } from '@akiksystems/ui';

import './writing-editorial-renderer.css';

const imageVariantWidths = [320, 640, 960, 1280] as const;

function textContent(content: WritingTextNode[] | undefined): string {
  return (content ?? []).map((node) => node.text).join('');
}

function Paragraphs({
  paragraphs,
}: {
  paragraphs: WritingParagraphNode[];
}) {
  return (
    <>
      {paragraphs.map((paragraph, index) => (
        <Text
          data-writing-node="paragraph"
          key={`${index}-${textContent(paragraph.content)}`}
        >
          {textContent(paragraph.content)}
        </Text>
      ))}
    </>
  );
}

function WritingImage({
  asset,
  assetHref,
  locale,
  responsive,
}: {
  asset: WritingPublicationAsset | undefined;
  assetHref: (assetId: string, width?: number) => string;
  locale: PlatformLocale;
  responsive: boolean;
}) {
  if (asset === undefined) {
    return (
      <figure className="aks-writing-media aks-writing-media-missing">
        <Text size="sm" tone="muted">
          {locale === 'fr'
            ? 'Média indisponible.'
            : 'Media unavailable.'}
        </Text>
      </figure>
    );
  }

  const widths = imageVariantWidths.filter(
    (width) => asset.width === null || width < asset.width,
  );
  const srcSet =
    responsive && widths.length > 0
      ? widths
          .map((width) => `${assetHref(asset.id, width)} ${width}w`)
          .join(', ')
      : undefined;

  return (
    <figure
      className="aks-writing-media"
      data-asset-id={asset.id}
      data-writing-node="image"
    >
      <img
        alt={asset.altText}
        decoding="async"
        height={asset.height ?? undefined}
        loading="lazy"
        sizes={
          srcSet === undefined
            ? undefined
            : '(max-width: 48rem) calc(100vw - 3rem), 64rem'
        }
        src={assetHref(asset.id)}
        srcSet={srcSet}
        width={asset.width ?? undefined}
      />
      {asset.caption !== null ? (
        <figcaption>{asset.caption}</figcaption>
      ) : null}
    </figure>
  );
}

export function WritingEditorialRenderer({
  assetHref,
  assets,
  document,
  locale,
  responsiveImages = false,
}: {
  assetHref: (assetId: string, width?: number) => string;
  assets: WritingPublicationAsset[];
  document: WritingDocument;
  locale: PlatformLocale;
  responsiveImages?: boolean;
}) {
  const assetsById = new Map(assets.map((asset) => [asset.id, asset]));

  return (
    <div
      className="aks-writing-content"
      data-writing-document-version={document.version}
    >
      {document.content.map((block, index) => {
        const key = `${index}-${block.type}`;

        switch (block.type) {
          case 'paragraph':
            return (
              <Text data-writing-node="paragraph" key={key}>
                {textContent(block.content)}
              </Text>
            );

          case 'heading':
            return (
              <Heading
                data-writing-node="heading"
                key={key}
                level={block.attrs.level}
                size={block.attrs.level === 2 ? 'md' : 'sm'}
              >
                {textContent(block.content)}
              </Heading>
            );

          case 'bulletList':
          case 'orderedList': {
            const List = block.type === 'bulletList' ? 'ul' : 'ol';
            return (
              <List
                className="aks-writing-list"
                data-writing-node={block.type}
                key={key}
              >
                {block.content.map((item, itemIndex) => (
                  <li key={`${key}-${itemIndex}`}>
                    <Paragraphs paragraphs={item.content} />
                  </li>
                ))}
              </List>
            );
          }

          case 'blockquote':
            return (
              <blockquote
                className="aks-writing-quote"
                data-writing-node="blockquote"
                key={key}
              >
                <Paragraphs paragraphs={block.content} />
              </blockquote>
            );

          case 'codeBlock':
            return (
              <pre
                className="aks-writing-code"
                data-language={block.attrs?.language ?? undefined}
                data-writing-node="codeBlock"
                key={key}
              >
                <code>{textContent(block.content)}</code>
              </pre>
            );

          case 'callout':
            return (
              <aside
                aria-label={locale === 'fr' ? 'Encadré' : 'Callout'}
                className="aks-writing-callout"
                data-writing-node="callout"
                key={key}
              >
                <Paragraphs paragraphs={block.content} />
              </aside>
            );

          case 'image':
            return (
              <WritingImage
                asset={assetsById.get(block.attrs.assetId)}
                assetHref={assetHref}
                key={key}
                locale={locale}
                responsive={responsiveImages}
              />
            );

          case 'gallery':
            return (
              <div
                aria-label={locale === 'fr' ? 'Galerie d’images' : 'Image gallery'}
                className="aks-writing-gallery"
                data-writing-node="gallery"
                key={key}
                role="group"
              >
                {block.content.map((image, imageIndex) => (
                  <WritingImage
                    asset={assetsById.get(image.attrs.assetId)}
                    assetHref={assetHref}
                    key={`${key}-${imageIndex}-${image.attrs.assetId}`}
                    locale={locale}
                    responsive={responsiveImages}
                  />
                ))}
              </div>
            );
        }
      })}
    </div>
  );
}
