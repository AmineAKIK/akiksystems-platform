import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import protocapEnglish from './protocap-map.en';
import sentinelEnglish from './sentinel-map.en';

const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');

// The strings a map writes: its own script, plus the modules it delegates to.
const sources = {
  sentinel: ['./sentinel-map.js', './sentinel-presentation.js'],
  protocap: ['./protocap-map.js'],
} as const;

describe.each([
  ['sentinel', sentinelEnglish],
  ['protocap', protocapEnglish],
] as const)('%s map translation', (name, dictionary) => {
  const source = sources[name]
    .map((path) => read(path))
    .join('\n')
    .replace(/\\(['"])/g, '$1');

  it('only translates strings the map still writes', () => {
    const orphans = Object.keys(dictionary).filter((french) => !source.includes(french));
    expect(orphans).toEqual([]);
  });

  it('never leaves an empty translation', () => {
    expect(Object.entries(dictionary).filter(([, english]) => english.trim() === '')).toEqual([]);
  });

  it('keeps its text at 10 SVG units or more', () => {
    // The phone layout is drawn on a fixed 360-unit canvas: its link captions and sub-labels sit in
    // lanes between nodes that cannot take more (checked by hand against the translated strings).
    const lanes = ['.compact .t-edge', '.compact .t-sub'];
    const rules = [...read(`../styles/${name}-map.css`).matchAll(/([^{}]+)\{([^{}]*)\}/g)];
    const small = rules.flatMap(([, selector, body]) => {
      const size = /font-size: ([\d.]+)px/.exec(body ?? '');
      const rule = (selector ?? '').trim();
      return size && Number(size[1]) < 10 && !lanes.some((lane) => rule.endsWith(lane))
        ? [`${rule} ${size[1]}px`]
        : [];
    });
    expect(small).toEqual([]);
    const floor = rules.flatMap(([, selector, body]) => {
      const size = /font-size: ([\d.]+)px/.exec(body ?? '');
      return size && Number(size[1]) < 9 ? [(selector ?? '').trim()] : [];
    });
    expect(floor).toEqual([]);
  });
});
