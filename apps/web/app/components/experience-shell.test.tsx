import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { ExperienceShell } from './experience-shell';

describe('ExperienceShell', () => {
  it('renders public identity, navigation, context, locale and outlet on a deep System link', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/en/systems/sentinel']}>
        <ExperienceShell
          alternateHref="/fr/systems/sentinelle"
          currentTitle="Sentinel"
          locale="en"
          pathname="/en/systems/sentinel"
        >
          <main>
            <h1>Sentinel</h1>
          </main>
        </ExperienceShell>
      </MemoryRouter>,
    );

    expect(html).toContain('class="aks-skip-link" href="#experience-outlet"');
    expect(html).toContain('class="aks-experience-shell aks-section-separator-after"');
    expect(html).toContain('class="aks-experience-footer aks-section-separator-before"');
    expect(html).toContain('class="aks-brand-signature"');
    expect(html).toContain('class="aks-brand-mark"');
    expect(html).toContain('href="/brand/AKSYS.svg#eagle"');
    expect(html).toContain('class="aks-brand-wordmark">AkikSystems</span>');
    expect(html).toContain('aria-label="Primary navigation"');
    expect(html).toContain('href="/en" data-discover="true">Home</a>');
    expect(html).toContain('href="/en/profile" data-discover="true">Profile</a>');
    expect(html).toContain('href="/en/systems" data-discover="true">Systems</a>');
    // Destinations in preparation stay out of the navigation.
    expect(html).not.toContain('href="/en/writings"');
    expect(html).not.toContain('href="/en/learning"');
    expect(html).not.toContain('href="/en/work-with-us"');
    expect(html).toContain('class="aks-experience-mobile-menu"');
    expect(html).toContain('class="aks-experience-mobile-menu-trigger"');
    expect(html).toContain('class="aks-experience-mobile-nav"');
    expect(html).toContain(
      'aria-current="page" class="aks-link" href="/en/systems" data-discover="true">Systems</a>',
    );
    expect(html).not.toContain('class="aks-experience-context');
    expect(html).toContain(
      'aria-label="English active. View in French." class="aks-home-language aks-experience-language" hrefLang="fr" href="/fr/systems/sentinelle"',
    );
    expect(html).toContain('class="aks-home-language-current" lang="en">EN</span>');
    // Fixed order whatever the active language: FR first, then EN.
    expect(html).toMatch(/lang="fr">FR<\/span>.*lang="en">EN<\/span>/);
    expect(html).toContain('class="aks-home-language-target" lang="fr">FR</span>');
    expect(html).toContain('class="aks-experience-outlet" id="experience-outlet" tabindex="-1"');
    expect(html).toContain('<main><h1>Sentinel</h1></main>');
  });

  it('keeps global navigation available in compact reading mode', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/en/writings/long-form']}>
        <ExperienceShell
          currentTitle="Long form"
          locale="en"
          mode="reading"
          pathname="/en/writings/long-form"
        >
          <main>
            <h1>Long form</h1>
          </main>
        </ExperienceShell>
      </MemoryRouter>,
    );

    expect(html).toContain('data-destination="writings" data-mode="reading"');
    expect(html).toContain('aria-label="Primary navigation"');
    expect(html).toContain('href="/en/profile" data-discover="true">Profile</a>');
    expect(html).toContain('class="aks-experience-mobile-menu"');
  });

  it('derives the equivalent localized first-level destination when no override is supplied', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/en/profile']}>
        <ExperienceShell locale="en" pathname="/en/profile">
          <main>
            <h1>Profile</h1>
          </main>
        </ExperienceShell>
      </MemoryRouter>,
    );

    expect(html).toContain('hrefLang="fr" href="/fr/profil"');
  });

  it('renders an explicit non-link state when a deep translation is unavailable', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/en/systems/sentinel']}>
        <ExperienceShell
          alternateHref={null}
          currentTitle="Sentinel"
          locale="en"
          pathname="/en/systems/sentinel"
        >
          <main>
            <h1>Sentinel</h1>
          </main>
        </ExperienceShell>
      </MemoryRouter>,
    );

    expect(html).toContain(
      '<span aria-disabled="true" class="aks-language-unavailable">French unavailable</span>',
    );
    expect(html).not.toContain('hrefLang="fr" lang="fr" href="/fr"');
  });

  it('marks the current top-level destination and localizes the shell in French', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/fr']}>
        <ExperienceShell locale="fr" pathname="/fr">
          <main>
            <h1>Accueil</h1>
          </main>
        </ExperienceShell>
      </MemoryRouter>,
    );

    expect(html).toContain('aria-label="Navigation principale"');
    expect(html).toContain('href="/fr/profil" data-discover="true">Profil</a>');
    expect(html).not.toContain('class="aks-experience-context');
    expect(html).toContain('aria-current="page" class="aks-link"');
    expect(html).toContain(
      'aria-label="Français actif. Afficher en anglais." class="aks-home-language aks-experience-language" hrefLang="en" href="/en"',
    );
  });

  it('gives standalone pages the regular shell, named by their own title', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/fr/mentions-legales']}>
        <ExperienceShell
          currentTitle="Mentions légales"
          locale="fr"
          pathname="/fr/mentions-legales"
        >
          <main>
            <h1>Mentions légales</h1>
          </main>
        </ExperienceShell>
      </MemoryRouter>,
    );

    expect(html).toContain('data-destination="page"');
    expect(html).not.toContain('data-home="true"');
    expect(html).not.toContain('aria-current="page" class="aks-link"');
  });
});
