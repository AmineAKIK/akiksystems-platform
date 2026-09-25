import {
  publishWorkWithUsLocalization,
  writeAdminAuditEvent,
} from '@akiksystems/db';
import { Container, Heading, Link, Text } from '@akiksystems/ui';
import { randomUUID } from 'node:crypto';
import { useActionData, useLoaderData } from 'react-router';

import { WorkWithUsAdminSection } from '../components/admin-work-with-us-section';
import { requireAdminSession } from '../lib/admin.server';
import { appDb } from '../lib/db.server';

import type { Route } from './+types/admin-work-with-us';

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

function optionalField(form: FormData, name: string): string | null {
  const value = field(form, name);
  return value === '' ? null : value;
}

function workWithUsContentFromForm(form: FormData) {
  return {
    hero: {
      eyebrow: optionalField(form, 'heroEyebrow'),
      title: optionalField(form, 'heroTitle'),
      introduction: optionalField(form, 'heroIntroduction'),
    },
    approach: {
      eyebrow: optionalField(form, 'approachEyebrow'),
      title: optionalField(form, 'approachTitle'),
      introduction: optionalField(form, 'approachIntroduction'),
      steps: [
        {
          key: 'understand' as const,
          title: optionalField(form, 'approach_understand_title'),
          body: optionalField(form, 'approach_understand_body'),
        },
        {
          key: 'structure' as const,
          title: optionalField(form, 'approach_structure_title'),
          body: optionalField(form, 'approach_structure_body'),
        },
        {
          key: 'build' as const,
          title: optionalField(form, 'approach_build_title'),
          body: optionalField(form, 'approach_build_body'),
        },
      ],
    },
    contact: {
      eyebrow: optionalField(form, 'contactEyebrow'),
      title: optionalField(form, 'contactTitle'),
      introduction: optionalField(form, 'contactIntroduction'),
      nameLabel: optionalField(form, 'contactNameLabel'),
      emailLabel: optionalField(form, 'contactEmailLabel'),
      organizationLabel: optionalField(form, 'contactOrganizationLabel'),
      messageLabel: optionalField(form, 'contactMessageLabel'),
      messagePlaceholder: optionalField(form, 'contactMessagePlaceholder'),
      listenLabel: optionalField(form, 'contactListenLabel'),
      submitLabel: optionalField(form, 'contactSubmitLabel'),
      successMessage: optionalField(form, 'contactSuccessMessage'),
      privacyNote: optionalField(form, 'contactPrivacyNote'),
    },
    about: {
      eyebrow: optionalField(form, 'aboutEyebrow'),
      title: optionalField(form, 'aboutTitle'),
      body: optionalField(form, 'aboutBody'),
      profileLinkLabel: optionalField(form, 'aboutProfileLinkLabel'),
    },
    systems: {
      eyebrow: optionalField(form, 'systemsEyebrow'),
      title: optionalField(form, 'systemsTitle'),
      introduction: optionalField(form, 'systemsIntroduction'),
      allSystemsLinkLabel: optionalField(form, 'systemsAllSystemsLinkLabel'),
    },
  };
}

type WorkWithUsAdminOperation = 'save' | 'publish';
type WorkWithUsAdminLocale = 'en' | 'fr';

interface WorkWithUsAdminCommand {
  operation: WorkWithUsAdminOperation;
  locale: WorkWithUsAdminLocale;
}

function parseWorkWithUsAdminCommand(
  intent: string,
): WorkWithUsAdminCommand | null {
  const match =
    /^(save|publish)-work-with-us-localization:(en|fr)$/.exec(intent);

  if (match === null) return null;

  return {
    operation: match[1] as WorkWithUsAdminOperation,
    locale: match[2] as WorkWithUsAdminLocale,
  };
}

