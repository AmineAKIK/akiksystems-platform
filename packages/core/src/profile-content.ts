export const profileGuidanceKeys = ['code', 'management', 'field', 'infrastructure'] as const;

export const profileCapabilityStepKeys = [
  'frame',
  'design',
  'validate',
  'develop',
  'test_secure',
  'deploy',
  'operate',
  'evolve',
] as const;

export const profileCrossCuttingKeys = [
  'project_management',
  'collaboration',
  'documentation',
  'transparency',
] as const;

export const profileSystemicScaleStepKeys = [
  'read_request',
  'widen_view',
  'act_right_place',
  'verify_effect',
] as const;

export const profileSystemicScaleProcessKeys = [
  'reservation',
  'assignment',
  'use',
  'return',
  'verification',
  'restoration',
  'location',
  'available',
] as const;

export const profileEmblemSymbolKeys = ['eagle', 'snake', 'olive', 'sea', 'stars'] as const;

export type ProfileGuidanceKey = (typeof profileGuidanceKeys)[number];
export type ProfileCapabilityStepKey = (typeof profileCapabilityStepKeys)[number];
export type ProfileCrossCuttingKey = (typeof profileCrossCuttingKeys)[number];
export type ProfileSystemicScaleStepKey = (typeof profileSystemicScaleStepKeys)[number];
export type ProfileSystemicScaleProcessKey = (typeof profileSystemicScaleProcessKeys)[number];
export type ProfileEmblemSymbolKey = (typeof profileEmblemSymbolKeys)[number];

export interface ProfileHeroContent {
  eyebrow: string;
  professionalTitle: string;
  specialization: string;
  introduction: string;
  cvLabel: string;
}

export interface ProfileCurrentProjectContent {
  eyebrow: string;
  roleLabel: string;
  role: string;
  ctaLabel: string;
  updatedLabel: string;
}

export interface ProfileStackContent {
  eyebrow: string;
  title: string;
  introduction: string;
  proofCountLabel: string;
  inspectSystemLabel: string;
}

export interface ProfileGuidanceLookContent {
  title: string;
  description: string;
  metricValue: string | null;
  metricLabel: string | null;
  source: string | null;
  benefit: string;
  avoidance: string;
  questions: string[];
}

export interface ProfileGuidanceContent {
  eyebrow: string;
  title: string;
  introduction: string;
  centerLabel: string;
  benefitLabel: string;
  avoidanceLabel: string;
  questionsLabel: string;
  conclusion: string;
  looks: Record<ProfileGuidanceKey, ProfileGuidanceLookContent>;
}

export interface ProfileCapabilityStepContent {
  title: string;
  purpose: string;
  actions: string[];
  deliverable: string;
}

export interface ProfileCrossCuttingContent {
  title: string;
  description: string;
}

export interface ProfileCapabilitiesContent {
  eyebrow: string;
  title: string;
  introduction: string;
  beforeCodingLabel: string;
  buildDeliverLabel: string;
  runLiveLabel: string;
  deliverableLabel: string;
  crossCuttingLabel: string;
  steps: Record<ProfileCapabilityStepKey, ProfileCapabilityStepContent>;
  crossCutting: Record<ProfileCrossCuttingKey, ProfileCrossCuttingContent>;
}

export interface ProfileSystemicScaleStepContent {
  title: string;
  principle: string;
  example: string;
  question: string;
  diagramLeadLabel: string;
  diagramAlt: string;
}

export interface ProfileSystemicScaleContent {
  eyebrow: string;
  title: string;
  statementPrimary: string;
  statementSecondary: string;
  introduction: string;
  reasoningLinkLabel: string;
  exampleLabel: string;
  questionLabel: string;
  processLabels: Record<ProfileSystemicScaleProcessKey, string>;
  steps: Record<ProfileSystemicScaleStepKey, ProfileSystemicScaleStepContent>;
}

export interface ProfileEmblemSymbolContent {
  name: string;
  concept: string;
  description: string;
}

export interface ProfileEmblemContent {
  eyebrow: string;
  title: string;
  introduction: string;
  conclusion: string;
  symbols: Record<ProfileEmblemSymbolKey, ProfileEmblemSymbolContent>;
}

export interface ProfileCallToActionContent {
  eyebrow: string;
  title: string;
  body: string;
  buttonLabel: string;
}

export interface ProfileEditableContent {
  hero: ProfileHeroContent;
  currentProject: ProfileCurrentProjectContent;
  stack: ProfileStackContent;
  guidance: ProfileGuidanceContent;
  capabilities: ProfileCapabilitiesContent;
  systemicScale: ProfileSystemicScaleContent;
  emblem: ProfileEmblemContent;
  callToAction: ProfileCallToActionContent;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function nullableText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function textArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];
}

