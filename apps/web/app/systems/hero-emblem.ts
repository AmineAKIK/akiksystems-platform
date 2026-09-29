import emblemSource from '../../public/brand/AKSYS.svg?raw';

export interface EmblemPart {
  id: string;
  d: string;
}

/** Path data of each emblem group, read at build time from the vector master. */
export const emblemParts: readonly EmblemPart[] = Array.from(
  emblemSource.matchAll(/<g id="([^"]+)"><path d="([^"]+)"/g),
  (match) => ({ id: match[1] ?? '', d: match[2] ?? '' }),
);
