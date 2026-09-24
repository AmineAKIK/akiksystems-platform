import assert from 'node:assert/strict';

import {
  bootstrapWorkWithUsOpenSituations,
  getPublishedCommercialPage,
  workWithUsOpenSituationsSeed,
} from '../index.js';
import { createDatabase } from '../database.js';
import { databaseUrlFromEnv } from './env.js';

const db = createDatabase(databaseUrlFromEnv());

try {
  const first = await bootstrapWorkWithUsOpenSituations(db);
  const second = await bootstrapWorkWithUsOpenSituations(db);

  assert.equal(second.pageId, first.pageId);
  assert.equal(second.createdPage, false);

  for (const locale of ['en', 'fr'] as const) {
    const published = await getPublishedCommercialPage(db, locale);
    const seed = workWithUsOpenSituationsSeed[locale];

    assert.ok(published);
    assert.equal(published.title, seed.title);
    assert.equal(published.introduction, seed.introduction);
    assert.equal(published.situationsTitle, seed.situationsTitle);
    assert.equal(published.situationsBody, seed.situationsBody);
    assert.equal(published.inquiryTitle, null);
    assert.equal(published.inquiryBody, null);
    assert.equal(published.privacyNote, null);
  }

  const english = workWithUsOpenSituationsSeed.en;
  const french = workWithUsOpenSituationsSeed.fr;

  assert.match(english.introduction, /organization or for yourself/i);
  assert.match(english.situationsBody, /own words/i);
  assert.match(english.situationsBody, /framing comes later, with a human/i);
  assert.match(french.introduction, /organisation ou à titre personnel/i);
  assert.match(french.situationsBody, /avec vos mots/i);
  assert.match(french.situationsBody, /cadrage vient ensuite, avec une personne/i);

  for (const copy of [
    english.introduction,
    english.situationsBody,
    french.introduction,
    french.situationsBody,
  ]) {
    assert.doesNotMatch(
      copy,
      /choose a service|select a service|service category|package|budget|deadline|questionnaire|choisir une offre|choisir une prestation|catégorie de service|budget|délai|questionnaire/i,
    );
  }

  process.stdout.write(
    'AKS-123 qualification passed: EN/FR Work with us open-situations copy welcomes organizations and individuals, keeps free expression explicit, avoids service-category framing, and leaves inquiry/privacy to later L7 tickets.\n',
  );
} finally {
  await db.destroy();
}
