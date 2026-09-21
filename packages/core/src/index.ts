export const platformLocales = ['en', 'fr'] as const;

export type PlatformLocale = (typeof platformLocales)[number];

export const systemLifecycles = ['active', 'archived'] as const;

export type SystemLifecycle = (typeof systemLifecycles)[number];

export const systemEditorialStates = ['draft', 'published'] as const;

export type SystemEditorialState = (typeof systemEditorialStates)[number];

export type SystemId = string;

export interface SystemIdentity {
  id: SystemId;
  lifecycle: SystemLifecycle;
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

export type SystemLinkId = string;

export interface SystemLink {
  id: SystemLinkId;
  systemId: SystemId;
  kind: SystemLinkKind;
  url: string;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export * from './presentation-document.js';

export * from './system-publication-readiness.js';
