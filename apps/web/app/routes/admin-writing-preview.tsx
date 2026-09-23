import {
  listPublishedSystemReferences,
  parseCategoryPublicationSnapshot,
  parseTagPublicationSnapshot,
} from '@akiksystems/db';
import {
  parseWritingDocument,
  writingDocumentAssetIds,
  writingDocumentFromPlainText,
  type PlatformLocale,
} from '@akiksystems/core';
import { Link, Text } from '@akiksystems/ui';
import { data, useLoaderData } from 'react-router';

import { WritingDetailView } from '../components/writing-detail-view';
import { requireAdminSession } from '../lib/admin.server';
import { appDb } from '../lib/db.server';

import type { Route } from './+types/admin-writing-preview';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requiredWritingId(value: string | undefined): string {
  if (value === undefined || !uuidPattern.test(value)) {
    throw new Response('Writing not found.', { status: 404 });
  }
  return value;
}

function requiredLocale(value: string | undefined): PlatformLocale {
  if (value !== 'en' && value !== 'fr') {
    throw new Response('Locale not found.', { status: 404 });
  }
  return value;
}

export function meta() {
  return [
    { title: 'Writing preview · AkikSystems' },
    { name: 'robots', content: 'noindex, nofollow, noarchive, nosnippet' },
  ];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAdminSession(request);
  const writingId = requiredWritingId(params.writingId);
  const locale = requiredLocale(params.locale);

  const writing = await appDb
    .selectFrom('writings')
    .innerJoin(
      'writing_localizations',
      'writing_localizations.writing_id',
      'writings.id',
    )
    .select([
      'writings.kind',
      'writings.lifecycle',
      'writing_localizations.title',
      'writing_localizations.summary',
      'writing_localizations.body',
      'writing_localizations.editor_document',
      'writing_localizations.editorial_state',
    ])
    .where('writings.id', '=', writingId)
    .where('writing_localizations.locale', '=', locale)
    .executeTakeFirst();

  if (
    writing === undefined ||
    writing.title === null ||
    writing.summary === null
  ) {
    throw new Response('Preview content is incomplete.', { status: 404 });
  }

  const document =
    parseWritingDocument(writing.editor_document) ??
    writingDocumentFromPlainText(writing.body);
  const documentAssetIds = writingDocumentAssetIds(document);

  const [categoryRelations, tagRelations, systemRelations, assetRows] = await Promise.all([
    appDb
      .selectFrom('writing_categories')
      .select(['category_id', 'position'])
      .where('writing_id', '=', writingId)
      .orderBy('position')
      .execute(),
    appDb
      .selectFrom('writing_tags')
      .select(['tag_id', 'position'])
      .where('writing_id', '=', writingId)
      .orderBy('position')
      .execute(),
    appDb
      .selectFrom('writing_systems')
      .select(['system_id', 'position'])
      .where('writing_id', '=', writingId)
      .orderBy('position')
      .execute(),
    documentAssetIds.length === 0
      ? Promise.resolve([])
      : appDb
          .selectFrom('writing_assets')
          .innerJoin('assets', 'assets.id', 'writing_assets.asset_id')
          .leftJoin('asset_localizations', (join) =>
            join
              .onRef('asset_localizations.asset_id', '=', 'assets.id')
              .on('asset_localizations.locale', '=', locale),
          )
          .select([
            'assets.id',
            'assets.mime_type',
            'assets.width',
            'assets.height',
            'asset_localizations.alt_text',
            'asset_localizations.caption',
          ])
          .where('writing_assets.writing_id', '=', writingId)
          .where('writing_assets.asset_id', 'in', documentAssetIds)
          .execute(),
  ]);

  const categoryIds = categoryRelations.map((row) => row.category_id);
  const tagIds = tagRelations.map((row) => row.tag_id);
  const systemIds = systemRelations.map((row) => row.system_id);

  const [categoryRows, tagRows, systemReferences] = await Promise.all([
    categoryIds.length === 0
      ? Promise.resolve([])
      : appDb
          .selectFrom('category_publications')
          .select(['category_id', 'snapshot'])
          .where('locale', '=', locale)
          .where('category_id', 'in', categoryIds)
          .execute(),
    tagIds.length === 0
      ? Promise.resolve([])
      : appDb
          .selectFrom('tag_publications')
          .select(['tag_id', 'snapshot'])
          .where('locale', '=', locale)
          .where('tag_id', 'in', tagIds)
          .execute(),
    listPublishedSystemReferences(appDb, {
      locale,
      ids: systemIds,
    }),
  ]);

  const categoriesById = new Map(
    categoryRows.map((row) => [
      row.category_id,
      parseCategoryPublicationSnapshot(row.snapshot),
    ]),
  );
  const tagsById = new Map(
    tagRows.map((row) => [
      row.tag_id,
      parseTagPublicationSnapshot(row.snapshot),
    ]),
  );
  const systemsById = new Map(
    systemReferences.map((reference) => [reference.id, reference]),
  );

  const categories = categoryIds.flatMap((categoryId) => {
    const category = categoriesById.get(categoryId);
    return category === undefined
      ? []
      : [
          {
            categoryId: category.categoryId,
            locale: category.locale,
            slug: category.slug,
            name: category.name,
            description: category.description,
          },
        ];
  });

  const tags = tagIds.flatMap((tagId) => {
    const tag = tagsById.get(tagId);
    return tag === undefined
      ? []
      : [
          {
            tagId: tag.tagId,
            canonicalKey: tag.canonicalKey,
            locale: tag.locale,
            slug: tag.slug,
            name: tag.name,
          },
        ];
  });

  const systems = systemIds.flatMap((systemId) => {
    const system = systemsById.get(systemId);
    return system === undefined ? [] : [system];
  });
  const assets = documentAssetIds.flatMap((assetId) => {
    const asset = assetRows.find((candidate) => candidate.id === assetId);
    const altText = asset?.alt_text?.trim() ?? '';
    return asset === undefined || altText === ''
      ? []
      : [
          {
            id: asset.id,
            mimeType: asset.mime_type,
            altText,
            caption: asset.caption?.trim() || null,
            width: asset.width,
            height: asset.height,
          },
        ];
  });

  return data(
    {
      writingId,
      lifecycle: writing.lifecycle,
      editorialState: writing.editorial_state,
      writing: {
        locale,
        kind: writing.kind,
        title: writing.title,
        summary: writing.summary,
        body: writing.body,
        document,
        assets,
        categories,
        tags,
        systems,
      },
    },
    {
      headers: {
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
        Pragma: 'no-cache',
      },
    },
  );
}

