import type {
  PlatformLocale,
  PresentationDocument,
  SystemEvidencePolicy,
  SystemLinkKind,
  SystemPresentationKind,
} from '@akiksystems/core';
import type { Kysely } from 'kysely';

import {
  parseSystemPublicationSnapshot,
  type SystemPublicationSnapshot,
} from './system-publication.js';
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
  label: string | null;
  position: number;
}

export interface PublicSystemMedia {
  id: string;
  mimeType: string;
  altText: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
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
  evidencePolicy: SystemEvidencePolicy;
  slug: string;
  title: string;
  summary: string;
  proofTransparency: {
    role: string;
    maturity: string;
    demoNature: string;
    dataNature: string;
    limits: string;
  };
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

function listItemFromSnapshot(
  snapshot: SystemPublicationSnapshot,
  publishedAt: Date,
  position: number,
  featured: boolean,
): PublishedSystemListItem {
  return {
    id: snapshot.systemId,
    locale: snapshot.locale,
    slug: snapshot.slug,
    title: snapshot.title,
    summary: snapshot.summary,
    publishedAt,
    position,
    featured,
  };
}

export async function listPublishedSystems(
  db: Kysely<Database>,
  input: ListPublishedSystemsInput,
): Promise<PublishedSystemListItem[]> {
  const rows = await db
    .selectFrom('system_publications')
    .innerJoin('systems', 'systems.id', 'system_publications.system_id')
    .select([
      'system_publications.snapshot',
      'system_publications.published_at',
      'systems.editorial_position',
      'systems.featured',
    ])
    .where('systems.lifecycle', '=', 'active')
    .where('system_publications.locale', '=', input.locale)
    .orderBy('systems.editorial_position')
    .orderBy('systems.created_at')
    .orderBy('systems.id')
    .execute();

  return rows.flatMap((row) => {
    const snapshot = parseSystemPublicationSnapshot(row.snapshot);
    return snapshot === null
      ? []
      : [
          listItemFromSnapshot(
            snapshot,
            row.published_at,
            row.editorial_position,
            row.featured,
          ),
        ];
  });
}

export async function getPublishedSystem(
  db: Kysely<Database>,
  input: GetPublishedSystemInput,
): Promise<PublishedSystem | null> {
  const publication = await db
    .selectFrom('system_publications')
    .innerJoin('systems', 'systems.id', 'system_publications.system_id')
    .select([
      'system_publications.system_id',
      'system_publications.snapshot',
      'system_publications.published_at',
    ])
    .where('systems.lifecycle', '=', 'active')
    .where('system_publications.locale', '=', input.locale)
    .where('system_publications.slug', '=', input.slug)
    .executeTakeFirst();

  if (publication === undefined) {
    return null;
  }

  const snapshot = parseSystemPublicationSnapshot(publication.snapshot);
  if (snapshot === null) {
    return null;
  }

  const alternateLocale: PlatformLocale = input.locale === 'en' ? 'fr' : 'en';
  const alternate = await db
    .selectFrom('system_publications')
    .select(['locale', 'slug'])
    .where('system_id', '=', publication.system_id)
    .where('locale', '=', alternateLocale)
    .executeTakeFirst();

  return {
    id: snapshot.systemId,
    locale: snapshot.locale,
    presentationKind: snapshot.presentationKind,
    evidencePolicy: snapshot.evidencePolicy,
    slug: snapshot.slug,
    title: snapshot.title,
    summary: snapshot.summary,
    proofTransparency: snapshot.proofTransparency,
    publishedAt: publication.published_at,
    presentationDocument: snapshot.presentationDocument,
    technologies: snapshot.technologies,
    origin: snapshot.origin,
    links: snapshot.links,
    media: snapshot.media,
    alternate:
      alternate === undefined
        ? null
        : {
            locale: alternate.locale,
            slug: alternate.slug,
          },
  };
}