async function ensureWorkWithUsPage() {
  const existing = await appDb
    .selectFrom('work_with_us_pages')
    .select('id')
    .where('singleton_key', '=', 'public')
    .executeTakeFirst();

  if (existing !== undefined) return existing;

  const id = randomUUID();
  await appDb
    .insertInto('work_with_us_pages')
    .values({ id, singleton_key: 'public' })
    .onConflict((conflict) => conflict.column('singleton_key').doNothing())
    .execute();

  return appDb
    .selectFrom('work_with_us_pages')
    .select('id')
    .where('singleton_key', '=', 'public')
    .executeTakeFirstOrThrow();
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await requireAdminSession(request);
  const page = await ensureWorkWithUsPage();

  const [localizations, publications] = await Promise.all([
    appDb
      .selectFrom('work_with_us_localizations')
      .selectAll()
      .where('page_id', '=', page.id)
      .execute(),
    appDb
      .selectFrom('work_with_us_publications')
      .select(['locale', 'published_at', 'updated_at'])
      .where('page_id', '=', page.id)
      .execute(),
  ]);

  return {
    email: session.user.email,
    pageId: page.id,
    localizations,
    publications,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const session = await requireAdminSession(request);
  const form = await request.formData();
  const intent = field(form, '_intent');
  const command = parseWorkWithUsAdminCommand(intent);

  if (command === null) {
    return {
      ok: false,
      message: 'Unsupported Work with us operation.',
    };
  }

  const page = await ensureWorkWithUsPage();
  const { locale, operation } = command;

  if (operation === 'save') {
    const content = workWithUsContentFromForm(form);
    const publicCopy = JSON.stringify(content);

    if (/\bcssov\b/i.test(publicCopy)) {
      return {
        ok: false,
        message:
          'Public collaboration copy must describe the practice directly without naming CSSOV.',
      };
    }

    await appDb.transaction().execute(async (transaction) => {
      await transaction
        .insertInto('work_with_us_localizations')
        .values({
          page_id: page.id,
          locale,
          content: content as unknown as Record<string, unknown>,
          editorial_state: 'draft',
          published_at: null,
        })
        .onConflict((conflict) =>
          conflict.columns(['page_id', 'locale']).doUpdateSet({
            content: content as unknown as Record<string, unknown>,
            editorial_state: 'draft',
            published_at: null,
            updated_at: new Date(),
          }),
        )
        .execute();

      await writeAdminAuditEvent(transaction, {
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'work_with_us.localization_saved',
        entityType: 'work_with_us',
        entityId: page.id,
        locale,
        metadata: {
          publicSnapshotPreserved: true,
          structureOwnedByCode: true,
        },
      });
    });

    return {
      ok: true,
      message: `${locale.toUpperCase()} Work with us draft saved.`,
    };
  }

  try {
    await publishWorkWithUsLocalization(appDb, page.id, locale);
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : 'Work with us content could not be published.',
    };
  }

  await writeAdminAuditEvent(appDb, {
    actorUserId: session.user.id,
    actorEmail: session.user.email,
    action: 'work_with_us.published',
    entityType: 'work_with_us',
    entityId: page.id,
    locale,
    metadata: {
      snapshotVersion: 2,
    },
  });

  return {
    ok: true,
    message: `${locale.toUpperCase()} Work with us content published.`,
  };
}

export default function AdminWorkWithUs() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <main className="aks-admin-shell">
      <Container>
        <div className="aks-proof-stack">
          <section className="aks-admin-card">
            <div className="aks-proof-stack">
              <Text className="aks-proof-eyebrow" size="sm" tone="muted">
                L7 · Work with us
              </Text>
              <Heading level={1} size="md">
                Work with us
              </Heading>
              <Text tone="muted">
                Maintain the localized editorial content for this destination.
                Structure, layout and behavior stay code-owned.
              </Text>
              <Text size="sm" tone="muted">
                Authenticated as {data.email}.
              </Text>
              <div className="aks-proof-actions">
                <Link href="/admin">Back to administration</Link>
                <Link href="/en/work-with-us">Open EN page</Link>
                <Link href="/fr/travailler-ensemble">Open FR page</Link>
              </div>
            </div>
          </section>

          <WorkWithUsAdminSection
            actionData={actionData}
            localizations={data.localizations}
            publications={data.publications}
          />
        </div>
      </Container>
    </main>
  );
}
