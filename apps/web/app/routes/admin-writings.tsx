import {
  parseWritingPublicationSnapshot,
  publishWritingLocalization,
  unpublishWritingLocalization,
  writeAdminAuditEvent,
} from '@akiksystems/db';
import {
  parseWritingDocument,
  writingDocumentAssetIds,
  writingEditorialWeights,
  writingKinds,
  type PlatformLocale,
  type WritingEditorialWeight,
  type WritingKind,
} from '@akiksystems/core';
import { Button, Container, Heading, Link, Text } from '@akiksystems/ui';
import { randomUUID } from 'node:crypto';
import { Form, useActionData, useLoaderData } from 'react-router';

import {
  WritingBodyEditor,
  WritingNoteEditor,
} from '../components/writing-body-editor';
import { requireAdminSession } from '../lib/admin.server';
import {
  assetExtensionForMimeType,
  deleteAssetObject,
  putAssetObject,
  validateAssetUpload,
} from '../lib/asset-storage.server';
import { appDb } from '../lib/db.server';
import { imageDimensions } from '../lib/image-dimensions.server';
import {
  parseWritingEditorDocumentJson,
  writingEditorDocumentForDraft,
  writingEditorDocumentToPlainText,
} from '../lib/writing-editor';

import type { Route } from './+types/admin-writings';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

function nullableField(form: FormData, name: string): string | null {
  const value = field(form, name);
  return value === '' ? null : value;
}

function requiredAssetId(form: FormData): string {
  const assetId = field(form, 'assetId');
  if (!uuidPattern.test(assetId)) {
    throw new Response('Writing asset not found.', { status: 404 });
  }
  return assetId;
}

function requiredEditorDocument(form: FormData) {
  const value = form.get('editorDocument');
  if (typeof value !== 'string') {
    throw new Response('Writing editor document is required.', { status: 400 });
  }

  const document = parseWritingEditorDocumentJson(value);
  if (document === null) {
    throw new Response('Invalid Writing editor document.', { status: 400 });
  }

  return document;
}

function requiredWritingId(form: FormData): string {
  const id = field(form, 'writingId');
  if (!uuidPattern.test(id)) {
    throw new Response('Writing not found.', { status: 404 });
  }
  return id;
}

function requiredLocale(form: FormData): PlatformLocale {
  const locale = field(form, 'locale');
  if (locale !== 'en' && locale !== 'fr') {
    throw new Response('Invalid locale.', { status: 400 });
  }
  return locale;
}

function requiredKind(form: FormData): WritingKind {
  const kind = field(form, 'kind') as WritingKind;
  if (!writingKinds.includes(kind)) {
    throw new Response('Invalid Writing kind.', { status: 400 });
  }
  return kind;
}

function requiredEditorialWeight(form: FormData): WritingEditorialWeight {
  const weight = field(form, 'editorialWeight') as WritingEditorialWeight;
  if (!writingEditorialWeights.includes(weight)) {
    throw new Response('Invalid editorial weight.', { status: 400 });
  }
  return weight;
}

