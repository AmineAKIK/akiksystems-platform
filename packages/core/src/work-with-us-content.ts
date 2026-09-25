export const workWithUsApproachStepKeys = [
  'understand',
  'structure',
  'build',
] as const;

export type WorkWithUsApproachStepKey =
  (typeof workWithUsApproachStepKeys)[number];

export interface WorkWithUsApproachStepContent {
  key: WorkWithUsApproachStepKey;
  title: string | null;
  body: string | null;
}

export interface WorkWithUsEditableContent {
  hero: {
    eyebrow: string | null;
    title: string | null;
    introduction: string | null;
  };
  approach: {
    eyebrow: string | null;
    title: string | null;
    introduction: string | null;
    steps: [
      WorkWithUsApproachStepContent,
      WorkWithUsApproachStepContent,
      WorkWithUsApproachStepContent,
    ];
  };
  contact: {
    eyebrow: string | null;
    title: string | null;
    introduction: string | null;
    nameLabel: string | null;
    emailLabel: string | null;
    organizationLabel: string | null;
    messageLabel: string | null;
    messagePlaceholder: string | null;
    listenLabel: string | null;
    submitLabel: string | null;
    successMessage: string | null;
    privacyNote: string | null;
  };
  about: {
    eyebrow: string | null;
    title: string | null;
    body: string | null;
    profileLinkLabel: string | null;
  };
  systems: {
    eyebrow: string | null;
    title: string | null;
    introduction: string | null;
    allSystemsLinkLabel: string | null;
  };
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function parseStep(
  value: unknown,
  key: WorkWithUsApproachStepKey,
): WorkWithUsApproachStepContent {
  const source = record(value);
  return {
    key,
    title: nullableString(source.title),
    body: nullableString(source.body),
  };
}

export function emptyWorkWithUsContent(): WorkWithUsEditableContent {
  return {
    hero: {
      eyebrow: null,
      title: null,
      introduction: null,
    },
    approach: {
      eyebrow: null,
      title: null,
      introduction: null,
      steps: [
        { key: 'understand', title: null, body: null },
        { key: 'structure', title: null, body: null },
        { key: 'build', title: null, body: null },
      ],
    },
    contact: {
      eyebrow: null,
      title: null,
      introduction: null,
      nameLabel: null,
      emailLabel: null,
      organizationLabel: null,
      messageLabel: null,
      messagePlaceholder: null,
      listenLabel: null,
      submitLabel: null,
      successMessage: null,
      privacyNote: null,
    },
    about: {
      eyebrow: null,
      title: null,
      body: null,
      profileLinkLabel: null,
    },
    systems: {
      eyebrow: null,
      title: null,
      introduction: null,
      allSystemsLinkLabel: null,
    },
  };
}

export function parseWorkWithUsContent(
  value: unknown,
): WorkWithUsEditableContent {
  const root = record(value);
  const hero = record(root.hero);
  const approach = record(root.approach);
  const contact = record(root.contact);
  const about = record(root.about);
  const systems = record(root.systems);
  const rawSteps = Array.isArray(approach.steps) ? approach.steps : [];

  const step = (key: WorkWithUsApproachStepKey) => {
    const candidate = rawSteps.find(
      (value) => record(value).key === key,
    );
    return parseStep(candidate, key);
  };

  return {
    hero: {
      eyebrow: nullableString(hero.eyebrow),
      title: nullableString(hero.title),
      introduction: nullableString(hero.introduction),
    },
    approach: {
      eyebrow: nullableString(approach.eyebrow),
      title: nullableString(approach.title),
      introduction: nullableString(approach.introduction),
      steps: [step('understand'), step('structure'), step('build')],
    },
    contact: {
      eyebrow: nullableString(contact.eyebrow),
      title: nullableString(contact.title),
      introduction: nullableString(contact.introduction),
      nameLabel: nullableString(contact.nameLabel),
      emailLabel: nullableString(contact.emailLabel),
      organizationLabel: nullableString(contact.organizationLabel),
      messageLabel: nullableString(contact.messageLabel),
      messagePlaceholder: nullableString(contact.messagePlaceholder),
      listenLabel: nullableString(contact.listenLabel),
      submitLabel: nullableString(contact.submitLabel),
      successMessage: nullableString(contact.successMessage),
      privacyNote: nullableString(contact.privacyNote),
    },
    about: {
      eyebrow: nullableString(about.eyebrow),
      title: nullableString(about.title),
      body: nullableString(about.body),
      profileLinkLabel: nullableString(about.profileLinkLabel),
    },
    systems: {
      eyebrow: nullableString(systems.eyebrow),
      title: nullableString(systems.title),
      introduction: nullableString(systems.introduction),
      allSystemsLinkLabel: nullableString(systems.allSystemsLinkLabel),
    },
  };
}
