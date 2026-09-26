import {
  listWorkWithUsProofReferences,
  publishWorkWithUsLocalization,
  writeAdminAuditEvent,
} from '@akiksystems/db';
import { BrandSignature, Container, Heading, Link, Text } from '@akiksystems/ui';
import { randomUUID } from 'node:crypto';
import { useActionData, useLoaderData, useSearchParams } from 'react-router';

import { WorkWithUsAdminSection } from '../components/admin-work-with-us-section';
import { WorkWithUsSystemsSection } from '../components/admin-work-with-us-systems-section';
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

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requiredSystemId(form: FormData): string {
  const systemId = field(form, 'systemId');

  if (!uuidPattern.test(systemId)) {
    throw new Response('System not found.', { status: 404 });
  }

  return systemId;
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

  const [
    localizations,
    publications,
    systemRows,
    selectedSystemRows,
    englishSystemReferences,
    frenchSystemReferences,
  ] = await Promise.all([
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
      appDb
        .selectFrom('systems')
        .leftJoin(
          'system_localizations as system_en',
          (join) =>
            join
              .onRef('system_en.system_id', '=', 'systems.id')
              .on('system_en.locale', '=', 'en'),
        )
        .leftJoin(
          'system_localizations as system_fr',
          (join) =>
            join
              .onRef('system_fr.system_id', '=', 'systems.id')
              .on('system_fr.locale', '=', 'fr'),
        )
        .leftJoin(
          'system_publications as publication_en',
          (join) =>
            join
              .onRef('publication_en.system_id', '=', 'systems.id')
              .on('publication_en.locale', '=', 'en'),
        )
        .leftJoin(
          'system_publications as publication_fr',
          (join) =>
            join
              .onRef('publication_fr.system_id', '=', 'systems.id')
              .on('publication_fr.locale', '=', 'fr'),
        )
        .select([
          'systems.id',
          'systems.lifecycle',
          'systems.editorial_position',
          'system_en.title as title_en',
          'system_fr.title as title_fr',
          'publication_en.system_id as published_en_system_id',
          'publication_fr.system_id as published_fr_system_id',
        ])
        .orderBy('systems.editorial_position')
        .orderBy('systems.created_at')
        .orderBy('systems.id')
        .execute(),
      appDb
        .selectFrom('work_with_us_systems')
        .select(['system_id', 'position'])
        .where('page_id', '=', page.id)
        .orderBy('position')
        .execute(),
      listWorkWithUsProofReferences(appDb, 'en'),
      listWorkWithUsProofReferences(appDb, 'fr'),
    ]);

  return {
    email: session.user.email,
    pageId: page.id,
    localizations,
    publications,
    systems: systemRows.map((system) => ({
      id: system.id,
      lifecycle: system.lifecycle,
      titleEn: system.title_en,
      titleFr: system.title_fr,
      publishedEn: system.published_en_system_id !== null,
      publishedFr: system.published_fr_system_id !== null,
    })),
    selectedSystems: selectedSystemRows.map((selection) => ({
      systemId: selection.system_id,
      position: selection.position,
    })),
    systemReferences: {
      en: englishSystemReferences,
      fr: frenchSystemReferences,
    },
  };
}

