import {
  getDraftProfile,
  publishProfileLocalization,
  unpublishProfileLocalization,
  writeAdminAuditEvent,
} from '@akiksystems/db';
import { Button, Container, Heading, Link, Text } from '@akiksystems/ui';
import { Form, useActionData, useLoaderData } from 'react-router';

import { requireAdminSession } from '../lib/admin.server';
import { appDb } from '../lib/db.server';

import type { Route } from './+types/admin-profile';

function formLocale(form: FormData): 'en' | 'fr' {
  return form.get('locale') === 'fr' ? 'fr' : 'en';
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await requireAdminSession(request);
  const locale =
    new URL(request.url).searchParams.get('locale') === 'fr' ? 'fr' : 'en';
  const profile = await getDraftProfile(appDb, locale);

  if (profile === null) {
    throw new Response('Profile not found.', { status: 404 });
  }

  const publication = await appDb
    .selectFrom('profile_publications')
    .select(['published_at', 'updated_at'])
    .where('profile_id', '=', profile.id)
    .where('locale', '=', locale)
    .executeTakeFirst();

  const ready =
    (profile.displayName?.trim() ?? '') !== '' &&
    profile.content.hero.professionalTitle.trim() !== '' &&
    profile.content.hero.introduction.trim() !== '';

  return {
    locale,
    profile,
    publication:
      publication === undefined
        ? null
        : {
            publishedAt: publication.published_at.toISOString(),
            updatedAt: publication.updated_at.toISOString(),
          },
    ready,
    operatorEmail: session.user.email,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const session = await requireAdminSession(request);
  const form = await request.formData();
  const locale = formLocale(form);
  const intent = form.get('_intent');

  const profile = await appDb
    .selectFrom('profiles')
    .select('id')
    .where('singleton_key', '=', 'public')
    .executeTakeFirstOrThrow();

  try {
    if (intent === 'publish') {
      const snapshot = await publishProfileLocalization(appDb, { locale });
      await writeAdminAuditEvent(appDb, {
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'profile.localization_published',
        entityType: 'profile',
        entityId: profile.id,
        locale,
        metadata: {
          snapshotVersion: snapshot.version,
          stackGroupCount: snapshot.stackGroups.length,
          contactCount: snapshot.contacts.length,
        },
      });

      return {
        ok: true,
        message: `${locale.toUpperCase()} Profile published.`,
      };
    }

    if (intent === 'unpublish') {
      await unpublishProfileLocalization(appDb, { locale });
      await writeAdminAuditEvent(appDb, {
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'profile.localization_unpublished',
        entityType: 'profile',
        entityId: profile.id,
        locale,
        metadata: {},
      });

      return {
        ok: true,
        message: `${locale.toUpperCase()} Profile unpublished.`,
      };
    }

    return { ok: false, message: 'Unknown Profile action.' };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Profile action failed.',
    };
  }
}

