import type {
  PlatformLocale,
  PresentationDocument,
  SystemLinkKind,
  SystemPresentationKind,
} from '@akiksystems/core';
import type { Kysely } from 'kysely';

import type { Database } from './schema.js';

export interface PublicSystemTechnology {
  id: string;
  slug: string;
  name: string;
  position: number;
}

export interface PublicSystemOrigin {
  id: string;
  title: string;
  summary: string | null;
}

export interface PublicSystemLink {
  id: string;
  kind: SystemLinkKind;
  url: string;
  position: number;
}

export interface PublicSystemMedia {
  id: string;
  mimeType: string;
  altText: string | null;
  caption: string | null;
  position: number;
}

export interface PublicSystemAlternate {
  locale: PlatformLocale;
  slug: string;
}

export interface PublishedSystemListItem {
  id: string;
  locale: PlatformLocale;
  slug: string;
  title: string;
  summary: string;
  publishedAt: Date;
  position: number;
  featured: boolean;
}

export interface ListPublishedSystemsInput {
  locale: PlatformLocale;
}

export interface PublishedSystem {
  id: string;
  locale: PlatformLocale;
  presentationKind: SystemPresentationKind;
  slug: string;
  title: string;
  summary: string;
  publishedAt: Date;
  presentationDocument: PresentationDocument;
  technologies: PublicSystemTechnology[];
  origin: PublicSystemOrigin | null;
  links: PublicSystemLink[];
  media: PublicSystemMedia[];
  alternate: PublicSystemAlternate | null;
}

export interface GetPublishedSystemInput {
  locale: PlatformLocale;
  slug: string;
}

export async function listPublishedSystems(
  db: Kysely<Database>,
  input: ListPublishedSystemsInput,
): Promise<PublishedSystemListItem[]> {
  const rows = await db
    .selectFrom('systems')
    .innerJoin(
      'system_localizations',
      'system_localizations.system_id',
      'systems.id',
    )
    .select([
      'systems.id',
      'systems.editorial_position',
      'systems.featured',
      'system_localizations.slug',
      'system_localizations.title',
      'system_localizations.summary',
      'system_localizations.published_at',
    ])
    .where('systems.lifecycle', '=', 'active')
    .where('system_localizations.locale', '=', input.locale)
    .where('system_localizations.editorial_state', '=', 'published')
    .where('system_localizations.slug', 'is not', null)
    .where('system_localizations.title', 'is not', null)
    .where('system_localizations.summary', 'is not', null)
    .where('system_localizations.published_at', 'is not', null)
    .orderBy('systems.editorial_position')
    .orderBy('systems.created_at')
    .orderBy('systems.id')
    .execute();

  return rows.flatMap((row) =>
    row.slug === null ||
    row.title === null ||
    row.summary === null ||
    row.published_at === null
      ? []
      : [
          {
            id: row.id,
            locale: input.locale,
            slug: row.slug,
            title: row.title,
            summary: row.summary,
            publishedAt: row.published_at,
            position: row.editorial_position,
            featured: row.featured,
          },
        ],
  );
}

export async function getPublishedSystem(
  db: Kysely<Database>,
  input: GetPublishedSystemInput,
): Promise<PublishedSystem | null> {
  const localization = await db
    .selectFrom('systems')
    .innerJoin(
      'system_localizations',
      'system_localizations.system_id',
      'systems.id',
    )
    .select([
      'systems.id',
      'systems.presentation_kind',
      'system_localizations.slug',
      'system_localizations.title',
      'system_localizations.summary',
      'system_localizations.published_at',
      'system_localizations.presentation_document',
    ])
    .where('systems.lifecycle', '=', 'active')
    .where('system_localizations.locale', '=', input.locale)
    .where('system_localizations.slug', '=', input.slug)
    .where('system_localizations.editorial_state', '=', 'published')
    .executeTakeFirst();

  if (
    localization === undefined ||
    localization.slug === null ||
    localization.title === null ||
    localization.summary === null ||
    localization.published_at === null ||
    localization.presentation_document === null
  ) {
    return null;
  }

  const systemId = localization.id;
  const alternateLocale: PlatformLocale = input.locale === 'en' ? 'fr' : 'en';

  const [technologies, origin, links, media, alternate] = await Promise.all([
    db
      .selectFrom('system_technologies')
      .innerJoin(
        'technologies',
        'technologies.id',
        'system_technologies.technology_id',
      )
      .select([
        'technologies.id',
        'technologies.slug',
        'technologies.name',
        'system_technologies.position',
      ])
      .where('system_technologies.system_id', '=', systemId)
      .orderBy('system_technologies.position')
      .execute(),
    db
      .selectFrom('system_experiences')
      .innerJoin(
        'experience_localizations',
        'experience_localizations.experience_id',
        'system_experiences.experience_id',
      )
      .select([
        'system_experiences.experience_id as id',
        'experience_localizations.title',
        'experience_localizations.summary',
      ])
      .where('system_experiences.system_id', '=', systemId)
      .where('system_experiences.relation_kind', '=', 'origin_context')
      .where('experience_localizations.locale', '=', input.locale)
      .executeTakeFirst(),
    db
      .selectFrom('system_links')
      .select(['id', 'kind', 'url', 'position'])
      .where('system_id', '=', systemId)
      .orderBy('position')
      .execute(),
    db
      .selectFrom('system_assets')
      .innerJoin('assets', 'assets.id', 'system_assets.asset_id')
      .leftJoin(
        'asset_localizations',
        (join) =>
          join
            .onRef('asset_localizations.asset_id', '=', 'assets.id')
            .on('asset_localizations.locale', '=', input.locale),
      )
      .select([
        'assets.id',
        'assets.mime_type',
        'asset_localizations.alt_text',
        'asset_localizations.caption',
        'system_assets.position',
      ])
      .where('system_assets.system_id', '=', systemId)
      .orderBy('system_assets.position')
      .execute(),
    db
      .selectFrom('system_localizations')
      .select(['locale', 'slug'])
      .where('system_id', '=', systemId)
      .where('locale', '=', alternateLocale)
      .where('editorial_state', '=', 'published')
      .where('slug', 'is not', null)
      .executeTakeFirst(),
  ]);

  return {
    id: systemId,
    locale: input.locale,
    presentationKind: localization.presentation_kind,
    slug: localization.slug,
    title: localization.title,
    summary: localization.summary,
    publishedAt: localization.published_at,
    presentationDocument: localization.presentation_document,
    technologies,
    origin: origin ?? null,
    links,
    media: media.map((asset) => ({
      id: asset.id,
      mimeType: asset.mime_type,
      altText: asset.alt_text,
      caption: asset.caption,
      position: asset.position,
    })),
    alternate:
      alternate === undefined || alternate.slug === null
        ? null
        : {
            locale: alternate.locale,
            slug: alternate.slug,
          },
  };
}
