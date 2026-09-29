import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import protocapEnglish from './protocap-map.en';
import sentinelEnglish from './sentinel-map.en';

const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');

describe.each([
  ['sentinel', sentinelEnglish],
  ['protocap', protocapEnglish],
] as const)('%s map translation', (name, dictionary) => {
  const source = read(`./${name}-map.js`).replace(/\\(['"])/g, '$1');

  it('only translates strings the map still writes', () => {
    const orphans = Object.keys(dictionary).filter((french) => !source.includes(french));
    expect(orphans).toEqual([]);
  });

  it('never leaves an empty translation', () => {
    expect(Object.entries(dictionary).filter(([, english]) => english.trim() === '')).toEqual([]);
  });

  it('keeps its text at 9 SVG units or more', () => {
    const sizes = [...read(`../styles/${name}-map.css`).matchAll(/font-size: ([\d.]+)px/g)].map(
      (match) => Number(match[1]),
    );
    expect(sizes.filter((size) => size < 9)).toEqual([]);
  });
});
