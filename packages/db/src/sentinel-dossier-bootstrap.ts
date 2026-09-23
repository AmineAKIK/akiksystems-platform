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

const localizedContent = {
  en: {
    slug: englishSlug,
    title: 'Sentinel — DWWM Project Dossier',
    summary:
      'First-class learning evidence connecting the DWWM training to Sentinel through problem framing, architecture, implementation, security, testing, deployment, and documented limits.',
    body: `## Context
Sentinel began as a personal initiative after direct observation of industrial production work. The underlying problem was not only visible machine stoppage: declared skips and tolerated defects could remain less visible while still affecting coordination, follow-up, and collective understanding. The project therefore treats visibility and traceability as product-design problems rather than individual-behaviour problems.

The dossier frames three operational roles — operator, maintenance, and responsible — plus system administration. Each role contributes a different part of the operational truth, so the product is designed around shared evidence and explicit responsibility.

## Objectives
- Make incident reporting structured by production context without adding unnecessary friction.
- Keep a shared view of incidents from opening through prioritisation, handling, justified waiting, and closure.
- Attribute meaningful actions and preserve an inspectable history.
- Support analytical reading of recurrences, delays, and areas of loss.
- Keep direct machine control, automated diagnosis, predictive analysis, and ERP/MES/GMAO integration outside the MVP until their reliability can be demonstrated.

## Architecture
Sentinel is a full-stack application with a React 18, TypeScript, and Vite frontend; a Node.js, Express, and TypeScript backend; and PostgreSQL 15 for relational persistence. Docker Compose describes the application topology, with a reverse-proxy boundary for public deployment.

The backend uses parameterised SQL and versioned migrations. Authentication relies on signed JWT sessions in HTTP-only cookies, and the browser communicates with the application through JSON APIs.

## Design choices
- Human observation remains the first sensor of the MVP instead of fragile machine-interface capture.
- Parameterised SQL is used directly rather than hiding data access behind an ORM.
- Zod schemas define and validate application inputs.
- Native fetch is sufficient for the frontend HTTP boundary; no extra client layer is introduced without a demonstrated need.
- CSS design tokens and a documented UX doctrine keep the interface calm, legible, and consistent across roles.
- Server-side permissions remain authoritative; frontend visibility only mirrors those rules.

## Security
The dossier documents HTTP-only session cookies, bcrypt password hashing, server-side role checks, parameterised SQL, Zod validation, login rate limiting, and production security headers. Production configuration is also validated at startup so known weak defaults and invalid origins can be rejected before serving traffic.

Security claims stay bounded to implemented controls. Historical events and account deletion, for example, are described with their real retention and traceability constraints rather than as absolute erasure guarantees.

## Tests
The quality strategy combines Jest unit tests, PostgreSQL integration tests, Vitest and Testing Library for frontend behaviour, and Playwright for browser-level journeys. CI separates quality, PostgreSQL integration, critical browser journeys, production-container contracts, and operational recovery checks.

The dossier deliberately avoids freezing test totals in prose. A repository script derives dossier facts from green reports and fails when a value cannot be established, keeping evidence tied to the examined commit.

## Difficulties
Three documented engineering difficulties are representative. First, follow and unfollow mutations contained a real transaction-consistency window and were aligned with the existing SELECT ... FOR UPDATE pattern. Second, the History screen mixed an incident dossier with a transversal event journal; separating those questions reduced structural duplication. Third, service return patterns had drifted, so read functions were normalised around typed business results together with their tests.

These difficulties are presented as changes in engineering understanding, not as a polished narrative that hides the intermediate constraints.

## Results
The implemented result is an inspectable full-stack Sentinel system with role-specific workflows, incident reporting and handling, structured history, audit events, a public demonstration, and a reproducible examination candidate.

A representative incident journey is create → take ownership → set pending with a reason → resume → close, with server-side permission checks and an event trail across the transitions. These are software and workflow results; the dossier does not claim measured industrial impact that has not been observed in real deployment.

## Limits
- Sentinel does not control machines and does not automate machine telemetry in the MVP.
- Automated diagnosis, predictive analysis, and enterprise-tool integrations remain future work.
- Historical audit data does not currently have an automatic retention deadline; the operating organisation must define one.
- The dossier source still contains explicit completion markers for personal and examination-specific material.
- This Web presentation does not claim that the final submitted PDF is already attached; source publication remains a separate step.

## Evidence
The repository documents an immutable examination baseline at release v1.0.0-rc.9, commit ed26a25e3c005cabb0da30a4553dfbbee03afe81. That baseline separates the examined candidate from later documentation and portability improvements on the main branch.

- The DWWM Training provides the learning context.
- The Sentinel System provides the inspectable software evidence.
- Repository documentation and generated facts support the technical narrative.
- The original dossier PDF remains a distinct source artifact and is not fabricated by this Web presentation.`,
  },
  fr: {
    slug: frenchSlug,
    title: 'Sentinel — dossier de projet DWWM',
    summary:
      'Preuve d’apprentissage de premier rang reliant la formation DWWM à Sentinel à travers le cadrage du besoin, l’architecture, l’implémentation, la sécurité, les tests, le déploiement et les limites documentées.',
    body: `## Contexte
Sentinel est né comme initiative personnelle après une observation directe du travail en production industrielle. Le problème ne concernait pas seulement les arrêts machine visibles : des skips déclarés ou des défauts tolérés pouvaient rester moins visibles tout en affectant la coordination, le suivi et la compréhension collective. Le projet traite donc la visibilité et la traçabilité comme des problèmes de conception d’outil plutôt que comme des problèmes de comportement individuel.

Le dossier distingue trois rôles opérationnels — opérateur, maintenance et responsable — auxquels s’ajoute l’administration système. Chaque rôle apporte une partie différente de la vérité opérationnelle ; le produit est donc conçu autour de preuves partagées et de responsabilités explicites.

## Objectifs
- Structurer le signalement d’un incident dans son contexte de production sans ajouter de friction inutile.
- Maintenir une vue partagée des incidents de l’ouverture jusqu’à la priorisation, la prise en charge, l’attente justifiée et la clôture.
- Attribuer les actions significatives et conserver un historique inspectable.
- Permettre une lecture analytique des récurrences, délais et zones de perte.
- Laisser hors du MVP le pilotage direct des machines, le diagnostic automatisé, l’analyse prédictive et les intégrations ERP/MES/GMAO tant que leur fiabilité n’est pas démontrée.

## Architecture
Sentinel est une application full-stack avec un frontend React 18, TypeScript et Vite, un backend Node.js, Express et TypeScript, et PostgreSQL 15 pour la persistance relationnelle. Docker Compose décrit la topologie applicative avec une frontière de reverse proxy pour le déploiement public.

Le backend utilise du SQL paramétré et des migrations versionnées. L’authentification repose sur des sessions JWT signées dans des cookies HTTP-only, et le navigateur communique avec l’application via des API JSON.

## Choix de conception
- L’observation humaine reste le premier capteur du MVP plutôt qu’une captation fragile des interfaces machine.
- Le SQL paramétré est utilisé directement plutôt que masqué derrière un ORM.
- Les schémas Zod définissent et valident les entrées applicatives.
- Le fetch natif suffit pour la frontière HTTP frontend ; aucune couche cliente supplémentaire n’est ajoutée sans besoin démontré.
- Les tokens CSS et une doctrine UX documentée maintiennent une interface calme, lisible et cohérente entre les rôles.
- Les permissions serveur restent la source d’autorité ; l’affichage frontend ne fait que refléter ces règles.

## Sécurité
Le dossier documente les cookies de session HTTP-only, le hachage bcrypt des mots de passe, les contrôles de rôle côté serveur, le SQL paramétré, la validation Zod, le rate limiting du login et les en-têtes de sécurité en production. La configuration de production est également validée au démarrage afin de refuser les valeurs faibles connues et les origines invalides avant de servir du trafic.

Les affirmations de sécurité restent bornées aux contrôles réellement implémentés. Les événements historiques et la suppression d’un compte, par exemple, sont décrits avec leurs contraintes réelles de conservation et de traçabilité plutôt qu’avec une promesse d’effacement absolu.

## Tests
La stratégie qualité combine des tests unitaires Jest, des tests d’intégration PostgreSQL, Vitest et Testing Library pour les comportements frontend, puis Playwright pour les parcours navigateur. La CI sépare la qualité, l’intégration PostgreSQL, les parcours critiques, les contrats des conteneurs de production et les exercices de restauration opérationnelle.

Le dossier évite volontairement de figer des totaux de tests dans le texte. Un script du dépôt dérive les faits du dossier à partir de rapports verts et échoue lorsqu’une valeur ne peut pas être établie, ce qui rattache la preuve au commit examiné.

## Difficultés
Trois difficultés d’ingénierie documentées sont représentatives. Premièrement, les mutations de suivi et d’arrêt de suivi comportaient une fenêtre réelle de cohérence transactionnelle et ont été alignées sur le pattern SELECT ... FOR UPDATE déjà utilisé. Deuxièmement, l’écran Historique mélangeait le dossier d’un incident et un journal transverse d’événements ; séparer ces deux questions a réduit la duplication structurelle. Troisièmement, les contrats de retour des services avaient dérivé et les fonctions de lecture ont été normalisées autour de résultats métier typés avec leurs tests.

Ces difficultés sont présentées comme des évolutions de compréhension technique, sans effacer les contraintes intermédiaires derrière un récit artificiellement lisse.

## Résultats
Le résultat implémenté est un système Sentinel full-stack inspectable avec des workflows dépendant des rôles, le signalement et le traitement des incidents, un historique structuré, des événements d’audit, une démonstration publique et un candidat d’examen reproductible.

Un parcours représentatif est créer → prendre en charge → mettre en attente avec motif → reprendre → clôturer, avec contrôles de permission côté serveur et trace événementielle à chaque transition. Il s’agit de résultats logiciels et de workflow ; le dossier ne revendique pas un impact industriel chiffré qui n’aurait pas été observé en déploiement réel.

## Limites
- Sentinel ne pilote pas les machines et n’automatise pas la télémétrie machine dans le MVP.
- Le diagnostic automatisé, l’analyse prédictive et les intégrations aux outils d’entreprise restent des évolutions futures.
- Les historiques d’audit ne disposent pas actuellement d’un délai automatique de conservation ; l’organisation exploitante doit en définir un.
- La source du dossier contient encore des marqueurs explicites de finalisation pour des éléments personnels et propres à l’examen.
- Cette présentation Web ne prétend pas que le PDF final remis est déjà joint ; la publication de la source reste une étape distincte.

## Preuves
Le dépôt documente une baseline d’examen immuable à la release v1.0.0-rc.9, commit ed26a25e3c005cabb0da30a4553dfbbee03afe81. Cette baseline sépare le candidat examiné des améliorations documentaires et de portabilité ultérieures de la branche main.

- La formation DWWM fournit le contexte d’apprentissage.
- Le System Sentinel fournit la preuve logicielle inspectable.
- La documentation du dépôt et les faits générés soutiennent le récit technique.
- Le PDF original du dossier reste un artefact source distinct et n’est pas fabriqué par cette présentation Web.`,
  },
} as const;