function publicHref(locale: PlatformLocale, slug: string): string {
  return locale === 'fr'
    ? `/fr/ecrits/${slug}`
    : `/en/writings/${slug}`;
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdminSession(request);

  const writings = await appDb
    .selectFrom('writings')
    .leftJoin('writing_localizations as en', (join) =>
      join
        .onRef('en.writing_id', '=', 'writings.id')
        .on('en.locale', '=', 'en'),
    )
    .leftJoin('writing_localizations as fr', (join) =>
      join
        .onRef('fr.writing_id', '=', 'writings.id')
        .on('fr.locale', '=', 'fr'),
    )
    .leftJoin('writing_publications as pub_en', (join) =>
      join
        .onRef('pub_en.writing_id', '=', 'writings.id')
        .on('pub_en.locale', '=', 'en'),
    )
    .leftJoin('writing_publications as pub_fr', (join) =>
      join
        .onRef('pub_fr.writing_id', '=', 'writings.id')
        .on('pub_fr.locale', '=', 'fr'),
    )
    .select([
      'writings.id',
      'writings.kind',
      'writings.lifecycle',
      'writings.archived_at',
      'writings.editorial_weight',
      'writings.editorial_position',
      'en.slug as slug_en',
      'en.title as title_en',
      'en.summary as summary_en',
      'en.body as body_en',
      'en.editor_document as editor_document_en',
      'en.editorial_state as editorial_state_en',
      'fr.slug as slug_fr',
      'fr.title as title_fr',
      'fr.summary as summary_fr',
      'fr.body as body_fr',
      'fr.editor_document as editor_document_fr',
      'fr.editorial_state as editorial_state_fr',
      'pub_en.slug as published_slug_en',
      'pub_fr.slug as published_slug_fr',
    ])
    .orderBy('writings.editorial_position')
    .orderBy('writings.created_at')
    .orderBy('writings.id')
    .execute();

  const [
    categories,
    tags,
    systems,
    writingCategories,
    writingTags,
    writingSystems,
    writingAssets,
  ] = await Promise.all([
      appDb
        .selectFrom('categories')
        .leftJoin('category_localizations as en', (join) =>
          join
            .onRef('en.category_id', '=', 'categories.id')
            .on('en.locale', '=', 'en'),
        )
        .leftJoin('category_localizations as fr', (join) =>
          join
            .onRef('fr.category_id', '=', 'categories.id')
            .on('fr.locale', '=', 'fr'),
        )
        .select([
          'categories.id',
          'categories.editorial_position',
          'en.name as name_en',
          'fr.name as name_fr',
        ])
        .orderBy('categories.editorial_position')
        .orderBy('categories.created_at')
        .orderBy('categories.id')
        .execute(),
      appDb
        .selectFrom('tags')
        .leftJoin('tag_localizations as en', (join) =>
          join
            .onRef('en.tag_id', '=', 'tags.id')
            .on('en.locale', '=', 'en'),
        )
        .leftJoin('tag_localizations as fr', (join) =>
          join
            .onRef('fr.tag_id', '=', 'tags.id')
            .on('fr.locale', '=', 'fr'),
        )
        .select([
          'tags.id',
          'tags.canonical_key',
          'en.name as name_en',
          'fr.name as name_fr',
        ])
        .orderBy('tags.canonical_key')
        .orderBy('tags.id')
        .execute(),
      appDb
        .selectFrom('systems')
        .leftJoin('system_localizations as en', (join) =>
          join
            .onRef('en.system_id', '=', 'systems.id')
            .on('en.locale', '=', 'en'),
        )
        .leftJoin('system_localizations as fr', (join) =>
          join
            .onRef('fr.system_id', '=', 'systems.id')
            .on('fr.locale', '=', 'fr'),
        )
        .select([
          'systems.id',
          'systems.editorial_position',
          'en.title as title_en',
          'fr.title as title_fr',
        ])
        .where('systems.lifecycle', '=', 'active')
        .orderBy('systems.editorial_position')
        .orderBy('systems.created_at')
        .orderBy('systems.id')
        .execute(),
      appDb
        .selectFrom('writing_categories')
        .select(['writing_id', 'category_id', 'position'])
        .orderBy('writing_id')
        .orderBy('position')
        .execute(),
      appDb
        .selectFrom('writing_tags')
        .select(['writing_id', 'tag_id', 'position'])
        .orderBy('writing_id')
        .orderBy('position')
        .execute(),
      appDb
        .selectFrom('writing_systems')
        .select(['writing_id', 'system_id', 'position'])
        .orderBy('writing_id')
        .orderBy('position')
        .execute(),
      appDb
        .selectFrom('writing_assets')
        .innerJoin('assets', 'assets.id', 'writing_assets.asset_id')
        .leftJoin('asset_localizations as asset_en', (join) =>
          join
            .onRef('asset_en.asset_id', '=', 'assets.id')
            .on('asset_en.locale', '=', 'en'),
        )
        .leftJoin('asset_localizations as asset_fr', (join) =>
          join
            .onRef('asset_fr.asset_id', '=', 'assets.id')
            .on('asset_fr.locale', '=', 'fr'),
        )
        .select([
          'writing_assets.writing_id',
          'assets.id',
          'assets.original_filename',
          'assets.mime_type',
          'assets.byte_size',
          'assets.width',
          'assets.height',
          'asset_en.alt_text as alt_en',
          'asset_en.caption as caption_en',
          'asset_fr.alt_text as alt_fr',
          'asset_fr.caption as caption_fr',
        ])
        .orderBy('writing_assets.created_at')
        .orderBy('assets.id')
        .execute(),
    ]);

  const categoryIdsByWriting = new Map<string, string[]>();
  for (const relation of writingCategories) {
    const categoryIds = categoryIdsByWriting.get(relation.writing_id) ?? [];
    categoryIds.push(relation.category_id);
    categoryIdsByWriting.set(relation.writing_id, categoryIds);
  }

  const tagIdsByWriting = new Map<string, string[]>();
  for (const relation of writingTags) {
    const tagIds = tagIdsByWriting.get(relation.writing_id) ?? [];
    tagIds.push(relation.tag_id);
    tagIdsByWriting.set(relation.writing_id, tagIds);
  }

  const systemIdsByWriting = new Map<string, string[]>();
  for (const relation of writingSystems) {
    const systemIds = systemIdsByWriting.get(relation.writing_id) ?? [];
    systemIds.push(relation.system_id);
    systemIdsByWriting.set(relation.writing_id, systemIds);
  }

  const assetsByWriting = new Map<string, typeof writingAssets>();
  for (const asset of writingAssets) {
    const assets = assetsByWriting.get(asset.writing_id) ?? [];
    assets.push(asset);
    assetsByWriting.set(asset.writing_id, assets);
  }

  return {
    categories,
    tags,
    systems,
    writings: writings.map((writing) => ({
      ...writing,
      categoryIds: categoryIdsByWriting.get(writing.id) ?? [],
      tagIds: tagIdsByWriting.get(writing.id) ?? [],
      systemIds: systemIdsByWriting.get(writing.id) ?? [],
      assets: assetsByWriting.get(writing.id) ?? [],
    })),
  };
}

