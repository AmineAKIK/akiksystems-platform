import assert from 'node:assert/strict';

import {
  bootstrapWorkWithUsCollaboration,
  getPublishedCommercialPage,
  workWithUsCapabilitiesSeed,
  workWithUsCollaborationSeed,
  workWithUsOpenSituationsSeed,
} from '../index.js';
import { createDatabase } from '../database.js';
import { databaseUrlFromEnv } from './env.js';

const db = createDatabase(databaseUrlFromEnv());

try {
  const first = await bootstrapWorkWithUsCollaboration(db);
  const second = await bootstrapWorkWithUsCollaboration(db);

  assert.equal(second.pageId, first.pageId);

  for (const locale of ['en', 'fr'] as const) {
    const published = await getPublishedCommercialPage(db, locale);
    const collaboration = workWithUsCollaborationSeed[locale];
    const capabilities = workWithUsCapabilitiesSeed[locale];
    const situations = workWithUsOpenSituationsSeed[locale];

    assert.ok(published);
    assert.equal(published.title, situations.title);
    assert.equal(published.introduction, situations.introduction);
    assert.equal(published.situationsTitle, situations.situationsTitle);
    assert.equal(published.situationsBody, situations.situationsBody);
    assert.equal(published.capabilitiesTitle, capabilities.capabilitiesTitle);
    assert.equal(published.capabilitiesBody, capabilities.capabilitiesBody);
    assert.equal(
      published.collaborationTitle,
      collaboration.collaborationTitle,
    );
    assert.equal(
      published.collaborationBody,
      collaboration.collaborationBody,
    );
    assert.equal(published.inquiryTitle, null);
    assert.equal(published.inquiryBody, null);
    assert.equal(published.privacyNote, null);
  }

  const english = workWithUsCollaborationSeed.en.collaborationBody;
  const french = workWithUsCollaborationSeed.fr.collaborationBody;

  assert.match(english, /focused on understanding the situation/i);
  assert.match(english, /do not need a finished brief or a predefined solution/i);
  assert.match(english, /after that first human exchange/i);
  assert.match(english, /frame the work, its boundaries, responsibilities, and evidence together/i);

  assert.match(french, /centré sur la compréhension de la situation/i);
  assert.match(french, /pas besoin d’un cahier des charges finalisé ni d’une solution prédéfinie/i);
  assert.match(french, /après ce premier échange humain/i);
  assert.match(french, /cadrer ensemble le travail, ses limites, les responsabilités et les preuves attendues/i);

  for (const copy of [english, french]) {
    assert.doesNotMatch(copy, /\bcssov\b/i);
    assert.doesNotMatch(
      copy,
      /questionnaire|budget|deadline|project type|service category|qualification form|questionnaire|budget|délai|type de projet|catégorie de service|formulaire de qualification/i,
    );
  }

  process.stdout.write(
    'AKS-125 qualification passed: EN/FR collaboration copy puts understanding before framing, keeps the first exchange human and lightweight, names no internal methodology, and leaves inquiry/privacy to later L7 tickets.\n',
  );
} finally {
  await db.destroy();
}
