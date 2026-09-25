import assert from 'node:assert/strict';

import {
  bootstrapWorkWithUsCapabilities,
  commercialPageHero,
  commercialPageLegacyCompatibility,
  getPublishedCommercialPage,
  workWithUsCapabilitiesSeed,
  workWithUsOpenSituationsSeed,
} from '../index.js';
import { createDatabase } from '../database.js';
import { databaseUrlFromEnv } from './env.js';

const db = createDatabase(databaseUrlFromEnv());

try {
  const first = await bootstrapWorkWithUsCapabilities(db);
  const second = await bootstrapWorkWithUsCapabilities(db);

  assert.equal(second.pageId, first.pageId);

  for (const locale of ['en', 'fr'] as const) {
    const published = await getPublishedCommercialPage(db, locale);
    const capabilities = workWithUsCapabilitiesSeed[locale];
    const situations = workWithUsOpenSituationsSeed[locale];

    assert.ok(published);
    assert.equal(commercialPageHero(published).title, situations.title);
    assert.equal(commercialPageHero(published).introduction, situations.introduction);
    assert.equal(commercialPageLegacyCompatibility(published).situationsTitle, situations.situationsTitle);
    assert.equal(commercialPageLegacyCompatibility(published).situationsBody, situations.situationsBody);
    assert.equal(commercialPageLegacyCompatibility(published).capabilitiesTitle, capabilities.capabilitiesTitle);
    assert.equal(commercialPageLegacyCompatibility(published).capabilitiesBody, capabilities.capabilitiesBody);
    assert.equal(commercialPageLegacyCompatibility(published).inquiryTitle, null);
    assert.equal(commercialPageLegacyCompatibility(published).inquiryBody, null);
    assert.equal(commercialPageLegacyCompatibility(published).privacyNote, null);
  }

  const english = workWithUsCapabilitiesSeed.en.capabilitiesBody;
  const french = workWithUsCapabilitiesSeed.fr.capabilitiesBody;

  assert.match(english, /bounded software system/i);
  assert.match(english, /architecture and interfaces/i);
  assert.match(english, /web applications, internal tools, and data-backed workflows/i);
  assert.match(english, /connect existing systems and automate repetitive work/i);
  assert.match(english, /tests, documentation, observability, and clear limits/i);
  assert.match(english, /combined according to the situation/i);

  assert.match(french, /système logiciel délimité/i);
  assert.match(french, /architecture et les interfaces/i);
  assert.match(french, /applications web, des outils internes et des flux appuyés sur les données/i);
  assert.match(french, /relier des systèmes existants et automatiser des tâches répétitives/i);
  assert.match(french, /tests, de la documentation, de l’observabilité et des limites claires/i);
  assert.match(french, /se combinent selon la situation/i);

  for (const copy of [english, french]) {
    assert.doesNotMatch(
      copy,
      /choose a service|select a service|service catalogue|fixed offer|price list|budget|deadline|project type|choisir une prestation|catalogue de services|offre figée|grille tarifaire|budget|délai|type de projet/i,
    );
  }

  process.stdout.write(
    'AKS-124 qualification passed: EN/FR Work with us capabilities are concrete, combinable, non-catalogue, and leave later L7 inquiry/privacy sections untouched.\n',
  );
} finally {
  await db.destroy();
}