export async function action({ request }: Route.ActionArgs) {
  const session = await requireAdminSession(request);
  const form = await request.formData();
  const intent = field(form, '_intent');
  const db = appDb;

  if (intent === 'create-writing') {
    const kind = requiredKind(form);
    const editorialWeight = requiredEditorialWeight(form);
    const writingId = randomUUID();
    const position = await db
      .selectFrom('writings')
      .select(({ fn }) => fn.max<number>('editorial_position').as('max_position'))
      .executeTakeFirst();

    await db.transaction().execute(async (transaction) => {
      await transaction
        .insertInto('writings')
        .values({
          id: writingId,
          kind,
          editorial_weight: editorialWeight,
          editorial_position: (position?.max_position ?? -1) + 1,
        })
        .execute();

      await transaction
        .insertInto('writing_localizations')
        .values([
          { writing_id: writingId, locale: 'en' },
          { writing_id: writingId, locale: 'fr' },
        ])
        .execute();

      await writeAdminAuditEvent(transaction, {
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'writing.created',
        entityType: 'writing',
        entityId: writingId,
        metadata: {
          kind,
          editorialWeight,
        },
      });
    });

    return { ok: true, message: 'Writing created.' };
  }

  const writingId = requiredWritingId(form);
  const writing = await db
    .selectFrom('writings')
    .select(['id', 'lifecycle'])
    .where('id', '=', writingId)
    .executeTakeFirst();

  if (writing === undefined) {
    throw new Response('Writing not found.', { status: 404 });
  }

  if (intent === 'archive-writing') {
    if (writing.lifecycle === 'archived') {
      return { ok: true, message: 'Writing is already archived.' };
    }

    await db.transaction().execute(async (transaction) => {
      const archivedAt = new Date();
      await transaction
        .updateTable('writings')
        .set({
          lifecycle: 'archived',
          archived_at: archivedAt,
          updated_at: archivedAt,
        })
        .where('id', '=', writingId)
        .execute();

      await writeAdminAuditEvent(transaction, {
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'writing.archived',
        entityType: 'writing',
        entityId: writingId,
        metadata: {
          publicSnapshotsPreserved: true,
        },
      });
    });

    return {
      ok: true,
      message: 'Writing archived. Existing publication snapshots are preserved but hidden from public delivery.',
    };
  }

  if (intent === 'restore-writing') {
    if (writing.lifecycle === 'active') {
      return { ok: true, message: 'Writing is already active.' };
    }

    await db.transaction().execute(async (transaction) => {
      await transaction
        .updateTable('writings')
        .set({
          lifecycle: 'active',
          archived_at: null,
          updated_at: new Date(),
        })
        .where('id', '=', writingId)
        .execute();

      await writeAdminAuditEvent(transaction, {
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'writing.restored',
        entityType: 'writing',
        entityId: writingId,
        metadata: {
          preservedSnapshotsMayBecomePublicAgain: true,
        },
      });
    });

    return {
      ok: true,
      message: 'Writing restored. Preserved publication snapshots are public again where they still exist.',
    };
  }

  if (intent === 'upload-asset') {
    const file = form.get('file');
    if (!(file instanceof File)) {
      return { ok: false, message: 'Choose an image to upload.' };
    }
    if (!file.type.startsWith('image/')) {
      return {
        ok: false,
        message: 'Writing media must be JPEG, PNG, WebP, or AVIF.',
      };
    }

    try {
      validateAssetUpload(file);
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Invalid image.',
      };
    }

    const altEn = nullableField(form, 'altEn');
    const altFr = nullableField(form, 'altFr');
    const captionEn = nullableField(form, 'captionEn');
    const captionFr = nullableField(form, 'captionFr');
    const bytes = new Uint8Array(await file.arrayBuffer());
    const dimensions = imageDimensions(file.type, bytes);
    const assetId = randomUUID();
    const extension = assetExtensionForMimeType(file.type);
    const storageKey = `writings/${writingId}/${assetId}.${extension}`;

    try {
      await putAssetObject(storageKey, file);

      await db.transaction().execute(async (transaction) => {
        await transaction
          .insertInto('assets')
          .values({
            id: assetId,
            storage_key: storageKey,
            original_filename: file.name,
            mime_type: file.type,
            byte_size: file.size,
            width: dimensions?.width ?? null,
            height: dimensions?.height ?? null,
          })
          .execute();

        await transaction
          .insertInto('asset_localizations')
          .values([
            {
              asset_id: assetId,
              locale: 'en',
              alt_text: altEn,
              caption: captionEn,
            },
            {
              asset_id: assetId,
              locale: 'fr',
              alt_text: altFr,
              caption: captionFr,
            },
          ])
          .execute();

        await transaction
          .insertInto('writing_assets')
          .values({
            writing_id: writingId,
            asset_id: assetId,
          })
          .execute();

        await writeAdminAuditEvent(transaction, {
          actorUserId: session.user.id,
          actorEmail: session.user.email,
          action: 'writing.asset_uploaded',
          entityType: 'asset',
          entityId: assetId,
          metadata: {
            writingId,
            mimeType: file.type,
            byteSize: file.size,
            localizedMetadata: ['en', 'fr'],
            width: dimensions?.width ?? null,
            height: dimensions?.height ?? null,
          },
        });
      });
    } catch (error) {
      try {
        await deleteAssetObject(storageKey);
      } catch {
        // Best-effort compensation when storage or metadata persistence fails.
      }

      return {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : 'Writing media upload could not be completed.',
      };
    }

    return {
      ok: true,
      message: 'Writing image uploaded. Insert it from the EN or FR editor.',
    };
  }

  if (intent === 'update-asset-metadata') {
    const assetId = requiredAssetId(form);
    const linked = await db
      .selectFrom('writing_assets')
      .select('asset_id')
      .where('writing_id', '=', writingId)
      .where('asset_id', '=', assetId)
      .executeTakeFirst();
    if (linked === undefined) {
      throw new Response('Writing asset not found.', { status: 404 });
    }

    const altEn = nullableField(form, 'altEn');
    const altFr = nullableField(form, 'altFr');
    const captionEn = nullableField(form, 'captionEn');
    const captionFr = nullableField(form, 'captionFr');
    const localizations = await db
      .selectFrom('writing_localizations')
      .select(['locale', 'editor_document'])
      .where('writing_id', '=', writingId)
      .execute();
    const referencedLocales = localizations.flatMap((localization) => {
      const document = parseWritingDocument(localization.editor_document);
      return document !== null &&
        writingDocumentAssetIds(document).includes(assetId)
        ? [localization.locale]
        : [];
    });

    await db.transaction().execute(async (transaction) => {
      for (const localized of [
        { locale: 'en' as const, altText: altEn, caption: captionEn },
        { locale: 'fr' as const, altText: altFr, caption: captionFr },
      ]) {
        await transaction
          .insertInto('asset_localizations')
          .values({
            asset_id: assetId,
            locale: localized.locale,
            alt_text: localized.altText,
            caption: localized.caption,
          })
          .onConflict((conflict) =>
            conflict.columns(['asset_id', 'locale']).doUpdateSet({
              alt_text: localized.altText,
              caption: localized.caption,
              updated_at: new Date(),
            }),
          )
          .execute();
      }

      if (referencedLocales.length > 0) {
        await transaction
          .updateTable('writing_localizations')
          .set({
            editorial_state: 'draft',
            published_at: null,
            updated_at: new Date(),
          })
          .where('writing_id', '=', writingId)
          .where('locale', 'in', referencedLocales)
          .execute();
      }

      await writeAdminAuditEvent(transaction, {
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'writing.asset_metadata_updated',
        entityType: 'asset',
        entityId: assetId,
        metadata: {
          writingId,
          localizedMetadata: ['en', 'fr'],
          draftLocales: referencedLocales,
        },
      });
    });

    return {
      ok: true,
      message:
        referencedLocales.length === 0
          ? 'Writing image metadata updated.'
          : 'Writing image metadata updated; referenced locale drafts must be republished.',
    };
  }

  if (intent === 'delete-asset') {
    const assetId = requiredAssetId(form);
    const asset = await db
      .selectFrom('writing_assets')
      .innerJoin('assets', 'assets.id', 'writing_assets.asset_id')
      .select(['assets.id', 'assets.storage_key'])
      .where('writing_assets.writing_id', '=', writingId)
      .where('writing_assets.asset_id', '=', assetId)
      .executeTakeFirst();
    if (asset === undefined) {
      throw new Response('Writing asset not found.', { status: 404 });
    }

    const draftLocalizations = await db
      .selectFrom('writing_localizations')
      .select(['locale', 'editor_document'])
      .where('writing_id', '=', writingId)
      .execute();
    const draftReferences = draftLocalizations.flatMap((localization) => {
      const document = parseWritingDocument(localization.editor_document);
      return document !== null &&
        writingDocumentAssetIds(document).includes(assetId)
        ? [localization.locale]
        : [];
    });
    if (draftReferences.length > 0) {
      return {
        ok: false,
        message:
          `Remove this image from the ${draftReferences.join(', ').toUpperCase()} editor and save the draft before deleting it.`,
      };
    }

    const publications = await db
      .selectFrom('writing_publications')
      .select(['locale', 'snapshot'])
      .where('writing_id', '=', writingId)
      .execute();
    const publishedReferences = publications.flatMap((publication) => {
      const snapshot = parseWritingPublicationSnapshot(publication.snapshot);
      const referenced =
        snapshot.assets.some((candidate) => candidate.id === assetId) ||
        writingDocumentAssetIds(snapshot.document).includes(assetId);
      return referenced ? [publication.locale] : [];
    });
    if (publishedReferences.length > 0) {
      return {
        ok: false,
        message:
          `Deletion blocked: published snapshot(s) ${publishedReferences.join(', ').toUpperCase()} still reference this image. Republish or unpublish them first.`,
      };
    }

    const [
      writingReferences,
      systemReferences,
      profileReferences,
      credentialReferences,
      learningArtifactReferences,
    ] = await Promise.all([
      db
        .selectFrom('writing_assets')
        .select('writing_id')
        .where('asset_id', '=', assetId)
        .execute(),
      db
        .selectFrom('system_assets')
        .select('system_id')
        .where('asset_id', '=', assetId)
        .execute(),
      db
        .selectFrom('profiles')
        .select(['portrait_asset_id', 'source_cv_asset_id'])
        .execute(),
      db
        .selectFrom('credentials')
        .select('id')
        .where('source_asset_id', '=', assetId)
        .execute(),
      db
        .selectFrom('learning_artifacts')
        .select('id')
        .where('source_asset_id', '=', assetId)
        .execute(),
    ]);
    const sharedReference =
      writingReferences.some((reference) => reference.writing_id !== writingId) ||
      systemReferences.length > 0 ||
      profileReferences.some(
        (profile) =>
          profile.portrait_asset_id === assetId ||
          profile.source_cv_asset_id === assetId,
      ) ||
      credentialReferences.length > 0 ||
      learningArtifactReferences.length > 0;
    if (sharedReference) {
      return {
        ok: false,
        message: 'Deletion blocked: this asset is still used by another context.',
      };
    }

    try {
      await deleteAssetObject(asset.storage_key);
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof Error
            ? `Storage deletion failed; metadata was kept so the operation can be retried: ${error.message}`
            : 'Storage deletion failed; metadata was kept so the operation can be retried.',
      };
    }

    await db.transaction().execute(async (transaction) => {
      await transaction
        .deleteFrom('writing_assets')
        .where('writing_id', '=', writingId)
        .where('asset_id', '=', assetId)
        .execute();

      await transaction
        .deleteFrom('assets')
        .where('id', '=', assetId)
        .executeTakeFirstOrThrow();

      await writeAdminAuditEvent(transaction, {
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'writing.asset_deleted',
        entityType: 'asset',
        entityId: assetId,
        metadata: {
          writingId,
          storageObjectDeleted: true,
        },
      });
    });

    return { ok: true, message: 'Writing image removed from storage.' };
  }

  if (intent === 'save-categories') {
    const rawCategoryIds = form
      .getAll('categoryId')
      .filter((value): value is string => typeof value === 'string');
    if (rawCategoryIds.some((categoryId) => !uuidPattern.test(categoryId))) {
      throw new Response('Invalid Category selection.', { status: 400 });
    }

    const categoryIds = [...new Set(rawCategoryIds)];
    if (categoryIds.length > 0) {
      const existingCategories = await db
        .selectFrom('categories')
        .select('id')
        .where('id', 'in', categoryIds)
        .execute();
      if (existingCategories.length !== categoryIds.length) {
        throw new Response('Category not found.', { status: 404 });
      }
    }

    await db.transaction().execute(async (transaction) => {
      await transaction
        .deleteFrom('writing_categories')
        .where('writing_id', '=', writingId)
        .execute();

      if (categoryIds.length > 0) {
        await transaction
          .insertInto('writing_categories')
          .values(
            categoryIds.map((categoryId, position) => ({
              writing_id: writingId,
              category_id: categoryId,
              position,
            })),
          )
          .execute();
      }

      await transaction
        .updateTable('writing_localizations')
        .set({
          editorial_state: 'draft',
          published_at: null,
          updated_at: new Date(),
        })
        .where('writing_id', '=', writingId)
        .execute();

      await writeAdminAuditEvent(transaction, {
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'writing.categories_updated',
        entityType: 'writing',
        entityId: writingId,
        metadata: { categoryIds },
      });
    });

    return {
      ok: true,
      message: 'Writing categories saved as draft.',
    };
  }

  if (intent === 'save-tags') {
    const rawTagIds = form
      .getAll('tagId')
      .filter((value): value is string => typeof value === 'string');
    if (rawTagIds.some((tagId) => !uuidPattern.test(tagId))) {
      throw new Response('Invalid Tag selection.', { status: 400 });
    }

    const tagIds = [...new Set(rawTagIds)];
    if (tagIds.length > 0) {
      const existingTags = await db
        .selectFrom('tags')
        .select('id')
        .where('id', 'in', tagIds)
        .execute();
      if (existingTags.length !== tagIds.length) {
        throw new Response('Tag not found.', { status: 404 });
      }
    }

    await db.transaction().execute(async (transaction) => {
      await transaction
        .deleteFrom('writing_tags')
        .where('writing_id', '=', writingId)
        .execute();

      if (tagIds.length > 0) {
        await transaction
          .insertInto('writing_tags')
          .values(
            tagIds.map((tagId, position) => ({
              writing_id: writingId,
              tag_id: tagId,
              position,
            })),
          )
          .execute();
      }

      await transaction
        .updateTable('writing_localizations')
        .set({
          editorial_state: 'draft',
          published_at: null,
          updated_at: new Date(),
        })
        .where('writing_id', '=', writingId)
        .execute();

      await writeAdminAuditEvent(transaction, {
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'writing.tags_updated',
        entityType: 'writing',
        entityId: writingId,
        metadata: { tagIds },
      });
    });

    return {
      ok: true,
      message: 'Writing tags saved as draft.',
    };
  }

  if (intent === 'save-systems') {
    const rawSystemIds = form
      .getAll('systemId')
      .filter((value): value is string => typeof value === 'string');
    if (rawSystemIds.some((systemId) => !uuidPattern.test(systemId))) {
      throw new Response('Invalid System selection.', { status: 400 });
    }

    const systemIds = [...new Set(rawSystemIds)];
    if (systemIds.length > 0) {
      const existingSystems = await db
        .selectFrom('systems')
        .select('id')
        .where('id', 'in', systemIds)
        .where('lifecycle', '=', 'active')
        .execute();
      if (existingSystems.length !== systemIds.length) {
        throw new Response('System not found.', { status: 404 });
      }
    }

    await db.transaction().execute(async (transaction) => {
      await transaction
        .deleteFrom('writing_systems')
        .where('writing_id', '=', writingId)
        .execute();

      if (systemIds.length > 0) {
        await transaction
          .insertInto('writing_systems')
          .values(
            systemIds.map((systemId, position) => ({
              writing_id: writingId,
              system_id: systemId,
              position,
            })),
          )
          .execute();
      }

      await transaction
        .updateTable('writing_localizations')
        .set({
          editorial_state: 'draft',
          published_at: null,
          updated_at: new Date(),
        })
        .where('writing_id', '=', writingId)
        .execute();

      await writeAdminAuditEvent(transaction, {
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'writing.systems_updated',
        entityType: 'writing',
        entityId: writingId,
        metadata: { systemIds },
      });
    });

    return {
      ok: true,
      message: 'Writing systems saved as draft.',
    };
  }

  if (intent === 'update-settings') {
    const kind = requiredKind(form);
    const editorialWeight = requiredEditorialWeight(form);

    await db.transaction().execute(async (transaction) => {
      await transaction
        .updateTable('writings')
        .set({
          kind,
          editorial_weight: editorialWeight,
          updated_at: new Date(),
        })
        .where('id', '=', writingId)
        .execute();

      await transaction
        .updateTable('writing_localizations')
        .set({
          editorial_state: 'draft',
          published_at: null,
          updated_at: new Date(),
        })
        .where('writing_id', '=', writingId)
        .execute();

      await writeAdminAuditEvent(transaction, {
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'writing.settings_updated',
        entityType: 'writing',
        entityId: writingId,
        metadata: { kind, editorialWeight },
      });
    });

    return { ok: true, message: 'Writing settings saved as draft.' };
  }

  if (intent === 'save-localization') {
    const locale = requiredLocale(form);
    const slug = nullableField(form, 'slug');
    const title = nullableField(form, 'title');
    const summary = nullableField(form, 'summary');
    const editorDocument = requiredEditorDocument(form);
    const body = writingEditorDocumentToPlainText(editorDocument) || null;
    const documentAssetIds = writingDocumentAssetIds(editorDocument);

    if (documentAssetIds.length > 0) {
      const linkedAssets = await db
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
          'asset_localizations.alt_text',
        ])
        .where('writing_assets.writing_id', '=', writingId)
        .where('writing_assets.asset_id', 'in', documentAssetIds)
        .execute();
      const linkedById = new Map(linkedAssets.map((asset) => [asset.id, asset]));

      for (const assetId of documentAssetIds) {
        const asset = linkedById.get(assetId);
        if (asset === undefined) {
          throw new Response(
            'Writing document references media outside this Writing context.',
            { status: 400 },
          );
        }
        if (!asset.mime_type.startsWith('image/')) {
          throw new Response('Writing document media must be an image.', {
            status: 400,
          });
        }
        if ((asset.alt_text?.trim() ?? '') === '') {
          throw new Response(
            `${locale.toUpperCase()} alt text is required for every image used in the Writing.`,
            { status: 400 },
          );
        }
      }
    }

    await db.transaction().execute(async (transaction) => {
      await transaction
        .updateTable('writing_localizations')
        .set({
          slug,
          title,
          summary,
          body,
          editor_document:
            editorDocument as unknown as Record<string, unknown>,
          editorial_state: 'draft',
          published_at: null,
          updated_at: new Date(),
        })
        .where('writing_id', '=', writingId)
        .where('locale', '=', locale)
        .execute();

      await writeAdminAuditEvent(transaction, {
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'writing.localization_saved',
        entityType: 'writing',
        entityId: writingId,
        locale,
        metadata: {
          hasSlug: slug !== null,
          hasTitle: title !== null,
          hasSummary: summary !== null,
          hasBody: body !== null,
          hasEditorDocument: true,
          assetIds: documentAssetIds,
        },
      });
    });

    return {
      ok: true,
      message: `${locale.toUpperCase()} Writing draft saved.`,
    };
  }

  if (intent === 'publish') {
    const locale = requiredLocale(form);
    if (writing.lifecycle !== 'active') {
      return {
        ok: false,
        message: 'Restore this Writing before publishing a locale.',
      };
    }
    await publishWritingLocalization(db, { writingId, locale });
    await writeAdminAuditEvent(db, {
      actorUserId: session.user.id,
      actorEmail: session.user.email,
      action: 'writing.published',
      entityType: 'writing',
      entityId: writingId,
      locale,
    });
    return {
      ok: true,
      message: `${locale.toUpperCase()} Writing published.`,
    };
  }

  if (intent === 'unpublish') {
    const locale = requiredLocale(form);
    await unpublishWritingLocalization(db, { writingId, locale });
    await writeAdminAuditEvent(db, {
      actorUserId: session.user.id,
      actorEmail: session.user.email,
      action: 'writing.unpublished',
      entityType: 'writing',
      entityId: writingId,
      locale,
    });
    return {
      ok: true,
      message: `${locale.toUpperCase()} Writing unpublished.`,
    };
  }

  return { ok: false, message: 'Unknown Writing action.' };
}

