import { createDatabase } from '@akiksystems/db';
import { Link, Text } from '@akiksystems/ui';

import { SystemDetailView } from '../components/system-detail-view';
import { requireAdminSession } from '../lib/admin.server';
import { authEnv } from '../lib/auth.server';

import type { Route } from './+types/admin-system-preview';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requiredSystemId(value: string | undefined): string {
  if (value === undefined || !uuidPattern.test(value)) {
    throw new Response('System not found.', { status: 404 });
  }

  return value;
}

function requiredLocale(value: string | undefined): 'en' | 'fr' {
  if (value !== 'en' && value !== 'fr') {
    throw new Response('Locale not found.', { status: 404 });
  }

  return value;
}

export function meta({ data }: Route.MetaArgs) {
  const title = data?.title
    ? `${data.title} · Preview · AkikSystems`
    : 'System preview · AkikSystems';

  return [
    { title },
    { name: 'robots', content: 'noindex, nofollow, noarchive, nosnippet' },
  ];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAdminSession(request);
  const systemId = requiredSystemId(params.systemId);
  const locale = requiredLocale(params.locale);
  const db = createDatabase(authEnv.DATABASE_URL);

  try {
    const localization = await db
      .selectFrom('systems')
      .innerJoin(
        'system_localizations',
        'system_localizations.system_id',
        'systems.id',
      )
      .select([
        'systems.id',
        'systems.lifecycle',
        'system_localizations.slug',
        'system_localizations.title',
        'system_localizations.summary',
        'system_localizations.editorial_state',
        'system_localizations.presentation_document',
      ])
      .where('systems.id', '=', systemId)
      .where('system_localizations.locale', '=', locale)
      .executeTakeFirst();

    if (
      localization === undefined ||
      localization.title === null ||
      localization.summary === null ||
      localization.presentation_document === null
    ) {
      throw new Response('Preview content is incomplete.', { status: 404 });
    }

    const [technologies, links, experience, assets] = await Promise.all([
      db
        .selectFrom('system_technologies')
        .innerJoin(
          'technologies',
          'technologies.id',
          'system_technologies.technology_id',
        )
        .select([
          'technologies.id',
          'technologies.name',
          'system_technologies.position',
        ])
        .where('system_technologies.system_id', '=', systemId)
        .orderBy('system_technologies.position')
        .execute(),
      db
        .selectFrom('system_links')
        .select(['id', 'kind', 'url', 'position'])
        .where('system_id', '=', systemId)
        .orderBy('position')
        .execute(),
      db
        .selectFrom('system_experiences')
        .innerJoin(
          'experience_localizations',
          'experience_localizations.experience_id',
          'system_experiences.experience_id',
        )
        .select([
          'experience_localizations.title',
          'experience_localizations.summary',
        ])
        .where('system_experiences.system_id', '=', systemId)
        .where('system_experiences.relation_kind', '=', 'origin_context')
        .where('experience_localizations.locale', '=', locale)
        .executeTakeFirst(),
      db
        .selectFrom('system_assets')
        .innerJoin('assets', 'assets.id', 'system_assets.asset_id')
        .leftJoin(
          'asset_localizations',
          (join) =>
            join
              .onRef('asset_localizations.asset_id', '=', 'assets.id')
              .on('asset_localizations.locale', '=', locale),
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
    ]);

    return Response.json(
      {
        systemId,
        locale,
        title: localization.title,
        summary: localization.summary,
        editorialState: localization.editorial_state,
        presentationDocument: localization.presentation_document,
        technologies,
        links,
        originTitle: experience?.title ?? null,
        originSummary: experience?.summary ?? null,
        assets: assets.map((asset) => ({
          id: asset.id,
          url: `/admin/systems/${systemId}/preview/${locale}/assets/${asset.id}`,
          altText: asset.alt_text,
          caption: asset.caption,
          mimeType: asset.mime_type,
        })),
      },
      {
        headers: {
          'Cache-Control': 'private, no-store, max-age=0',
          'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
          Pragma: 'no-cache',
        },
      },
    );
  } finally {
    await db.destroy();
  }
}

export default function AdminSystemPreview() {
  const data = useLoaderData<typeof loader>();

  return (
    <>
      <div className="aks-preview-toolbar" role="status">
        <Text size="sm" tone="muted">
          {data.locale.toUpperCase()} · {data.editorialState} · private preview
        </Text>
        <Link href={`/admin/systems/${data.systemId}`}>Back to workspace</Link>
      </div>
      <SystemDetailView
        assets={data.assets}
        links={data.links}
        locale={data.locale}
        originSummary={data.originSummary}
        originTitle={data.originTitle}
        presentationDocument={data.presentationDocument}
        preview
        summary={data.summary}
        technologies={data.technologies}
        title={data.title}
      />
    </>
  );
}
