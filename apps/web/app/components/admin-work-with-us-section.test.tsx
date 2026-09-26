import type { PublicSystemReference } from '@akiksystems/db';
import { renderToStaticMarkup } from 'react-dom/server';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';

import { WorkWithUsAdminSection } from './admin-work-with-us-section';

function renderEditor(
  props: React.ComponentProps<typeof WorkWithUsAdminSection>,
): string {
  const router = createMemoryRouter(
    [
      {
        path: '/admin/work-with-us',
        element: <WorkWithUsAdminSection {...props} />,
      },
    ],
    { initialEntries: ['/admin/work-with-us?locale=en'] },
  );

  return renderToStaticMarkup(<RouterProvider router={router} />);
}

describe('WorkWithUsAdminSection', () => {
  it('edits the public Work with us composition in place', () => {
    const reference: PublicSystemReference = {
      id: '00000000-0000-4000-8000-000000000001',
      locale: 'en',
      slug: 'example',
      href: '/en/systems/example',
      title: 'Example System',
      summary: 'A published System reference.',
      proofTransparency: {
        role: 'Reference System',
        maturity: 'Published',
        demoNature: 'Static',
        dataNature: 'Representative',
        limits: 'Qualification fixture.',
      },
    };

    const html = renderEditor({
      actionData: null,
      locale: 'en',
      localizations: [
        {
          locale: 'en',
          editorial_state: 'draft',
          content: {
            hero: {
              eyebrow: 'Collaboration',
              title: 'Work with AkikSystems',
              introduction: 'Build with clarity.',
            },
          },
        },
      ],
      publications: [{ locale: 'en' }],
      systemReferences: [reference],
    });

    expect(html).toContain('class="aks-work-with-us aks-admin-work-with-us-canvas"');
    expect(html).toContain('class="aks-work-with-us-hero');
    expect(html).toContain('class="aks-work-with-us-contact');
    expect(html).toContain('class="aks-work-with-us-systems');
    expect(html).toContain('textarea');
    expect(html).toContain('name="heroTitle"');
    expect(html).toContain('name="contactSubmitLabel"');
    expect(html).toContain('Example System');
    expect(html).toContain('Save EN draft');
    expect(html).toContain('Publish EN');
  });
});
