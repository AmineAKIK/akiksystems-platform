import type {
  PublishedWorkWithUsPage,
  PublicSystemReference,
} from '@akiksystems/db';
import { renderToStaticMarkup } from 'react-dom/server';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';

import { WorkWithUsView } from './work-with-us-view';

function content(locale: 'en' | 'fr' = 'en'): PublishedWorkWithUsPage {
  return {
    version: 2,
    pageId: '00000000-0000-4000-8000-000000000127',
    locale,
    hero: {
      eyebrow: locale === 'fr' ? 'Travailler ensemble' : 'Work together',
      title:
        locale === 'fr'
          ? 'Donner forme à des projets complexes.'
          : 'Give shape to complex projects.',
      introduction:
        locale === 'fr'
          ? 'Une entrée courte vers AkikSystems.'
          : 'A concise entry into AkikSystems.',
    },
    approach: {
      eyebrow: locale === 'fr' ? 'Comment nous travaillons' : 'How we work',
      title:
        locale === 'fr'
          ? 'Du contexte à des solutions durables.'
          : 'From context to durable solutions.',
      introduction:
        locale === 'fr'
          ? 'Une progression lisible sans catalogue de services.'
          : 'A legible progression without a service catalogue.',
      steps: [
        {
          key: 'understand',
          title: locale === 'fr' ? 'Comprendre' : 'Understand',
          body: locale === 'fr' ? 'Les besoins réels.' : 'The real needs.',
        },
        {
          key: 'structure',
          title: locale === 'fr' ? 'Structurer' : 'Structure',
          body:
            locale === 'fr'
              ? 'Les options pertinentes.'
              : 'The relevant options.',
        },
        {
          key: 'build',
          title: locale === 'fr' ? 'Construire' : 'Build',
          body:
            locale === 'fr'
              ? 'Des solutions durables.'
              : 'Durable solutions.',
        },
      ],
    },
    contact: {
      eyebrow: locale === 'fr' ? 'Échangeons' : 'Start a conversation',
      title: locale === 'fr' ? 'À vous.' : 'Your turn.',
      introduction:
        locale === 'fr'
          ? 'Cet espace est libre.'
          : 'This space is intentionally open.',
      nameLabel: locale === 'fr' ? 'Nom' : 'Name',
      emailLabel: 'Email',
      organizationLabel:
        locale === 'fr' ? 'Organisation (optionnel)' : 'Organization (optional)',
      messageLabel: locale === 'fr' ? 'Message' : 'Message',
      messagePlaceholder:
        locale === 'fr' ? 'Votre message…' : 'Your message…',
      listenLabel:
        locale === 'fr' ? 'Écouter mon message' : 'Listen to my message',
      submitLabel: locale === 'fr' ? 'Envoyer' : 'Send',
      successMessage:
        locale === 'fr' ? 'Message reçu.' : 'Message received.',
      privacyNote:
        locale === 'fr'
          ? 'Les données de contact restent limitées à cet échange.'
          : 'Contact data remains limited to this exchange.',
    },
    about: {
      eyebrow: locale === 'fr' ? 'À propos' : 'About',
      title: locale === 'fr' ? 'Qui je suis.' : 'Who I am.',
      body:
        locale === 'fr'
          ? 'AkikSystems est fondé et dirigé par moi.'
          : 'AkikSystems is founded and led by me.',
      profileLinkLabel:
        locale === 'fr' ? 'Voir le profil' : 'View profile',
    },
    systems: {
      eyebrow: locale === 'fr' ? 'Systèmes sélectionnés' : 'Selected Systems',
      title: locale === 'fr' ? 'Quelques systèmes.' : 'A few Systems.',
      introduction: null,
      allSystemsLinkLabel:
        locale === 'fr' ? 'Voir tous les systèmes' : 'View all Systems',
    },
  };
}

function reference(
  id: string,
  slug: string,
  title: string,
  locale: 'en' | 'fr' = 'en',
): PublicSystemReference {
  return {
    id,
    locale,
    slug,
    title,
    summary: `${title} summary`,
    href: `/${locale}/systems/${slug}`,
    proofTransparency: {
      role: 'Software system',
      maturity: 'Inspectable implementation',
      demoNature: 'No separate demo',
      dataNature: 'Evidence data',
      limits: 'Explicit limits.',
    },
  };
}

function renderRoutedView(
  props: React.ComponentProps<typeof WorkWithUsView>,
): string {
  const router = createMemoryRouter(
    [
      {
        path: '/en/work-with-us',
        element: <WorkWithUsView {...props} />,
      },
    ],
    { initialEntries: ['/en/work-with-us'] },
  );

  return renderToStaticMarkup(<RouterProvider router={router} />);
}

