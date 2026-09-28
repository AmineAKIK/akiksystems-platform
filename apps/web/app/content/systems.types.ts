export type SystemsStatus = 'building' | 'deployed' | 'private' | 'experimental' | 'archived';

export interface SystemsMedia {
  alt: string;
  avif: string;
  height: number;
  placeholder: boolean;
  priority?: boolean;
  webp: string;
  width: number;
}

export interface SystemsAction {
  href: string;
  kind: 'primary' | 'secondary' | 'quiet';
  label: string;
}

export interface SystemsHeroContent {
  eyebrow: string;
  intro: string;
  media: SystemsMedia;
  state: string;
  title: string;
}

export interface SystemsRailItem {
  index: string;
  label: string;
  target: string;
}

export interface SystemsAtlasContent {
  actions: SystemsAction[];
  eyebrow: string;
  journal: {
    action: string;
    body: string;
    label: string;
  };
  mapLabel: string;
  name: string;
  notes: string[];
  placeholder: boolean;
  shareLabel: string;
  status: SystemsStatus;
  statusLabel: string;
  summary: string;
  toolbarSubtitle: string;
  updated: string;
  views: {
    active: number;
    label: string;
    items: string[];
  };
}

export interface SystemsStation {
  action: SystemsAction;
  function: string;
  id: string;
  media: SystemsMedia;
  name: string;
  placeholder: boolean;
  status: SystemsStatus;
  statusLabel: string;
}

export interface SystemsTool {
  action: SystemsAction;
  environment: string;
  function: string;
  name: string;
  placeholder: boolean;
}

export interface SystemsManifestoContent {
  body: string;
  eyebrow: string;
  lines: [string, string, string];
  signature: string;
}

export interface SystemsWorkbenchContent {
  columns: {
    access: string;
    environment: string;
    function: string;
    name: string;
  };
  intro: string;
  title: string;
  tools: SystemsTool[];
}

export interface SystemsPerspectivesContent {
  actions: SystemsAction[];
  eyebrow: string;
  intro: string;
  title: string;
}

export interface SystemsPageContent {
  atlas: SystemsAtlasContent;
  footer: {
    brandTagline: string;
    copyright: string;
    legal: Array<{ href: string; label: string }>;
  };
  hero: SystemsHeroContent;
  manifesto: SystemsManifestoContent;
  nav: {
    home: string;
    menu: string;
    perspectives: string;
    profile: string;
    writings: string;
  };
  operations: {
    eyebrow: string;
    intro: string;
    title: string;
  };
  perspectives: SystemsPerspectivesContent;
  rail: SystemsRailItem[];
  stations: [SystemsStation, SystemsStation, SystemsStation, SystemsStation, SystemsStation];
  workbench: SystemsWorkbenchContent;
}