export default function AdminProfile() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const publicHref = data.locale === 'fr' ? '/fr/profil' : '/en/profile';

  return (
    <main
      className="aks-proof-page"
      data-profile-admin-contract="v1"
      data-profile-locale={data.locale}
    >
      <Container width="wide">
        <div className="aks-proof-stack">
          <div className="aks-proof-actions">
            <Link href="/admin">Administration</Link>
            <Link href="/admin/profile?locale=en">EN</Link>
            <Link href="/admin/profile?locale=fr">FR</Link>
            {data.publication !== null ? (
              <Link href={publicHref}>Open public Profile</Link>
            ) : null}
          </div>

          <header className="aks-proof-stack">
            <Text className="aks-proof-eyebrow" size="sm" tone="muted">
              Profile domain · {data.locale.toUpperCase()}
            </Text>
            <Heading level={1} size="md">
              Final Profile contract
            </Heading>
            <Text tone="muted">
              {data.operatorEmail} · {data.profile.editorialState}
            </Text>
            <Text size="sm" tone="muted">
              This surface exposes the rebuilt Profile domain and its publication
              boundary. The visual inline editor is built on this contract rather
              than preserving the retired Profile model.
            </Text>
          </header>

          {actionData !== undefined ? (
            <Text tone={actionData.ok ? 'strong' : 'muted'}>
              {actionData.message}
            </Text>
          ) : null}

          <section className="aks-proof-stack" aria-labelledby="profile-admin-readiness">
            <Heading id="profile-admin-readiness" level={2} size="sm">
              Publication
            </Heading>
            <Text size="sm" tone={data.ready ? 'strong' : 'muted'}>
              {data.ready
                ? 'Minimum publication contract is complete.'
                : 'Display name, professional title and introduction are required.'}
            </Text>
            <Text size="sm" tone="muted">
              {data.publication === null
                ? 'No public snapshot for this locale.'
                : `Published snapshot · ${data.publication.publishedAt}`}
            </Text>
            <div className="aks-proof-actions">
              <Form method="post">
                <input name="locale" type="hidden" value={data.locale} />
                <Button
                  disabled={!data.ready}
                  name="_intent"
                  type="submit"
                  value="publish"
                >
                  {data.publication === null
                    ? `Publish ${data.locale.toUpperCase()}`
                    : `Publish ${data.locale.toUpperCase()} update`}
                </Button>
              </Form>
              {data.publication !== null ? (
                <Form method="post">
                  <input name="locale" type="hidden" value={data.locale} />
                  <Button
                    emphasis="quiet"
                    name="_intent"
                    type="submit"
                    value="unpublish"
                  >
                    Unpublish {data.locale.toUpperCase()}
                  </Button>
                </Form>
              ) : null}
            </div>
          </section>

          <section className="aks-proof-stack" aria-labelledby="profile-admin-identity">
            <Heading id="profile-admin-identity" level={2} size="sm">
              Identity
            </Heading>
            <Text>
              {data.profile.displayName?.trim() || 'Display name not set'}
            </Text>
            <Text size="sm" tone="muted">
              {data.profile.content.hero.professionalTitle.trim() ||
                'Professional title not set'}
            </Text>
            <Text size="sm" tone="muted">
              {data.profile.content.hero.introduction.trim() ||
                'Introduction not set'}
            </Text>
            <Text size="sm" tone="muted">
              Portrait: {data.profile.portraitAssetId === null ? 'none' : 'linked'} ·
              CV: {data.profile.sourceCvAssetId === null ? 'none' : 'linked'}
            </Text>
          </section>

          <section className="aks-proof-stack" aria-labelledby="profile-admin-relations">
            <Heading id="profile-admin-relations" level={2} size="sm">
              Structured relations
            </Heading>
            <Text size="sm" tone="muted">
              Contacts: {data.profile.contacts.length} · Languages:{' '}
              {data.profile.languages.length} · Stack groups:{' '}
              {data.profile.stackGroups.length}
            </Text>
            <Text size="sm" tone="muted">
              Current System: {data.profile.currentSystemId ?? 'none'}
            </Text>
            <Text size="sm" tone="muted">
              Systemic Scale Writing:{' '}
              {data.profile.systemicScaleWritingId ?? 'none'}
            </Text>
          </section>

          {data.profile.stackGroups.length > 0 ? (
            <section className="aks-proof-stack" aria-labelledby="profile-admin-stack">
              <Heading id="profile-admin-stack" level={2} size="sm">
                Stack groups
              </Heading>
              {data.profile.stackGroups.map((group) => (
                <article key={group.id}>
                  <Heading level={3} size="sm">
                    {group.title ?? 'Unlocalized group'}
                  </Heading>
                  <Text size="sm" tone="muted">
                    {group.technologies.map((technology) => technology.name).join(' · ')}
                  </Text>
                </article>
              ))}
            </section>
          ) : null}
        </div>
      </Container>
    </main>
  );
}
