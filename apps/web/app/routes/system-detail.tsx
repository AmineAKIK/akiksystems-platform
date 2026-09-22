import { getPublishedSystem } from '@akiksystems/db';
import {
  data,
  useLoaderData,
  type MetaDescriptor,
} from 'react-router';

import { SystemExperience } from '../components/system-experience-resolver';
import { getAssetObjectRange } from '../lib/asset-storage.server';
import { appDb } from '../lib/db.server';
import { imageDimensions } from '../lib/image-dimensions.server';
import { requireLocale } from '../i18n/locales';

import type { Route } from './+types/system-detail';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const canonicalOrigin = 'https://akiksystems.com';

function requiredSlug(value: string | undefined): string {
  if (value === undefined || !slugPattern.test(value)) {
    throw new Response('System not found.', { status: 404 });
  }

  return value;
}


async function ensureMediaDimensions<
  T extends {
    id: string;
    mimeType: string;
    width: number | null;
    height: number | null;
  },
>(media: T[]): Promise<T[]> {
  const missing = media.filter(
    (asset) =>
      asset.mimeType.startsWith('image/') &&
      (asset.width === null || asset.height === null),
  );

  if (missing.length === 0) {
    return media;
  }

  const rows = await appDb
    .selectFrom('assets')
    .select(['id', 'storage_key', 'mime_type', 'width', 'height'])
    .where(
      'id',
      'in',
      missing.map(({ id }) => id),
    )
    .execute();

  const discovered = new Map<string, { width: number; height: number }>();

  await Promise.all(
    rows.map(async (asset) => {
      if (asset.width !== null && asset.height !== null) {
        discovered.set(asset.id, {
          width: asset.width,
          height: asset.height,
        });
        return;
      }

      try {
        const bytes = await getAssetObjectRange(asset.storage_key);
        const dimensions = imageDimensions(asset.mime_type, bytes);
        if (dimensions === null) return;

        discovered.set(asset.id, dimensions);
        await appDb
          .updateTable('assets')
          .set(dimensions)
          .where('id', '=', asset.id)
          .where('width', 'is', null)
          .where('height', 'is', null)
          .execute();
      } catch {
        // Historical dimension discovery must never make a published System unavailable.
      }
    }),
  );

  return media.map((asset) => {
    const dimensions = discovered.get(asset.id);
    return dimensions === undefined ? asset : { ...asset, ...dimensions };
  });
}

function publicSystemUrl(locale: 'en' | 'fr', slug: string): string {
  return `${canonicalOrigin}/${locale}/systems/${slug}`;
}

export async function loader({ params }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale);
  const slug = requiredSlug(params.slug);
  const db = appDb;

    const system = await getPublishedSystem(db, { locale, slug });

    if (system === null) {
      throw new Response('System not found.', { status: 404 });
    }

    const media = await ensureMediaDimensions(system.media);

    return data(
      {
        system: {
          ...system,
          publishedAt: system.publishedAt.toISOString(),
          media: media.map((asset) => ({
            ...asset,
            url: `/${locale}/systems/${slug}/assets/${asset.id}`,
          })),
        },
        localContext: {
          title: system.title,
          alternateHref:
            system.alternate === null
              ? null
              : `/${system.alternate.locale}/systems/${system.alternate.slug}`,
        },
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
        },
      },
    );
}

export function meta({ loaderData }: Route.MetaArgs): MetaDescriptor[] {
  if (loaderData === undefined) {
    return [{ title: 'System · AkikSystems' }];
  }

  const { system } = loaderData;
  const canonicalUrl = publicSystemUrl(system.locale, system.slug);
  const descriptors: MetaDescriptor[] = [
    { title: `${system.title} · AkikSystems` },
    { name: 'description', content: system.summary },
    {
      name: 'robots',
      content: 'index, follow, max-image-preview:large, max-snippet:-1',
    },
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: 'AkikSystems' },
    { property: 'og:title', content: system.title },
    { property: 'og:description', content: system.summary },
    { property: 'og:url', content: canonicalUrl },
    {
      property: 'og:locale',
      content: system.locale === 'fr' ? 'fr_FR' : 'en_US',
    },
    { name: 'twitter:card', content: 'summary_large_image' },
    { tagName: 'link', rel: 'canonical', href: canonicalUrl },
    {
      tagName: 'link',
      rel: 'alternate',
      hrefLang: system.locale,
      href: canonicalUrl,
    },
  ];

  if (system.alternate !== null) {
    const alternateUrl = publicSystemUrl(
      system.alternate.locale,
      system.alternate.slug,
    );

    descriptors.push(
      {
        property: 'og:locale:alternate',
        content: system.alternate.locale === 'fr' ? 'fr_FR' : 'en_US',
      },
      {
        tagName: 'link',
        rel: 'alternate',
        hrefLang: system.alternate.locale,
        href: alternateUrl,
      },
    );
  }

  const englishUrl =
    system.locale === 'en'
      ? canonicalUrl
      : system.alternate?.locale === 'en'
        ? publicSystemUrl(system.alternate.locale, system.alternate.slug)
        : null;

  if (englishUrl !== null) {
    descriptors.push({
      tagName: 'link',
      rel: 'alternate',
      hrefLang: 'x-default',
      href: englishUrl,
    });
  }

  return descriptors;
}

export default function SystemDetailRoute() {
  const { system } = useLoaderData<typeof loader>();
  return (
    <SystemExperience
      assets={system.media}
      links={system.links}
      locale={system.locale}
      originSummary={system.origin?.summary ?? null}
      originTitle={system.origin?.title ?? null}
      presentationDocument={system.presentationDocument}
      proofTransparency={system.proofTransparency}
      presentationKind={system.presentationKind}
      summary={system.summary}
      technologies={system.technologies}
      title={system.title}
    />
  );
}
