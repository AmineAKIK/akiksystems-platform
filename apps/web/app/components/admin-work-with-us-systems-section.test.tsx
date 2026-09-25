import { renderToStaticMarkup } from 'react-dom/server';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';

import { WorkWithUsSystemsSection } from './admin-work-with-us-systems-section';

function renderSection(
  props: React.ComponentProps<typeof WorkWithUsSystemsSection>,
): string {
  const router = createMemoryRouter(
    [
      {
        path: '/admin/work-with-us',
        element: <WorkWithUsSystemsSection {...props} />,
      },
    ],
    { initialEntries: ['/admin/work-with-us'] },
  );

  return renderToStaticMarkup(<RouterProvider router={router} />);
}

describe('WorkWithUsSystemsSection', () => {
  it('warns when a selected System is unavailable in one public locale', () => {
    const html = renderSection({
      actionData: null,
      selectedSystems: [
        {
          systemId: '00000000-0000-4000-8000-000000000001',
          position: 0,
        },
      ],
      systems: [
        {
          id: '00000000-0000-4000-8000-000000000001',
          lifecycle: 'active',
          titleEn: 'Selected System',
          titleFr: 'Système sélectionné',
          publishedEn: true,
          publishedFr: false,
        },
      ],
    });

    expect(html).toContain('Selected System');
    expect(html).toContain('EN published');
    expect(html).toContain('FR not published');
    expect(html).toContain(
      'Not published in FR — hidden from /fr/travailler-ensemble.',
    );
  });

  it('stops offering additions once four Systems are selected', () => {
    const systems = Array.from({ length: 5 }, (_, index) => ({
      id: `00000000-0000-4000-8000-00000000000${index + 1}`,
      lifecycle: 'active',
      titleEn: `System ${index + 1}`,
      titleFr: null,
      publishedEn: true,
      publishedFr: true,
    }));
    const selectedSystems = systems.slice(0, 4).map((system, position) => ({
      systemId: system.id,
      position,
    }));

    const html = renderSection({
      actionData: null,
      selectedSystems,
      systems,
    });

    expect(html).toContain('Maximum reached: four Systems.');
    expect(html).toContain('select disabled=""');
    expect(html).toContain('button');
    expect(html).toContain('disabled=""');
  });
});
