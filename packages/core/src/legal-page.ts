export const legalPageKeys = ['privacy', 'legal', 'cookies'] as const;

export type LegalPageKey = (typeof legalPageKeys)[number];

export function isLegalPageKey(value: string): value is LegalPageKey {
  return legalPageKeys.includes(value as LegalPageKey);
}
