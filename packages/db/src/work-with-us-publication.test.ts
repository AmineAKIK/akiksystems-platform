import { describe, expect, it } from 'vitest';

import { parseWorkWithUsPublicationSnapshot } from './work-with-us-publication.js';

function snapshotFixture() {
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
  };
}

describe('Work with us publication snapshot', () => {
  it('parses the v2 contract', () => {
    const parsed = parseWorkWithUsPublicationSnapshot(snapshotFixture());

    expect(parsed?.version).toBe(2);
    expect(parsed?.hero.title).toBe('Donner forme à des projets complexes.');
    expect(parsed?.approach.steps.map(({ key }) => key)).toEqual([
      'understand',
      'structure',
      'build',
    ]);
  });

  it('rejects the retired v1 contract', () => {
    expect(
      parseWorkWithUsPublicationSnapshot({
        version: 1,
        pageId: 'page-1',
        locale: 'fr',
        title: 'Ancien titre',
        introduction: 'Ancienne introduction',
      }),
    ).toBeNull();
  });

  it('normalizes approach steps to the code-owned order', () => {
    const fixture = snapshotFixture();
    fixture.approach.steps = [
      { key: 'build', title: 'Construire', body: 'Solutions' },
      { key: 'understand', title: 'Comprendre', body: 'Contexte' },
      { key: 'structure', title: 'Structurer', body: 'Options' },
    ];

    const parsed = parseWorkWithUsPublicationSnapshot(fixture);

    expect(parsed?.approach.steps.map(({ key }) => key)).toEqual([
      'understand',
      'structure',
      'build',
    ]);
  });

  it('contains no legacy compatibility payload', () => {
    const parsed = parseWorkWithUsPublicationSnapshot(snapshotFixture());

    expect(parsed).not.toBeNull();
    expect(parsed).not.toHaveProperty('legacy');
  });
});
