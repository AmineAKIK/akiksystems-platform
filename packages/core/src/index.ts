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
