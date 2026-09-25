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
        <main><h1>Sentinel</h1></main>
      </ExperienceShell>
      </MemoryRouter>,
    );

    expect(html).toContain('class="aks-skip-link" href="#experience-outlet"');
    expect(html).toContain('class="aks-brand-signature"');
    expect(html).toContain('class="aks-brand-mark"');
    expect(html).toContain('src="/brand/AKSYS.svg"');
    expect(html).toContain('class="aks-brand-wordmark">AkikSystems</span>');
    expect(html).toContain('aria-label="Primary navigation"');
    expect(html).toContain('href="/en" data-discover="true">Home</a>');
    expect(html).toContain('href="/en/profile" data-discover="true">Profile</a>');
    expect(html).toContain('href="/en/systems" data-discover="true">Systems</a>');
    expect(html).toContain('href="/en/writings" data-discover="true">Writings</a>');
    expect(html).toContain('href="/en/learning" data-discover="true">Learning</a>');
    expect(html).toContain('href="/en/work-with-us" data-discover="true">Work with us</a>');
    expect(html).toContain('class="aks-experience-mobile-menu"');
    expect(html).toContain('class="aks-experience-mobile-menu-trigger"');
    expect(html).toContain('class="aks-experience-mobile-nav"');
    expect(html).toContain('aria-current="page" class="aks-link" href="/en/systems" data-discover="true">Systems</a>');
    expect(html).toContain('aria-label="Current context"');
    expect(html).toContain('class="aks-experience-context-list"');
    expect(html).toContain('href="/en/systems" data-discover="true">Systems</a>');
    expect(html).toContain('aria-hidden="true" class="aks-experience-context-separator">/</li>');
    expect(html).toContain('<span aria-current="page">Sentinel</span>');
    expect(html).toContain(
      'hrefLang="fr" lang="fr" href="/fr/systems/sentinelle" data-discover="true">Français</a>',
    );
    expect(html).toContain(
      'class="aks-experience-outlet" id="experience-outlet" tabindex="-1"',
    );
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
          <main><h1>Long form</h1></main>
        </ExperienceShell>
      </MemoryRouter>,
    );

    expect(html).toContain('data-destination="writings" data-mode="reading"');
    expect(html).toContain('aria-label="Primary navigation"');
    expect(html).toContain('href="/en/writings" data-discover="true">Writings</a>');
    expect(html).toContain('class="aks-experience-mobile-menu"');
  });

  it('derives the equivalent localized first-level destination when no override is supplied', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/en/profile']}>
        <ExperienceShell locale="en" pathname="/en/profile">
          <main><h1>Profile</h1></main>
        </ExperienceShell>
      </MemoryRouter>,
    );

    expect(html).toContain(
      'hrefLang="fr" lang="fr" href="/fr/profil" data-discover="true">Français</a>',
    );
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
          <main><h1>Sentinel</h1></main>
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
      <MemoryRouter initialEntries={['/fr/about']}>
        <ExperienceShell locale="fr" pathname="/fr/about">
          <main><h1>À propos</h1></main>
        </ExperienceShell>
      </MemoryRouter>,
    );

    expect(html).toContain('aria-label="Navigation principale"');
    expect(html).toContain('href="/fr/profil" data-discover="true">Profil</a>');
    expect(html).toContain('aria-label="Contexte actuel"');
    expect(html).toContain('<span aria-current="page">Accueil</span>');
    expect(html).toContain('hrefLang="en" lang="en" href="/en" data-discover="true">English</a>');
  });
});
