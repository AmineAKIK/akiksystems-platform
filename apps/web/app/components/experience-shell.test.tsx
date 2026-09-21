import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ExperienceShell } from './experience-shell';

describe('ExperienceShell', () => {
  it('renders public identity, navigation, context, locale and outlet on a deep System link', () => {
    const html = renderToStaticMarkup(
      <ExperienceShell
        alternateHref="/fr/systems/sentinelle"
        currentTitle="Sentinel"
        locale="en"
        pathname="/en/systems/sentinel"
      >
        <main><h1>Sentinel</h1></main>
      </ExperienceShell>,
    );

    expect(html).toContain('class="aks-skip-link" href="#experience-outlet"');
    expect(html).toContain('class="aks-brand-signature"');
    expect(html).toContain('class="aks-brand-mark"');
    expect(html).toContain('class="aks-brand-wordmark">AkikSystems</span>');
    expect(html).toContain('aria-label="Primary navigation"');
    expect(html).toContain('href="/en">Home</a>');
    expect(html).toContain('href="/en/profile">Profile</a>');
    expect(html).toContain('href="/en/systems">Systems</a>');
    expect(html).toContain('href="/en/writings">Writings</a>');
    expect(html).toContain('href="/en/learning">Learning</a>');
    expect(html).toContain('href="/en/work-with-us">Work with us</a>');
    expect(html).toContain('class="aks-experience-mobile-menu"');
    expect(html).toContain('class="aks-experience-mobile-menu-trigger"');
    expect(html).toContain('class="aks-experience-mobile-nav"');
    expect(html).toContain('aria-current="page" href="/en/systems">Systems</a>');
    expect(html).toContain('aria-label="Current context"');
    expect(html).toContain('>Systems · Sentinel</p>');
    expect(html).toContain(
      'href="/fr/systems/sentinelle" hrefLang="fr" lang="fr">Français</a>',
    );
    expect(html).toContain(
      'class="aks-experience-outlet" id="experience-outlet" tabindex="-1"',
    );
    expect(html).toContain('<main><h1>Sentinel</h1></main>');
  });

  it('marks the current top-level destination and localizes the shell in French', () => {
    const html = renderToStaticMarkup(
      <ExperienceShell locale="fr" pathname="/fr/about">
        <main><h1>À propos</h1></main>
      </ExperienceShell>,
    );

    expect(html).toContain('aria-label="Navigation principale"');
    expect(html).toContain('href="/fr/profil">Profil</a>');
    expect(html).toContain('aria-label="Contexte actuel"');
    expect(html).toContain('>Accueil</p>');
    expect(html).toContain('href="/en" hrefLang="en" lang="en">English</a>');
  });
});