export async function action({ request }: Route.ActionArgs) {
  const session = await requireAdminSession(request);
  const form = await request.formData();
  const intent = field(form, '_intent');
  const page = await ensureWorkWithUsPage();

  if (intent === 'add-work-with-us-system') {
    const systemId = requiredSystemId(form);
    const system = await appDb
      .selectFrom('systems')
      .select(['id', 'lifecycle'])
      .where('id', '=', systemId)
      .executeTakeFirst();

    if (system === undefined || system.lifecycle !== 'active') {
      return {
        scope: 'systems' as const,
        ok: false,
        message: 'Only active Systems can be selected.',
      };
    }

    const selected = await appDb
      .selectFrom('work_with_us_systems')
      .select(['system_id', 'position'])
      .where('page_id', '=', page.id)
      .orderBy('position')
      .execute();

    if (selected.some((selection) => selection.system_id === systemId)) {
      return {
        scope: 'systems' as const,
        ok: true,
        message: 'System is already selected.',
      };
    }

    if (selected.length >= 4) {
      return {
        scope: 'systems' as const,
        ok: false,
        message: 'Work with us can display at most four Systems.',
      };
    }

    const usedPositions = new Set(selected.map(({ position }) => position));
    const position = [0, 1, 2, 3].find(
      (candidate) => !usedPositions.has(candidate),
    );

    if (position === undefined) {
      return {
        scope: 'systems' as const,
        ok: false,
        message: 'No Work with us System position is available.',
      };
    }

    await appDb.transaction().execute(async (transaction) => {
      await transaction
        .insertInto('work_with_us_systems')
        .values({
          page_id: page.id,
          system_id: systemId,
          position,
        })
        .execute();

      await writeAdminAuditEvent(transaction, {
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'work_with_us.system_selected',
        entityType: 'work_with_us',
        entityId: page.id,
        systemId,
        metadata: { position },
      });
    });

    return {
      scope: 'systems' as const,
      ok: true,
      message: 'System added to Work with us.',
    };
  }

  if (intent === 'remove-work-with-us-system') {
    const systemId = requiredSystemId(form);
    const selected = await appDb
      .selectFrom('work_with_us_systems')
      .select(['system_id', 'position'])
      .where('page_id', '=', page.id)
      .orderBy('position')
      .execute();

    if (!selected.some((selection) => selection.system_id === systemId)) {
      return {
        scope: 'systems' as const,
        ok: false,
        message: 'System is not selected.',
      };
    }

    await appDb.transaction().execute(async (transaction) => {
      await transaction
        .deleteFrom('work_with_us_systems')
        .where('page_id', '=', page.id)
        .where('system_id', '=', systemId)
        .execute();

      const remaining = await transaction
        .selectFrom('work_with_us_systems')
        .select(['system_id', 'position'])
        .where('page_id', '=', page.id)
        .orderBy('position')
        .execute();

      for (const [index, selection] of remaining.entries()) {
        if (selection.position === index) continue;

        await transaction
          .updateTable('work_with_us_systems')
          .set({ position: index })
          .where('page_id', '=', page.id)
          .where('system_id', '=', selection.system_id)
          .execute();
      }

      await writeAdminAuditEvent(transaction, {
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'work_with_us.system_removed',
        entityType: 'work_with_us',
        entityId: page.id,
        systemId,
        metadata: {},
      });
    });

    return {
      scope: 'systems' as const,
      ok: true,
      message: 'System removed from Work with us.',
    };
  }

  if (intent === 'move-work-with-us-system') {
    const systemId = requiredSystemId(form);
    const direction = field(form, 'direction');

    if (direction !== 'up' && direction !== 'down') {
      return {
        scope: 'systems' as const,
        ok: false,
        message: 'Invalid System move direction.',
      };
    }

    const selected = await appDb
      .selectFrom('work_with_us_systems')
      .select(['system_id', 'position'])
      .where('page_id', '=', page.id)
      .orderBy('position')
      .execute();
    const currentIndex = selected.findIndex(
      (selection) => selection.system_id === systemId,
    );

    if (currentIndex === -1) {
      return {
        scope: 'systems' as const,
        ok: false,
        message: 'System is not selected.',
      };
    }

    const targetIndex =
      direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const current = selected[currentIndex];
    const target = selected[targetIndex];

    if (current === undefined || target === undefined) {
      return {
        scope: 'systems' as const,
        ok: true,
        message: 'System is already at that boundary.',
      };
    }

    await appDb.transaction().execute(async (transaction) => {
      await transaction
        .deleteFrom('work_with_us_systems')
        .where('page_id', '=', page.id)
        .where('system_id', 'in', [current.system_id, target.system_id])
        .execute();

      await transaction
        .insertInto('work_with_us_systems')
        .values([
          {
            page_id: page.id,
            system_id: current.system_id,
            position: target.position,
          },
          {
            page_id: page.id,
            system_id: target.system_id,
            position: current.position,
          },
        ])
        .execute();

      await writeAdminAuditEvent(transaction, {
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'work_with_us.system_order_changed',
        entityType: 'work_with_us',
        entityId: page.id,
        systemId,
        metadata: {
          direction,
          previousPosition: current.position,
          position: target.position,
        },
      });
    });

    return {
      scope: 'systems' as const,
      ok: true,
      message: 'Work with us System order updated.',
    };
  }

  const command = parseWorkWithUsAdminCommand(intent);

  if (command === null) {
    return {
      scope: 'content' as const,
      ok: false,
      message: 'Unsupported Work with us operation.',
    };
  }

  const { locale, operation } = command;
  const content = workWithUsContentFromForm(form);
  const publicCopy = JSON.stringify(content);

  if (/\bcssov\b/i.test(publicCopy)) {
    return {
      scope: 'content' as const,
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
        publicSnapshotPreserved: operation === 'save',
        structureOwnedByCode: true,
        directPublish: operation === 'publish',
      },
    });
  });

  if (operation === 'save') {
    return {
      scope: 'content' as const,
      ok: true,
      message: `${locale.toUpperCase()} Work with us draft saved.`,
    };
  }

  try {
    await publishWorkWithUsLocalization(appDb, page.id, locale);
  } catch (error) {
    return {
      scope: 'content' as const,
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
    scope: 'content' as const,
    ok: true,
    message: `${locale.toUpperCase()} Work with us content published.`,
  };
}

export default function AdminWorkWithUs() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [searchParams] = useSearchParams();
  const locale = searchParams.get('locale') === 'fr' ? 'fr' : 'en';

  return (
    <main className="aks-admin-work-with-us-page">
      <header className="aks-admin-work-with-us-header">
        <Container width="wide">
          <div className="aks-admin-work-with-us-header-inner">
            <BrandSignature
              aria-label="AkikSystems home"
              className="aks-admin-work-with-us-brand"
              href="/en"
              size="sm"
            />
            <nav
              aria-label="Administration breadcrumb"
              className="aks-admin-work-with-us-breadcrumb"
            >
              <Link href="/admin">Administration</Link>
              <span aria-hidden="true">/</span>
              <span>Work with us</span>
            </nav>
            <Text className="aks-admin-work-with-us-operator" size="sm">
              {data.email}
            </Text>
          </div>
        </Container>
      </header>

      <WorkWithUsAdminSection
        actionData={actionData?.scope === 'content' ? actionData : null}
        locale={locale}
        localizations={data.localizations}
        publications={data.publications}
        systemReferences={data.systemReferences[locale]}
      />

      <Container className="aks-admin-work-with-us-management" width="wide">
        <WorkWithUsSystemsSection
          actionData={actionData?.scope === 'systems' ? actionData : null}
          selectedSystems={data.selectedSystems}
          systems={data.systems}
        />
      </Container>

      <footer className="aks-admin-work-with-us-footer">
        <Container width="wide">
          <div className="aks-admin-work-with-us-footer-inner">
            <span>© {new Date().getUTCFullYear()} AkikSystems</span>
            <span>Private system · Inline editorial access</span>
          </div>
        </Container>
      </footer>
    </main>
  );
}
