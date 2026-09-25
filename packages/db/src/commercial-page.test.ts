import { describe, expect, it } from 'vitest';

import {
  commercialPageHero,
  commercialPageLegacyCompatibility,
  parseCommercialPagePublicationSnapshot,
  patchCommercialPageLegacyCompatibility,
} from './commercial-page.js';

const legacy = {
  situationsTitle: 'Situation',
  situationsBody: 'Situation body',
  capabilitiesTitle: 'Capabilities',
  capabilitiesBody: 'Capabilities body',
  collaborationTitle: 'Collaboration',
  collaborationBody: 'Collaboration body',
  inquiryTitle: 'Contact',
  inquiryBody: 'Contact body',
  privacyNote: 'Privacy',
};

function v2Fixture() {
  return {
    version: 2,
    pageId: 'page-1',
    locale: 'fr',
    hero: {
      eyebrow: 'Travailler ensemble',
      title: 'Donner forme à des projets complexes.',
      introduction: 'Introduction',
    },
    approach: {
      eyebrow: 'Comment nous travaillons',
      title: 'Du contexte à des solutions durables.',
      introduction: null,
      steps: [
        { key: 'understand', title: 'Comprendre', body: 'Contexte' },
        { key: 'structure', title: 'Structurer', body: 'Options' },
        { key: 'build', title: 'Construire', body: 'Solutions' },
      ],
    },
    contact: {
      eyebrow: 'Échangeons',
      title: 'À vous.',
      introduction: null,
      nameLabel: 'Nom',
      emailLabel: 'Email',
      organizationLabel: 'Organisation',
      messageLabel: 'Message',
      messagePlaceholder: 'Votre message…',
      listenLabel: 'Écouter mon message',
      submitLabel: 'Envoyer',
      successMessage: 'Message reçu.',
      privacyNote: 'Confidentialité',
    },
    about: {
      eyebrow: 'À propos',
      title: 'Qui je suis.',
      body: 'Présentation',
      profileLinkLabel: 'Voir le profil',
    },
    systems: {
      eyebrow: 'Systèmes',
      title: 'Quelques systèmes.',
      introduction: null,
      allSystemsLinkLabel: 'Voir tous les systèmes',
    },
    legacy,
  };
}

describe('Work with us publication snapshots', () => {
  it('keeps version 1 snapshots readable during the rollout', () => {
    const parsed = parseCommercialPagePublicationSnapshot({
      version: 1,
      pageId: 'page-1',
      locale: 'en',
      title: 'Work with us',
      introduction: 'Existing published introduction',
      ...legacy,
    });

    expect(parsed?.version).toBe(1);
    expect(parsed && commercialPageHero(parsed)).toEqual({
      title: 'Work with us',
      introduction: 'Existing published introduction',
    });
    expect(parsed && commercialPageLegacyCompatibility(parsed)).toEqual(legacy);
  });

  it('parses the fixed semantic version 2 contract', () => {
    const parsed = parseCommercialPagePublicationSnapshot(v2Fixture());

    expect(parsed?.version).toBe(2);
    if (parsed?.version !== 2) throw new Error('Expected v2 snapshot');
    expect(parsed.approach.steps.map(({ key }) => key)).toEqual([
      'understand',
      'structure',
      'build',
    ]);
    expect(commercialPageLegacyCompatibility(parsed)).toEqual(legacy);
  });

  it('rejects a v2 snapshot whose structural approach order is changed', () => {
    const fixture = v2Fixture();
    fixture.approach.steps = [
      { key: 'structure', title: null, body: null },
      { key: 'understand', title: null, body: null },
      { key: 'build', title: null, body: null },
    ];

    expect(parseCommercialPagePublicationSnapshot(fixture)).toBeNull();
  });

  it('patches only the legacy compatibility projection of v2', () => {
    const parsed = parseCommercialPagePublicationSnapshot(v2Fixture());
    if (parsed === null) throw new Error('Expected parsed snapshot');

    const patched = patchCommercialPageLegacyCompatibility(parsed, {
      situationsTitle: 'Updated',
    });

    expect(patched.version).toBe(2);
    expect(commercialPageLegacyCompatibility(patched).situationsTitle).toBe(
      'Updated',
    );
    if (patched.version === 2) {
      expect(patched.approach.steps[0].title).toBe('Comprendre');
    }
  });
});
