import type { PlatformLocale } from '@akiksystems/core';

export interface CommercialPagePublicationSnapshot {
  version: 1;
  pageId: string;
  locale: PlatformLocale;
  title: string;
  introduction: string;
  situationsTitle: string | null;
  situationsBody: string | null;
  capabilitiesTitle: string | null;
  capabilitiesBody: string | null;
  collaborationTitle: string | null;
  collaborationBody: string | null;
  inquiryTitle: string | null;
  inquiryBody: string | null;
  privacyNote: string | null;
}

export type PublishedCommercialPage = CommercialPagePublicationSnapshot;
