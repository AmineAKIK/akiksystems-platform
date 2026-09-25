import type { PresentationDocument } from './presentation-document.js';

export const platformLocales = ['en', 'fr'] as const;

export type PlatformLocale = (typeof platformLocales)[number];

export const systemLifecycles = ['active', 'archived'] as const;

export type SystemLifecycle = (typeof systemLifecycles)[number];

export const systemPresentationKinds = [
  'standard',
  'guided_demo',
  'interactive_entry',
] as const;

export type SystemPresentationKind = (typeof systemPresentationKinds)[number];

export const systemEvidencePolicies = [
  'all_supported',
  'documented_only',
] as const;

export type SystemEvidencePolicy = (typeof systemEvidencePolicies)[number];

export const systemEditorialStates = ['draft', 'published'] as const;

export type SystemEditorialState = (typeof systemEditorialStates)[number];

export type SystemId = string;

export interface SystemIdentity {
  id: SystemId;
  lifecycle: SystemLifecycle;
  presentationKind: SystemPresentationKind;
  evidencePolicy: SystemEvidencePolicy;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SystemLocalization {
  systemId: SystemId;
  locale: PlatformLocale;
  slug: string | null;
  title: string | null;
  summary: string | null;
  presentationDocument: PresentationDocument | null;
  editorialState: SystemEditorialState;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type TechnologyId = string;

export interface Technology {
  id: TechnologyId;
  slug: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SystemTechnology {
  systemId: SystemId;
  technologyId: TechnologyId;
  position: number;
}

export const trainingStates = ['planned', 'in_progress', 'completed'] as const;

export type TrainingState = (typeof trainingStates)[number];

export const credentialKinds = ['diploma', 'title', 'certification'] as const;

export type CredentialKind = (typeof credentialKinds)[number];
export type CredentialId = string;
export type LearningArtifactId = string;

export const writingKinds = ['note', 'article', 'essay'] as const;
export type WritingKind = (typeof writingKinds)[number];

export const writingLifecycles = ['active', 'archived'] as const;
export type WritingLifecycle = (typeof writingLifecycles)[number];

export const writingEditorialWeights = ['normal', 'featured', 'major'] as const;
export type WritingEditorialWeight = (typeof writingEditorialWeights)[number];
export type WritingId = string;
export type CategoryId = string;

export interface Category {
  id: CategoryId;
  editorialPosition: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryLocalization {
  categoryId: CategoryId;
  locale: PlatformLocale;
  slug: string | null;
  name: string | null;
  description: string | null;
  editorialState: SystemEditorialState;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WritingCategory {
  writingId: WritingId;
  categoryId: CategoryId;
  position: number;
  createdAt: Date;
}

export type TagId = string;

export interface Tag {
  id: TagId;
  canonicalKey: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TagLocalization {
  tagId: TagId;
  locale: PlatformLocale;
  slug: string | null;
  name: string | null;
  editorialState: SystemEditorialState;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WritingTag {
  writingId: WritingId;
  tagId: TagId;
  position: number;
  createdAt: Date;
}

export interface WritingSystem {
  writingId: WritingId;
  systemId: SystemId;
  position: number;
  createdAt: Date;
}

export type TrainingId = string;

export interface Training {
  id: TrainingId;
  provider: string;
  state: TrainingState;
  startDate: string | null;
  endDate: string | null;
  editorialPosition: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrainingLocalization {
  trainingId: TrainingId;
  locale: PlatformLocale;
  slug: string | null;
  title: string | null;
  summary: string | null;
  body: string | null;
  editorialState: SystemEditorialState;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Writing {
  id: WritingId;
  kind: WritingKind;
  lifecycle: WritingLifecycle;
  editorialWeight: WritingEditorialWeight;
  editorialPosition: number;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WritingLocalization {
  writingId: WritingId;
  locale: PlatformLocale;
  slug: string | null;
  title: string | null;
  summary: string | null;
  body: string | null;
  editorialState: SystemEditorialState;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ExperienceId = string;

export interface Experience {
  id: ExperienceId;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExperienceLocalization {
  experienceId: ExperienceId;
  locale: PlatformLocale;
  title: string;
  summary: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export const systemExperienceRelationKinds = ['origin_context'] as const;

export type SystemExperienceRelationKind =
  (typeof systemExperienceRelationKinds)[number];

export interface SystemExperience {
  systemId: SystemId;
  experienceId: ExperienceId;
  relationKind: SystemExperienceRelationKind;
  createdAt: Date;
}

export type AssetId = string;

export interface Asset {
  id: AssetId;
  storageKey: string;
  originalFilename: string;
  mimeType: string;
  byteSize: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssetLocalization {
  assetId: AssetId;
  locale: PlatformLocale;
  altText: string | null;
  caption: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SystemAsset {
  systemId: SystemId;
  assetId: AssetId;
  position: number;
  createdAt: Date;
}

export const assetUploadMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'application/pdf',
] as const;

export type AssetUploadMimeType = (typeof assetUploadMimeTypes)[number];

export const assetUploadMaxBytes = 10 * 1024 * 1024;

export const systemLinkKinds = [
  'live',
  'repository',
  'demo',
  'documentation',
] as const;

export type SystemLinkKind = (typeof systemLinkKinds)[number];

export function isSystemLinkAllowedByEvidencePolicy(
  policy: SystemEvidencePolicy,
  kind: SystemLinkKind,
): boolean {
  return (
    policy === 'all_supported' ||
    kind === 'repository' ||
    kind === 'documentation'
  );
}

export type SystemLinkId = string;

export interface SystemLink {
  id: SystemLinkId;
  systemId: SystemId;
  kind: SystemLinkKind;
  url: string;
  labelEn?: string | null;
  labelFr?: string | null;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export * from './presentation-document.js';
export * from './writing-document.js';

export * from './system-publication-readiness.js';

export * from './work-with-us-content.js';