export default function AdminWritingsRoute() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <main className="aks-admin-shell">
      <Container>
        <div className="aks-proof-stack">
          <section className="aks-admin-card">
            <div className="aks-proof-stack">
              <Text className="aks-proof-eyebrow" size="sm" tone="muted">
                Private administration
              </Text>
              <Heading level={1} size="md">
                Writings administration
              </Heading>
              <Text tone="muted">
                One Writing entity serves Notes, Articles, and Essays, and all
                three publish into the same public editorial feed. Editorial
                weight maps to code-owned presentation rather than configurable
                layout. Notes use a lightweight paragraph-only authoring path;
                Articles and Essays keep the controlled rich-content editor.
              </Text>
              <Text size="sm" tone="muted">
                AKS-106 defines a versioned rich-content vocabulary for
                paragraphs, H2/H3 headings, lists, quotations, code, callouts,
                images, and galleries. The vocabulary remains semantic and
                bounded: no raw HTML, arbitrary styling, templates, columns, or
                page-builder controls.
              </Text>
              <div className="aks-proof-actions">
                <Link href="/admin">Administration</Link>
                <Link href="/admin/writings/categories">Manage categories</Link>
                <Link href="/admin/writings/tags">Manage tags</Link>
                <Link href="/en/writings">Open Writings</Link>
              </div>
              {actionData?.message ? <Text>{actionData.message}</Text> : null}
            </div>
          </section>

          <section className="aks-admin-card">
            <div className="aks-proof-stack">
              <Heading level={2} size="sm">
                Create Writing
              </Heading>
              <Form method="post" className="aks-proof-stack">
                <input name="_intent" type="hidden" value="create-writing" />
                <label>
                  <span>Kind</span>
                  <select defaultValue="note" name="kind">
                    {writingKinds.map((kind) => (
                      <option key={kind} value={kind}>
                        {kind.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Editorial weight</span>
                  <select defaultValue="normal" name="editorialWeight">
                    {writingEditorialWeights.map((weight) => (
                      <option key={weight} value={weight}>
                        {weight.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </label>
                <Button type="submit">Create Writing</Button>
              </Form>
            </div>
          </section>

          {data.writings.map((writing) => (
            <section
              className="aks-admin-card"
              data-writing-card={writing.id}
              key={writing.id}
            >
              <div className="aks-proof-stack">
                <Heading level={2} size="sm">
                  {writing.title_en ?? writing.title_fr ?? 'Untitled Writing'}
                </Heading>
                <Text size="sm" tone="muted">
                  {writing.kind.toUpperCase()} ·{' '}
                  {writing.editorial_weight.toUpperCase()} ·{' '}
                  {writing.lifecycle.toUpperCase()} · Position{' '}
                  {writing.editorial_position + 1}
                </Text>

                <Form method="post" className="aks-proof-stack">
                  <input name="_intent" type="hidden" value="update-settings" />
                  <input name="writingId" type="hidden" value={writing.id} />
                  <label>
                    <span>Kind</span>
                    <select defaultValue={writing.kind} name="kind">
                      {writingKinds.map((kind) => (
                        <option key={kind} value={kind}>
                          {kind.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Editorial weight</span>
                    <select
                      defaultValue={writing.editorial_weight}
                      name="editorialWeight"
                    >
                      {writingEditorialWeights.map((weight) => (
                        <option key={weight} value={weight}>
                          {weight.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Button emphasis="quiet" type="submit">
                    Save Writing settings
                  </Button>
                </Form>

                <Form method="post">
                  <input
                    name="_intent"
                    type="hidden"
                    value={
                      writing.lifecycle === 'active'
                        ? 'archive-writing'
                        : 'restore-writing'
                    }
                  />
                  <input name="writingId" type="hidden" value={writing.id} />
                  <Button emphasis="quiet" type="submit">
                    {writing.lifecycle === 'active'
                      ? 'Archive Writing'
                      : 'Restore Writing'}
                  </Button>
                </Form>
                {writing.lifecycle === 'archived' ? (
                  <Text size="sm" tone="muted">
                    Archived · public snapshots are retained but excluded from
                    public lists, deep links, and related-content resolution.
                  </Text>
                ) : null}

                <Form method="post" className="aks-proof-stack">
                  <input name="_intent" type="hidden" value="save-categories" />
                  <input name="writingId" type="hidden" value={writing.id} />
                  <fieldset className="aks-admin-card">
                    <legend>Categories</legend>
                    {data.categories.length === 0 ? (
                      <Text size="sm" tone="muted">
                        No Category exists yet. Create one from the Category
                        administration surface.
                      </Text>
                    ) : (
                      <div className="aks-proof-stack">
                        {data.categories.map((category) => (
                          <label key={category.id}>
                            <input
                              defaultChecked={writing.categoryIds.includes(
                                category.id,
                              )}
                              name="categoryId"
                              type="checkbox"
                              value={category.id}
                            />{' '}
                            {category.name_en ??
                              category.name_fr ??
                              'Untitled Category'}
                          </label>
                        ))}
                      </div>
                    )}
                    <Text size="sm" tone="muted">
                      Assignment order follows the controlled Category order.
                      Saving marks both Writing localizations as draft; existing
                      public snapshots remain unchanged until republished.
                    </Text>
                    <Button emphasis="quiet" type="submit">
                      Save categories
                    </Button>
                  </fieldset>
                </Form>

                <Form method="post" className="aks-proof-stack">
                  <input name="_intent" type="hidden" value="save-tags" />
                  <input name="writingId" type="hidden" value={writing.id} />
                  <fieldset className="aks-admin-card">
                    <legend>Tags</legend>
                    {data.tags.length === 0 ? (
                      <Text size="sm" tone="muted">
                        No Tag exists yet. Create one from the Tag
                        administration surface.
                      </Text>
                    ) : (
                      <div className="aks-proof-stack">
                        {data.tags.map((tag) => (
                          <label key={tag.id}>
                            <input
                              defaultChecked={writing.tagIds.includes(tag.id)}
                              name="tagId"
                              type="checkbox"
                              value={tag.id}
                            />{' '}
                            {tag.name_en ??
                              tag.name_fr ??
                              tag.canonical_key}
                          </label>
                        ))}
                      </div>
                    )}
                    <Text size="sm" tone="muted">
                      Tags reuse one deduplicated identity. Saving marks both
                      Writing localizations as draft; published snapshots remain
                      unchanged until republished.
                    </Text>
                    <Button emphasis="quiet" type="submit">
                      Save tags
                    </Button>
                  </fieldset>
                </Form>

                <Form method="post" className="aks-proof-stack">
                  <input name="_intent" type="hidden" value="save-systems" />
                  <input name="writingId" type="hidden" value={writing.id} />
                  <fieldset className="aks-admin-card">
                    <legend>Systems</legend>
                    {data.systems.length === 0 ? (
                      <Text size="sm" tone="muted">
                        No active System exists yet.
                      </Text>
                    ) : (
                      <div className="aks-proof-stack">
                        {data.systems.map((system) => (
                          <label key={system.id}>
                            <input
                              defaultChecked={writing.systemIds.includes(
                                system.id,
                              )}
                              name="systemId"
                              type="checkbox"
                              value={system.id}
                            />{' '}
                            {system.title_en ??
                              system.title_fr ??
                              'Untitled System'}
                          </label>
                        ))}
                      </div>
                    )}
                    <Text size="sm" tone="muted">
                      The Writing owns this relation. Saving marks both Writing
                      localizations as draft; public System pages keep reading
                      the previous Writing snapshots until each locale is
                      republished.
                    </Text>
                    <Button emphasis="quiet" type="submit">
                      Save systems
                    </Button>
                  </fieldset>
                </Form>

                <section className="aks-admin-card" data-writing-assets>
                  <div className="aks-proof-stack">
                    <Heading level={3} size="sm">
                      Contextual media
                    </Heading>
                    <Text size="sm" tone="muted">
                      Upload images inside this Writing context. Alt text and
                      captions are localized independently. Alt text becomes
                      required only in a locale that actually inserts the image,
                      before that locale can be saved or published. There is no
                      global media-library workflow.
                    </Text>

                    <Form
                      className="aks-admin-form"
                      data-writing-asset-upload
                      encType="multipart/form-data"
                      method="post"
                    >
                      <input
                        name="_intent"
                        type="hidden"
                        value="upload-asset"
                      />
                      <input name="writingId" type="hidden" value={writing.id} />
                      <label>
                        <span>Image</span>
                        <input
                          accept="image/jpeg,image/png,image/webp,image/avif"
                          name="file"
                          required
                          type="file"
                        />
                      </label>
                      <label>
                        <span>English alt text · required only if EN uses this image</span>
                        <input name="altEn" type="text" />
                      </label>
                      <label>
                        <span>English caption</span>
                        <textarea name="captionEn" rows={2} />
                      </label>
                      <label>
                        <span>French alt text · required only if FR uses this image</span>
                        <input name="altFr" type="text" />
                      </label>
                      <label>
                        <span>French caption</span>
                        <textarea name="captionFr" rows={2} />
                      </label>
                      <Text size="sm" tone="muted">
                        JPEG, PNG, WebP, or AVIF · maximum 10 MiB.
                      </Text>
                      <Button emphasis="quiet" type="submit">
                        Upload Writing image
                      </Button>
                    </Form>

                    {writing.assets.length === 0 ? (
                      <Text size="sm" tone="muted">
                        No contextual media is linked to this Writing yet.
                      </Text>
                    ) : (
                      <div className="aks-admin-asset-list">
                        {writing.assets.map((asset) => (
                          <article className="aks-admin-asset" key={asset.id}>
                            <div className="aks-proof-stack">
                              <Text tone="strong">
                                {asset.original_filename}
                              </Text>
                              <Text size="sm" tone="muted">
                                {asset.mime_type} · {asset.byte_size} bytes
                                {asset.width !== null && asset.height !== null
                                  ? ` · ${asset.width}×${asset.height}`
                                  : ''}
                              </Text>
                              <Link
                                href={`/admin/writings/${writing.id}/assets/${asset.id}`}
                              >
                                Inspect private image
                              </Link>

                              <Form method="post" className="aks-admin-form">
                                <input
                                  name="_intent"
                                  type="hidden"
                                  value="update-asset-metadata"
                                />
                                <input
                                  name="writingId"
                                  type="hidden"
                                  value={writing.id}
                                />
                                <input
                                  name="assetId"
                                  type="hidden"
                                  value={asset.id}
                                />
                                <label>
                                  <span>English alt text · required if EN uses this image</span>
                                  <input
                                    defaultValue={asset.alt_en ?? ''}
                                    name="altEn"
                                  />
                                </label>
                                <label>
                                  <span>English caption</span>
                                  <textarea
                                    defaultValue={asset.caption_en ?? ''}
                                    name="captionEn"
                                    rows={2}
                                  />
                                </label>
                                <label>
                                  <span>French alt text · required if FR uses this image</span>
                                  <input
                                    defaultValue={asset.alt_fr ?? ''}
                                    name="altFr"
                                  />
                                </label>
                                <label>
                                  <span>French caption</span>
                                  <textarea
                                    defaultValue={asset.caption_fr ?? ''}
                                    name="captionFr"
                                    rows={2}
                                  />
                                </label>
                                <Button emphasis="quiet" type="submit">
                                  Save image metadata
                                </Button>
                              </Form>

                              <Form method="post">
                                <input
                                  name="_intent"
                                  type="hidden"
                                  value="delete-asset"
                                />
                                <input
                                  name="writingId"
                                  type="hidden"
                                  value={writing.id}
                                />
                                <input
                                  name="assetId"
                                  type="hidden"
                                  value={asset.id}
                                />
                                <Button emphasis="quiet" type="submit">
                                  Delete unused image
                                </Button>
                              </Form>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                </section>

                <div className="aks-proof-stack">
                  {(['en', 'fr'] as const).map((locale) => {
                    const slug =
                      locale === 'en' ? writing.slug_en : writing.slug_fr;
                    const title =
                      locale === 'en' ? writing.title_en : writing.title_fr;
                    const summary =
                      locale === 'en' ? writing.summary_en : writing.summary_fr;
                    const body =
                      locale === 'en' ? writing.body_en : writing.body_fr;
                    const editorDocument = writingEditorDocumentForDraft(
                      locale === 'en'
                        ? writing.editor_document_en
                        : writing.editor_document_fr,
                      body,
                    );
                    const editorialState =
                      locale === 'en'
                        ? writing.editorial_state_en
                        : writing.editorial_state_fr;
                    const publishedSlug =
                      locale === 'en'
                        ? writing.published_slug_en
                        : writing.published_slug_fr;

                    return (
                      <fieldset className="aks-admin-card" key={locale}>
                        <legend>{locale.toUpperCase()}</legend>
                        <Text size="sm" tone="muted">
                          Draft state · {editorialState ?? 'draft'} ·{' '}
                          {publishedSlug === null
                            ? 'No public snapshot'
                            : 'Public snapshot available'}
                        </Text>
                        <Form method="post" className="aks-proof-stack">
                          <input
                            name="_intent"
                            type="hidden"
                            value="save-localization"
                          />
                          <input
                            name="writingId"
                            type="hidden"
                            value={writing.id}
                          />
                          <input name="locale" type="hidden" value={locale} />
                          <label>
                            <span>Slug</span>
                            <input
                              defaultValue={slug ?? ''}
                              name="slug"
                              placeholder={
                                locale === 'fr'
                                  ? 'mon-ecrit'
                                  : 'my-writing'
                              }
                            />
                          </label>
                          <label>
                            <span>Title</span>
                            <input
                              defaultValue={title ?? ''}
                              name="title"
                            />
                          </label>
                          {writing.kind === 'note' ? (
                            <>
                              <input name="summary" type="hidden" value="" />
                              <Text size="sm" tone="muted">
                                {locale === 'fr'
                                  ? 'L’extrait du flux est dérivé automatiquement du corps de la Note.'
                                  : 'The feed excerpt is derived automatically from the Note body.'}
                              </Text>
                              <WritingNoteEditor
                                initialDocument={editorDocument}
                                locale={locale}
                              />
                            </>
                          ) : (
                            <>
                              <label>
                                <span>Summary</span>
                                <textarea
                                  defaultValue={summary ?? ''}
                                  name="summary"
                                  rows={3}
                                />
                              </label>
                              <WritingBodyEditor
                                assets={writing.assets.map((asset) => ({
                                  id: asset.id,
                                  label: asset.original_filename,
                                  altText:
                                    locale === 'en' ? asset.alt_en : asset.alt_fr,
                                  caption:
                                    locale === 'en'
                                      ? asset.caption_en
                                      : asset.caption_fr,
                                }))}
                                initialDocument={editorDocument}
                                locale={locale}
                              />
                            </>
                          )}
                          <Button type="submit">
                            Save {locale.toUpperCase()} draft
                          </Button>
                        </Form>

                        <div className="aks-proof-actions">
                          <Link
                            href={`/admin/writings/${writing.id}/preview/${locale}`}
                          >
                            Preview {locale.toUpperCase()}
                          </Link>
                          <Form method="post">
                            <input name="_intent" type="hidden" value="publish" />
                            <input
                              name="writingId"
                              type="hidden"
                              value={writing.id}
                            />
                            <input name="locale" type="hidden" value={locale} />
                            <Button
                              disabled={writing.lifecycle !== 'active'}
                              emphasis="quiet"
                              type="submit"
                            >
                              {publishedSlug === null
                                ? 'Publish'
                                : 'Publish update'}{' '}
                              {locale.toUpperCase()}
                            </Button>
                          </Form>

                          {publishedSlug !== null ? (
                            <>
                              <Form method="post">
                                <input
                                  name="_intent"
                                  type="hidden"
                                  value="unpublish"
                                />
                                <input
                                  name="writingId"
                                  type="hidden"
                                  value={writing.id}
                                />
                                <input
                                  name="locale"
                                  type="hidden"
                                  value={locale}
                                />
                                <Button emphasis="quiet" type="submit">
                                  Unpublish {locale.toUpperCase()}
                                </Button>
                              </Form>
                              {writing.lifecycle === 'active' ? (
                                <Link href={publicHref(locale, publishedSlug)}>
                                  Open public
                                </Link>
                              ) : (
                                <Text size="sm" tone="muted">
                                  Public snapshot hidden while archived.
                                </Text>
                              )}
                            </>
                          ) : null}
                        </div>
                      </fieldset>
                    );
                  })}
                </div>
              </div>
            </section>
          ))}
        </div>
      </Container>
    </main>
  );
}
