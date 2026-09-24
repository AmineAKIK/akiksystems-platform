import type { PublishedWritingListItem } from '@akiksystems/db';

export interface SelectContextualRelatedWritingsInput {
  currentWritingId: string;
  currentSystemIds: string[];
  candidates: PublishedWritingListItem[];
  limit?: number;
}

export function selectContextualRelatedWritings({
  currentWritingId,
  currentSystemIds,
  candidates,
  limit = 2,
}: SelectContextualRelatedWritingsInput): PublishedWritingListItem[] {
  if (limit <= 0 || currentSystemIds.length === 0) return [];

  const currentSystems = new Set(currentSystemIds);
  const uniqueCandidates = new Map<string, PublishedWritingListItem>();

  for (const candidate of candidates) {
    if (candidate.writingId === currentWritingId) continue;
    if (!candidate.systemIds.some((systemId) => currentSystems.has(systemId))) {
      continue;
    }
    if (!uniqueCandidates.has(candidate.writingId)) {
      uniqueCandidates.set(candidate.writingId, candidate);
    }
  }

  return [...uniqueCandidates.values()]
    .map((writing) => ({
      writing,
      sharedSystemCount: writing.systemIds.filter((systemId) =>
        currentSystems.has(systemId),
      ).length,
    }))
    .sort(
      (left, right) =>
        right.sharedSystemCount - left.sharedSystemCount ||
        left.writing.editorialPosition - right.writing.editorialPosition ||
        left.writing.writingId.localeCompare(right.writing.writingId),
    )
    .slice(0, limit)
    .map(({ writing }) => writing);
}
