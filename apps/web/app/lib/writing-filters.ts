import type { WritingKind } from '@akiksystems/core';
import type { PublishedWritingListItem } from '@akiksystems/db';

const filterWritingKinds = ['note', 'article', 'essay'] as const satisfies readonly WritingKind[];

export const writingFilterVolumeThreshold = 6;

export interface WritingFilterOption {
  value: string;
  label: string;
  count: number;
}

export interface WritingFilterSelection {
  kind: WritingKind | null;
  category: string | null;
  tag: string | null;
}

export interface WritingFilterModel {
  enabled: boolean;
  threshold: number;
  totalCount: number;
  resultCount: number;
  selection: WritingFilterSelection;
  kinds: WritingFilterOption[];
  categories: WritingFilterOption[];
  tags: WritingFilterOption[];
}

export interface ResolvedWritingFilters {
  writings: PublishedWritingListItem[];
  model: WritingFilterModel;
}

function optionMap(
  writings: PublishedWritingListItem[],
  values: (writing: PublishedWritingListItem) => Array<{
    value: string;
    label: string;
  }>,
): WritingFilterOption[] {
  const options = new Map<string, WritingFilterOption>();

  for (const writing of writings) {
    const seen = new Set<string>();
    for (const item of values(writing)) {
      if (seen.has(item.value)) continue;
      seen.add(item.value);

      const existing = options.get(item.value);
      if (existing === undefined) {
        options.set(item.value, { ...item, count: 1 });
      } else {
        existing.count += 1;
      }
    }
  }

  return [...options.values()].sort(
    (left, right) =>
      left.label.localeCompare(right.label) ||
      left.value.localeCompare(right.value),
  );
}

function selectedValue(
  params: URLSearchParams,
  name: string,
  options: WritingFilterOption[],
): string | null {
  const value = params.get(name);
  return value !== null && options.some((option) => option.value === value)
    ? value
    : null;
}

export function resolveWritingFilters(
  writings: PublishedWritingListItem[],
  params: URLSearchParams,
): ResolvedWritingFilters {
  const kindCounts = new Map<WritingKind, number>();
  for (const writing of writings) {
    kindCounts.set(writing.kind, (kindCounts.get(writing.kind) ?? 0) + 1);
  }

  const kinds = filterWritingKinds.flatMap((kind) => {
    const count = kindCounts.get(kind) ?? 0;
    return count === 0
      ? []
      : [
          {
            value: kind,
            label:
              kind === 'note'
                ? 'Note'
                : kind === 'article'
                  ? 'Article'
                  : 'Essay',
            count,
          },
        ];
  });

  const categories = optionMap(writings, (writing) =>
    writing.categories.map((category) => ({
      value: category.slug,
      label: category.name,
    })),
  );
  const tags = optionMap(writings, (writing) =>
    writing.tags.map((tag) => ({
      value: tag.slug,
      label: tag.name,
    })),
  );

  const hasUsefulCategory = categories.some(
    (option) => option.count < writings.length,
  );
  const hasUsefulTag = tags.some((option) => option.count < writings.length);
  const hasUsefulDimension =
    kinds.length >= 2 || hasUsefulCategory || hasUsefulTag;
  const enabled =
    writings.length >= writingFilterVolumeThreshold && hasUsefulDimension;

  if (!enabled) {
    return {
      writings,
      model: {
        enabled: false,
        threshold: writingFilterVolumeThreshold,
        totalCount: writings.length,
        resultCount: writings.length,
        selection: { kind: null, category: null, tag: null },
        kinds,
        categories,
        tags,
      },
    };
  }

  const rawKind = selectedValue(params, 'type', kinds);
  const kind =
    rawKind !== null && filterWritingKinds.includes(rawKind as WritingKind)
      ? (rawKind as WritingKind)
      : null;
  const category = selectedValue(params, 'category', categories);
  const tag = selectedValue(params, 'tag', tags);

  const filtered = writings.filter(
    (writing) =>
      (kind === null || writing.kind === kind) &&
      (category === null ||
        writing.categories.some((item) => item.slug === category)) &&
      (tag === null || writing.tags.some((item) => item.slug === tag)),
  );

  return {
    writings: filtered,
    model: {
      enabled: true,
      threshold: writingFilterVolumeThreshold,
      totalCount: writings.length,
      resultCount: filtered.length,
      selection: { kind, category, tag },
      kinds,
      categories,
      tags,
    },
  };
}
