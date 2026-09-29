import { describe, expect, it } from 'vitest';

import { systemsPageContent } from './content';

/** Every string of a content tree, links and ids aside. */
function strings(value: unknown, key = ''): string[] {
  if (typeof value === 'string')
    return ['href', 'id', 'status', 'kind'].includes(key) ? [] : [value];
  if (Array.isArray(value)) return value.flatMap((item) => strings(item));
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([name, item]) => strings(item, name));
  }
  return [];
}

describe('Systems content', () => {
  it('keeps the English page free of French', () => {
    const french =
      /[àâçéèêëîïôœùûü]|\b(le|la|les|des|du|une|et|pour|avec|sans|dans|sur|qui|nous|notre|nos)\b/i;
    const offenders = strings(systemsPageContent.en).filter((text) => french.test(text));
    expect(offenders).toEqual([]);
  });

  it('writes English with American spelling', () => {
    const british =
      /\b(capitalis|organis|optimis|realis|analys|prioritis|behaviour|colour|centre|favour)\w*/i;
    const offenders = strings(systemsPageContent.en).filter((text) => british.test(text));
    expect(offenders).toEqual([]);
  });

  it('keeps the French and English pages in step', () => {
    const { en, fr } = systemsPageContent;
    expect(en.stations.map((station) => station.id)).toEqual(
      fr.stations.map((station) => station.id),
    );
    expect(en.stations.map((station) => station.href)).toEqual(
      fr.stations.map((station) => station.href),
    );
    expect(en.rail.map((step) => step.index)).toEqual(fr.rail.map((step) => step.index));
    expect(en.workbench.tools).toHaveLength(fr.workbench.tools.length);
    expect(en.sentinel.actions.map((action) => action.kind)).toEqual(
      fr.sentinel.actions.map((action) => action.kind),
    );
  });

  it('speaks in the first person singular', () => {
    expect(
      strings(systemsPageContent.fr).filter((text) => /\b(nous|notre|nos)\b/i.test(text)),
    ).toEqual([]);
    expect(strings(systemsPageContent.en).filter((text) => /\b(we|our|us)\b/i.test(text))).toEqual(
      [],
    );
  });
});