export function headers({
  loaderHeaders,
  errorHeaders,
}: Route.HeadersArgs): Headers {
  return errorHeaders ?? loaderHeaders;
}

export default function AdminWritingPreviewRoute() {
  const preview = useLoaderData<typeof loader>();
  const alternateLocale = preview.writing.locale === 'en' ? 'fr' : 'en';

  return (
    <>
      <div className="aks-preview-toolbar" role="status">
        <Text size="sm" tone="muted">
          {preview.writing.locale.toUpperCase()} · {preview.editorialState} ·{' '}
          {preview.lifecycle} · private preview
        </Text>
        <div className="aks-preview-toolbar-actions">
          <Link
            href={`/admin/writings/${preview.writingId}/preview/${alternateLocale}`}
            hrefLang={alternateLocale}
            lang={alternateLocale}
          >
            {alternateLocale.toUpperCase()}
          </Link>
          <Link href="/admin/writings">Back to Writings admin</Link>
        </div>
      </div>
      <WritingDetailView
        assetHref={(assetId) =>
          `/admin/writings/${preview.writingId}/assets/${assetId}`
        }
        backHref="/admin/writings"
        backLabel={
          preview.writing.locale === 'fr'
            ? 'Retour à l’administration'
            : 'Back to administration'
        }
        writing={preview.writing}
      />
    </>
  );
}
