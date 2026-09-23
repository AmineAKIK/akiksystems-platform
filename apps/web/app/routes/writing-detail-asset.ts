import { parseWritingPublicationSnapshot } from '@akiksystems/db';

import { requireLocale } from '../i18n/locales';
import { getAssetObject } from '../lib/asset-storage.server';
import { appDb } from '../lib/db.server';
import {
  parsePublicImageWidth,
  resizePublicImage,
} from '../lib/image-variant.server';

import type { Route } from './+types/writing-detail-asset';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function loader({ request, params }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale);
  const slug = params.slug;
  const assetId = params.assetId;

  if (
    slug === undefined ||
    assetId === undefined ||
    !slugPattern.test(slug) ||
    !uuidPattern.test(assetId)
  ) {
    throw new Response('Asset not found.', { status: 404 });
  }

  const publication = await appDb
    .selectFrom('writing_publications')
    .innerJoin('writings', 'writings.id', 'writing_publications.writing_id')
    .select('writing_publications.snapshot')
    .where('writings.lifecycle', '=', 'active')
    .where('writing_publications.locale', '=', locale)
    .where('writing_publications.slug', '=', slug)
    .executeTakeFirst();

  const snapshot =
    publication === undefined
      ? null
      : parseWritingPublicationSnapshot(publication.snapshot);
  const publishedAsset = snapshot?.assets.find((asset) => asset.id === assetId);

  if (snapshot === null || publishedAsset === undefined) {
    throw new Response('Asset not found.', { status: 404 });
  }

  const asset = await appDb
    .selectFrom('assets')
    .select(['storage_key', 'mime_type', 'width'])
    .where('id', '=', assetId)
    .executeTakeFirst();

  if (
    asset === undefined ||
    !asset.mime_type.startsWith('image/') ||
    asset.mime_type !== publishedAsset.mimeType
  ) {
    throw new Response('Asset not found.', { status: 404 });
  }

  const stored = await getAssetObject(asset.storage_key);
  const requestedWidth = parsePublicImageWidth(
    new URL(request.url).searchParams.get('width'),
  );
  const canResize =
    requestedWidth !== null &&
    (asset.width === null || requestedWidth < asset.width);

  if (!canResize) {
    return new Response(stored.body, {
      headers: {
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'Content-Type': asset.mime_type,
        'Content-Disposition': 'inline',
        Vary: 'Accept',
      },
    });
  }

  const bytes = new Uint8Array(await stored.arrayBuffer());
  const variant = await resizePublicImage(bytes, asset.mime_type, requestedWidth);
  const body = variant.buffer.slice(
    variant.byteOffset,
    variant.byteOffset + variant.byteLength,
  ) as ArrayBuffer;

  return new Response(body, {
    headers: {
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Type': asset.mime_type,
      'Content-Disposition': 'inline',
      'Content-Length': String(variant.byteLength),
      Vary: 'Accept',
    },
  });
}
