import { randomUUID } from 'node:crypto';

import type { Kysely } from 'kysely';

import { publishLearningArtifactLocalization } from './learning-artifact-publication.js';
import type { Database } from './schema.js';

export interface BootstrapSentinelDossierResult {
  created: boolean;
  learningArtifactId: string;
  trainingId: string;
  systemId: string;
}

const englishSlug = 'sentinel-dwwm-project-dossier';
const frenchSlug = 'dossier-projet-dwwm-sentinel';

export async function bootstrapSentinelDossier(
  db: Kysely<Database>,
): Promise<BootstrapSentinelDossierResult> {
  const existing = await db
    .selectFrom('learning_artifact_localizations')
    .innerJoin(
      'learning_artifacts',
      'learning_artifacts.id',
      'learning_artifact_localizations.learning_artifact_id',
    )
    .select([
      'learning_artifacts.id',
      'learning_artifacts.training_id',
      'learning_artifacts.system_id',
    ])
    .where('learning_artifact_localizations.locale', '=', 'en')
    .where('learning_artifact_localizations.slug', '=', englishSlug)
    .executeTakeFirst();

  if (existing !== undefined) {
    if (existing.system_id === null) {
      throw new Error(
        'Existing Sentinel dossier LearningArtifact is missing its Sentinel System relation.',
      );
    }

    return {
      created: false,
      learningArtifactId: existing.id,
      trainingId: existing.training_id,
      systemId: existing.system_id,
    };
  }

  const training = await db
    .selectFrom('training_publications')
    .select('training_id')
    .where('locale', '=', 'en')
    .where('slug', '=', 'full-stack-web-mobile-developer')
    .executeTakeFirst();

  if (training === undefined) {
    throw new Error(
      'The published DWWM Training must exist before provisioning the Sentinel dossier.',
    );
  }

  const frenchTraining = await db
    .selectFrom('training_publications')
    .select('training_id')
    .where('training_id', '=', training.training_id)
    .where('locale', '=', 'fr')
    .executeTakeFirst();

  if (frenchTraining === undefined) {
    throw new Error(
      'The DWWM Training must be published in French before provisioning the bilingual Sentinel dossier.',
    );
  }

  const sentinel = await db
    .selectFrom('system_publications')
    .select('system_id')
    .where('locale', '=', 'en')
    .where('slug', '=', 'sentinel')
    .executeTakeFirst();

  if (sentinel === undefined) {
    throw new Error(
      'The published Sentinel System must exist before provisioning the Sentinel dossier.',
    );
  }

  const frenchSentinel = await db
    .selectFrom('system_publications')
    .select('system_id')
    .where('system_id', '=', sentinel.system_id)
    .where('locale', '=', 'fr')
    .executeTakeFirst();

  if (frenchSentinel === undefined) {
    throw new Error(
      'Sentinel must be published in French before provisioning the bilingual Sentinel dossier.',
    );
  }

  const learningArtifactId = randomUUID();

  await db.transaction().execute(async (transaction) => {
    const maxPosition = await transaction
      .selectFrom('learning_artifacts')
      .select(({ fn }) =>
        fn.max<number>('editorial_position').as('max_position'),
      )
      .executeTakeFirst();

    await transaction
      .insertInto('learning_artifacts')
      .values({
        id: learningArtifactId,
        training_id: training.training_id,
        system_id: sentinel.system_id,
        source_asset_id: null,
        editorial_position: (maxPosition?.max_position ?? -1) + 1,
      })
      .execute();

    await transaction
      .insertInto('learning_artifact_localizations')
      .values([
        {
          learning_artifact_id: learningArtifactId,
          locale: 'en',
          slug: englishSlug,
          title: 'Sentinel — DWWM Project Dossier',
          summary:
            'First-class learning evidence connecting the DWWM training to Sentinel through problem framing, architecture, implementation, security, testing, deployment, and documented limits.',
          body:
            'The Sentinel project dossier documents how a field observation became a full-stack system for industrial incident visibility, traceability, and human decision support. It connects the DWWM learning context to an inspectable System without treating the Training itself as evidence.\n\nIts documented scope covers DWWM competency mapping, the original need and MVP boundaries, React/TypeScript/Vite interface work, Node.js/Express/TypeScript backend design, PostgreSQL data work, authentication and security controls, GDPR considerations, test strategy, deployment, and a technical retrospective.\n\nThe examination baseline documented by the Sentinel repository is the immutable release v1.0.0-rc.9 at commit ed26a25e3c005cabb0da30a4553dfbbee03afe81. The dossier source still contains explicit completion markers for personal and examination-specific sections, so this LearningArtifact does not claim that the final submitted PDF is already attached or that every examination section is finalized.',
          editorial_state: 'draft',
          published_at: null,
        },
        {
          learning_artifact_id: learningArtifactId,
          locale: 'fr',
          slug: frenchSlug,
          title: 'Sentinel — dossier de projet DWWM',
          summary:
            'Preuve d’apprentissage de premier rang reliant la formation DWWM à Sentinel à travers le cadrage du besoin, l’architecture, l’implémentation, la sécurité, les tests, le déploiement et les limites documentées.',
          body:
            'Le dossier de projet Sentinel documente la transformation d’une observation de terrain en système full-stack dédié à la visibilité des incidents industriels, à leur traçabilité et à l’aide à la décision humaine. Il relie le contexte de formation DWWM à un System inspectable sans confondre la formation elle-même avec une preuve.\n\nLe périmètre documenté couvre la correspondance avec les compétences DWWM, le besoin initial et les limites du MVP, les interfaces React/TypeScript/Vite, la conception backend Node.js/Express/TypeScript, le travail de données PostgreSQL, l’authentification et la sécurité, les considérations RGPD, la stratégie de tests, le déploiement et un retour technique sur le projet.\n\nLa base d’examen documentée par le dépôt Sentinel est la release immuable v1.0.0-rc.9 au commit ed26a25e3c005cabb0da30a4553dfbbee03afe81. La source du dossier contient encore des marqueurs explicites de finalisation pour des sections personnelles et propres à l’examen ; ce LearningArtifact ne prétend donc ni que le PDF final remis est déjà joint, ni que toutes les sections d’examen sont finalisées.',
          editorial_state: 'draft',
          published_at: null,
        },
      ])
      .execute();
  });

  await publishLearningArtifactLocalization(db, {
    learningArtifactId,
    locale: 'en',
  });
  await publishLearningArtifactLocalization(db, {
    learningArtifactId,
    locale: 'fr',
  });

  return {
    created: true,
    learningArtifactId,
    trainingId: training.training_id,
    systemId: sentinel.system_id,
  };
}
