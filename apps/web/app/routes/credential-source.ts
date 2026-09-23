import { getPublishedCredential } from '@akiksystems/db';

import { requireLocale } from '../i18n/locales';
import { getAssetObject } from '../lib/asset-storage.server';
import { appDb } from '../lib/db.server';

import type { Route } from './+types/credential-source';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function loader({ params }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale);
  const slug = params.slug;
  if (slug === undefined || !slugPattern.test(slug)) {
    throw new Response('Credential source not found.', { status: 404 });
  }

  const credential = await getPublishedCredential(appDb, { locale, slug });
  if (credential?.sourceAssetId === null || credential === null) {
    throw new Response('Credential source not found.', { status: 404 });
  }

  const asset = await appDb
    .selectFrom('assets')
    .select(['storage_key', 'mime_type', 'original_filename'])
    .where('id', '=', credential.sourceAssetId)
    .executeTakeFirst();

  if (asset === undefined) {
    throw new Response('Credential source not found.', { status: 404 });
  }

  const stored = await getAssetObject(asset.storage_key);
  const safeFilename = asset.original_filename.replace(/[\r\n"]/g, '_');

  return new Response(stored.body, {
    headers: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
      'Content-Type': asset.mime_type,
      'Content-Disposition': `inline; filename="${safeFilename}"`,
    },
  });
}