describe('WorkWithUsView', () => {
  it('renders the validated section hierarchy and visual approach sequence', () => {
    const html = renderToStaticMarkup(
      <WorkWithUsView
        content={content()}
        locale="en"
        systemReferences={[
          reference('system-a', 'alpha', 'Alpha'),
          reference('system-b', 'beta', 'Beta'),
        ]}
      />,
    );

    const hero = html.indexOf('aks-work-with-us-hero');
    const approach = html.indexOf('aks-work-with-us-approach');
    const contact = html.indexOf('aks-work-with-us-contact');
    const about = html.indexOf('aks-work-with-us-about');
    const systems = html.indexOf('aks-work-with-us-systems');

    expect(hero).toBeGreaterThanOrEqual(0);
    expect(approach).toBeGreaterThan(hero);
    expect(contact).toBeGreaterThan(approach);
    expect(about).toBeGreaterThan(contact);
    expect(systems).toBeGreaterThan(about);

    expect(html).toContain('data-approach-step="understand"');
    expect(html).toContain('data-approach-step="structure"');
    expect(html).toContain('data-approach-step="build"');
    expect(html).not.toContain('Du contexte');
    expect(html).toContain('From context to durable solutions.');
    expect(html).not.toContain('aks-admin-card');
  });

  it('keeps canonical navigation and selected System order without proof-card density', () => {
    const html = renderToStaticMarkup(
      <WorkWithUsView
        content={content('fr')}
        locale="fr"
        systemReferences={[
          reference('system-b', 'beta', 'Beta', 'fr'),
          reference('system-a', 'alpha', 'Alpha', 'fr'),
        ]}
      />,
    );

    expect(html).toContain('href="/fr/profil"');
    expect(html).toContain('href="/fr/systems"');
    expect(html).toContain('href="/fr/systems/beta"');
    expect(html).toContain('href="/fr/systems/alpha"');
    expect(html.indexOf('Beta')).toBeLessThan(html.indexOf('Alpha'));
    expect(html).not.toContain('aks-system-reference-meta');
  });

  it('renders the inquiry form only with a real server submission token', () => {
    const withoutBoundary = renderToStaticMarkup(
      <WorkWithUsView content={content()} locale="en" />,
    );
    expect(withoutBoundary).not.toContain('<form');

    const html = renderRoutedView({
      content: content(),
      locale: 'en',
      submissionToken: '00000000-0000-4000-8000-000000000042',
    });

    expect(html).toContain('Your turn.');
    expect(html).toContain('<form');
    expect(html).toContain('name="_intent"');
    expect(html).toContain('value="submit-work-with-us-inquiry"');
    expect(html).toContain('name="submissionToken"');
    expect(html).toContain('name="name"');
    expect(html).toContain('name="email"');
    expect(html).toContain('name="organization"');
    expect(html).toContain('name="message"');
    expect(html).toContain('id="work-with-us-message"');
    expect(html).toContain('maxLength="5000"');
    expect(html).toContain('Send');
    expect(html).not.toContain('Listen to my message');
  });

  it('associates server validation errors with the fields and preserves values', () => {
    const html = renderRoutedView({
      content: content(),
      inquiryActionData: {
        ok: false,
        kind: 'invalid',
        message: 'Please review the highlighted fields.',
        values: {
          name: 'Ada',
          email: 'invalid',
          organization: 'Analytical Systems',
          message: 'A concrete request.',
        },
        errors: {
          email: 'Enter a valid email address.',
        },
        submissionToken: '00000000-0000-4000-8000-000000000042',
      },
      locale: 'en',
      submissionToken: '00000000-0000-4000-8000-000000000099',
    });

    expect(html).toContain('role="alert"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby="work-with-us-email-error"');
    expect(html).toContain('value="invalid"');
    expect(html).toContain('value="Analytical Systems"');
    expect(html).toContain('A concrete request.');
    expect(html).toContain(
      'value="00000000-0000-4000-8000-000000000042"',
    );
  });

  it('keeps a useful localized hero when no Work with us snapshot is published', () => {
    const html = renderToStaticMarkup(
      <WorkWithUsView content={null} locale="fr" />,
    );

    expect(html).toContain('Travailler ensemble');
    expect(html).toContain(
      'Façons de collaborer avec AkikSystems sur des produits, systèmes et travaux techniques.',
    );
    expect(html).not.toContain('aks-work-with-us-approach');
  });
});
