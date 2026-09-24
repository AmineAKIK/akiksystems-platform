export const writingSearchQueryMaxLength = 160;

export function normalizeWritingSearchQuery(value: string | null): string {
  if (value === null) return '';

  return value
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, writingSearchQueryMaxLength)
    .trim();
}
