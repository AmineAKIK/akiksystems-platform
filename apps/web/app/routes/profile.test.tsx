import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { profilePageContent } from '../profile/content';
import { ProfilePage } from '../profile/profile-page';
import { profileMeta } from '../profile/profile-route';

function render(locale: 'en' | 'fr') {
  return renderToStaticMarkup(
    <MemoryRouter>
      <ProfilePage locale={locale} content={profilePageContent[locale]} />
    </MemoryRouter>,
  );
}

describe('ProfilePage code-only contract', () => {
  it.each(['fr', 'en'] as const)('renders every %s section from local content', (locale) => {
    const html = render(locale);
    const content = profilePageContent[locale];

    for (const section of [
      'identity',
      'stack',
      'perspectives',
      'principles',
      'scale',
      'capabilities',
      'emblem',
      'cta',
    ]) {
      expect(html).toContain(`data-profile-section="${section}"`);
    }

    for (const row of content.stack.rows) {
      expect(html).toContain(`>${row.name}</span>`);
    }

    for (const phase of content.capabilities.phases) {
      expect(html).toContain(`>${phase.name}</span>`);
    }

    expect(html).toContain('href="/brand/AKSYS.svg#eagle"');
    expect(html).toContain(`href="${content.cta.action.href}"`);
  });

  it('never emits inline style attributes, which the production CSP blocks', () => {
    expect(render('fr')).not.toContain('style=');
    expect(render('en')).not.toContain('style=');
  });

  it('exposes one selected tab per tablist and the first stack proof', () => {
    const html = render('fr');

    expect(html.match(/role="tablist"/g)).toHaveLength(3);
    expect(html.match(/aria-selected="true"/g)).toHaveLength(3);
    expect(html.match(/aria-expanded="true"/g)).toHaveLength(1);
    expect(html).toContain('href="/fr/systems#sentinel"');
  });

  it('does not ship a placeholder phone link', () => {
    expect(render('fr')).not.toContain('tel:');
  });
});

describe('Profile meta contract', () => {
  it.each([
    ['en', 'https://akiksystems.com/en/profile', 'https://akiksystems.fr/fr/profil'],
    ['fr', 'https://akiksystems.fr/fr/profil', 'https://akiksystems.com/en/profile'],
  ] as const)('emits localized canonical metadata for %s', (locale, canonical, alternate) => {
    expect(profileMeta(locale)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tagName: 'link', rel: 'canonical', href: canonical }),
        expect.objectContaining({ tagName: 'link', rel: 'alternate', href: alternate }),
        expect.objectContaining({
          'script:ld+json': expect.objectContaining({ '@type': 'ProfilePage' }),
        }),
      ]),
    );
  });
});