export async function bootstrapSentinelDossier(
  db: Kysely<Database>,
): Promise<BootstrapSentinelDossierResult> {
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

  const existing = await db
    .selectFrom('learning_artifact_localizations')
    .innerJoin(
      'learning_artifacts',
      'learning_artifacts.id',
      'learning_artifact_localizations.learning_artifact_id',
    )
    .select('learning_artifacts.id')
    .where('learning_artifact_localizations.locale', '=', 'en')
    .where('learning_artifact_localizations.slug', '=', englishSlug)
    .executeTakeFirst();

  const learningArtifactId = existing?.id ?? randomUUID();
  const created = existing === undefined;

  await db.transaction().execute(async (transaction) => {
    if (created) {
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
    } else {
      await transaction
        .updateTable('learning_artifacts')
        .set({
          training_id: training.training_id,
          system_id: sentinel.system_id,
          updated_at: new Date(),
        })
        .where('id', '=', learningArtifactId)
        .execute();
    }

    await transaction
      .insertInto('learning_artifact_localizations')
      .values([
        {
          learning_artifact_id: learningArtifactId,
          locale: 'en',
          ...localizedContent.en,
          editorial_state: 'draft',
          published_at: null,
        },
        {
          learning_artifact_id: learningArtifactId,
          locale: 'fr',
          ...localizedContent.fr,
          editorial_state: 'draft',
          published_at: null,
        },
      ])
      .onConflict((conflict) =>
        conflict
          .columns(['learning_artifact_id', 'locale'])
          .doUpdateSet((eb) => ({
            slug: eb.ref('excluded.slug'),
            title: eb.ref('excluded.title'),
            summary: eb.ref('excluded.summary'),
            body: eb.ref('excluded.body'),
            editorial_state: 'draft',
            published_at: null,
            updated_at: new Date(),
          })),
      )
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
    created,
    learningArtifactId,
    trainingId: training.training_id,
    systemId: sentinel.system_id,
  };
}