function object(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

function parseGuidanceLook(value: unknown): ProfileGuidanceLookContent {
  const source = object(value);
  return {
    title: text(source.title),
    description: text(source.description),
    metricValue: nullableText(source.metricValue),
    metricLabel: nullableText(source.metricLabel),
    source: nullableText(source.source),
    benefit: text(source.benefit),
    avoidance: text(source.avoidance),
    questions: textArray(source.questions),
  };
}

function parseCapabilityStep(value: unknown): ProfileCapabilityStepContent {
  const source = object(value);
  return {
    title: text(source.title),
    purpose: text(source.purpose),
    actions: textArray(source.actions),
    deliverable: text(source.deliverable),
  };
}

function parseCrossCutting(value: unknown): ProfileCrossCuttingContent {
  const source = object(value);
  return {
    title: text(source.title),
    description: text(source.description),
  };
}

function parseSystemicStep(value: unknown): ProfileSystemicScaleStepContent {
  const source = object(value);
  return {
    title: text(source.title),
    principle: text(source.principle),
    example: text(source.example),
    question: text(source.question),
    diagramLeadLabel: text(source.diagramLeadLabel),
    diagramAlt: text(source.diagramAlt),
  };
}

function parseEmblemSymbol(value: unknown): ProfileEmblemSymbolContent {
  const source = object(value);
  return {
    name: text(source.name),
    concept: text(source.concept),
    description: text(source.description),
  };
}

export function emptyProfileContent(): ProfileEditableContent {
  return parseProfileContent({});
}

export function parseProfileContent(value: unknown): ProfileEditableContent {
  const root = object(value);
  const hero = object(root.hero);
  const currentProject = object(root.currentProject);
  const stack = object(root.stack);
  const guidance = object(root.guidance);
  const guidanceLooks = object(guidance.looks);
  const capabilities = object(root.capabilities);
  const capabilitySteps = object(capabilities.steps);
  const crossCutting = object(capabilities.crossCutting);
  const systemicScale = object(root.systemicScale);
  const processLabels = object(systemicScale.processLabels);
  const systemicSteps = object(systemicScale.steps);
  const emblem = object(root.emblem);
  const emblemSymbols = object(emblem.symbols);
  const callToAction = object(root.callToAction);

  return {
    hero: {
      eyebrow: text(hero.eyebrow),
      professionalTitle: text(hero.professionalTitle),
      specialization: text(hero.specialization),
      introduction: text(hero.introduction),
      cvLabel: text(hero.cvLabel),
    },
    currentProject: {
      eyebrow: text(currentProject.eyebrow),
      roleLabel: text(currentProject.roleLabel),
      role: text(currentProject.role),
      ctaLabel: text(currentProject.ctaLabel),
      updatedLabel: text(currentProject.updatedLabel),
    },
    stack: {
      eyebrow: text(stack.eyebrow),
      title: text(stack.title),
      introduction: text(stack.introduction),
      proofCountLabel: text(stack.proofCountLabel),
      inspectSystemLabel: text(stack.inspectSystemLabel),
    },
    guidance: {
      eyebrow: text(guidance.eyebrow),
      title: text(guidance.title),
      introduction: text(guidance.introduction),
      centerLabel: text(guidance.centerLabel),
      benefitLabel: text(guidance.benefitLabel),
      avoidanceLabel: text(guidance.avoidanceLabel),
      questionsLabel: text(guidance.questionsLabel),
      conclusion: text(guidance.conclusion),
      looks: Object.fromEntries(
        profileGuidanceKeys.map((key) => [key, parseGuidanceLook(guidanceLooks[key])]),
      ) as Record<ProfileGuidanceKey, ProfileGuidanceLookContent>,
    },
    capabilities: {
      eyebrow: text(capabilities.eyebrow),
      title: text(capabilities.title),
      introduction: text(capabilities.introduction),
      beforeCodingLabel: text(capabilities.beforeCodingLabel),
      buildDeliverLabel: text(capabilities.buildDeliverLabel),
      runLiveLabel: text(capabilities.runLiveLabel),
      deliverableLabel: text(capabilities.deliverableLabel),
      crossCuttingLabel: text(capabilities.crossCuttingLabel),
      steps: Object.fromEntries(
        profileCapabilityStepKeys.map((key) => [key, parseCapabilityStep(capabilitySteps[key])]),
      ) as Record<ProfileCapabilityStepKey, ProfileCapabilityStepContent>,
      crossCutting: Object.fromEntries(
        profileCrossCuttingKeys.map((key) => [key, parseCrossCutting(crossCutting[key])]),
      ) as Record<ProfileCrossCuttingKey, ProfileCrossCuttingContent>,
    },
    systemicScale: {
      eyebrow: text(systemicScale.eyebrow),
      title: text(systemicScale.title),
      statementPrimary: text(systemicScale.statementPrimary),
      statementSecondary: text(systemicScale.statementSecondary),
      introduction: text(systemicScale.introduction),
      reasoningLinkLabel: text(systemicScale.reasoningLinkLabel),
      exampleLabel: text(systemicScale.exampleLabel),
      questionLabel: text(systemicScale.questionLabel),
      processLabels: Object.fromEntries(
        profileSystemicScaleProcessKeys.map((key) => [key, text(processLabels[key])]),
      ) as Record<ProfileSystemicScaleProcessKey, string>,
      steps: Object.fromEntries(
        profileSystemicScaleStepKeys.map((key) => [key, parseSystemicStep(systemicSteps[key])]),
      ) as Record<ProfileSystemicScaleStepKey, ProfileSystemicScaleStepContent>,
    },
    emblem: {
      eyebrow: text(emblem.eyebrow),
      title: text(emblem.title),
      introduction: text(emblem.introduction),
      conclusion: text(emblem.conclusion),
      symbols: Object.fromEntries(
        profileEmblemSymbolKeys.map((key) => [key, parseEmblemSymbol(emblemSymbols[key])]),
      ) as Record<ProfileEmblemSymbolKey, ProfileEmblemSymbolContent>,
    },
    callToAction: {
      eyebrow: text(callToAction.eyebrow),
      title: text(callToAction.title),
      body: text(callToAction.body),
      buttonLabel: text(callToAction.buttonLabel),
    },
  };
}
