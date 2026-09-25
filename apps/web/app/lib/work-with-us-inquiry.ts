import type { PlatformLocale } from '@akiksystems/core';

export const workWithUsInquiryLimits = {
  name: 120,
  email: 254,
  organization: 160,
  message: 5000,
  requestBytes: 16 * 1024,
} as const;

export interface WorkWithUsInquiryValues {
  name: string;
  email: string;
  organization: string;
  message: string;
}

export type WorkWithUsInquiryField = keyof WorkWithUsInquiryValues;

export type WorkWithUsInquiryFieldErrors = Partial<
  Record<WorkWithUsInquiryField, string>
>;

export interface WorkWithUsInquiryActionData {
  ok: boolean;
  kind: 'success' | 'invalid' | 'rate_limited' | 'error';
  message?: string;
  values?: WorkWithUsInquiryValues;
  errors?: WorkWithUsInquiryFieldErrors;
  submissionToken?: string;
}

export interface ValidWorkWithUsInquiry {
  submissionToken: string;
  values: WorkWithUsInquiryValues;
  organization: string | null;
}

export type WorkWithUsInquiryValidationResult =
  | {
      ok: true;
      inquiry: ValidWorkWithUsInquiry;
    }
  | {
      ok: false;
      data: WorkWithUsInquiryActionData;
    };

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

const messages = {
  en: {
    review: 'Please review the highlighted fields.',
    invalidSubmission: 'This submission is invalid. Please reload the page and try again.',
    nameRequired: 'Enter your name.',
    nameTooLong: 'Keep your name to 120 characters or fewer.',
    emailRequired: 'Enter your email address.',
    emailInvalid: 'Enter a valid email address.',
    emailTooLong: 'Keep your email address to 254 characters or fewer.',
    organizationTooLong: 'Keep the organization to 160 characters or fewer.',
    messageRequired: 'Enter a message.',
    messageTooLong: 'Keep your message to 5,000 characters or fewer.',
    rateLimited: 'Please wait a few minutes before sending another message.',
    failure: 'Your message could not be saved. Please try again.',
  },
  fr: {
    review: 'Vérifiez les champs indiqués.',
    invalidSubmission: 'Cette soumission est invalide. Rechargez la page puis réessayez.',
    nameRequired: 'Indiquez votre nom.',
    nameTooLong: 'Limitez votre nom à 120 caractères.',
    emailRequired: 'Indiquez votre adresse e-mail.',
    emailInvalid: 'Indiquez une adresse e-mail valide.',
    emailTooLong: 'Limitez votre adresse e-mail à 254 caractères.',
    organizationTooLong: 'Limitez le nom de l’organisation à 160 caractères.',
    messageRequired: 'Écrivez un message.',
    messageTooLong: 'Limitez votre message à 5 000 caractères.',
    rateLimited: 'Patientez quelques minutes avant d’envoyer un nouveau message.',
    failure: 'Votre message n’a pas pu être enregistré. Réessayez.',
  },
} as const;

function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value : '';
}

function trimmed(form: FormData, name: string): string {
  return text(form, name).trim();
}

export function workWithUsInquiryMessage(
  locale: PlatformLocale,
  key: keyof (typeof messages)['en'],
): string {
  return messages[locale][key];
}

export function validateWorkWithUsInquiryForm(
  form: FormData,
  locale: PlatformLocale,
): WorkWithUsInquiryValidationResult {
  const submissionToken = trimmed(form, 'submissionToken');
  const values: WorkWithUsInquiryValues = {
    name: trimmed(form, 'name'),
    email: trimmed(form, 'email').toLowerCase(),
    organization: trimmed(form, 'organization'),
    message: trimmed(form, 'message'),
  };
  const trap = trimmed(form, 'faxNumber');

  if (!uuidPattern.test(submissionToken) || trap !== '') {
    return {
      ok: false,
      data: {
        ok: false,
        kind: 'invalid',
        message: workWithUsInquiryMessage(locale, 'invalidSubmission'),
        values,
      },
    };
  }

  const errors: WorkWithUsInquiryFieldErrors = {};

  if (values.name === '') {
    errors.name = workWithUsInquiryMessage(locale, 'nameRequired');
  } else if (values.name.length > workWithUsInquiryLimits.name) {
    errors.name = workWithUsInquiryMessage(locale, 'nameTooLong');
  }

  if (values.email === '') {
    errors.email = workWithUsInquiryMessage(locale, 'emailRequired');
  } else if (values.email.length > workWithUsInquiryLimits.email) {
    errors.email = workWithUsInquiryMessage(locale, 'emailTooLong');
  } else if (!emailPattern.test(values.email)) {
    errors.email = workWithUsInquiryMessage(locale, 'emailInvalid');
  }

  if (values.organization.length > workWithUsInquiryLimits.organization) {
    errors.organization = workWithUsInquiryMessage(
      locale,
      'organizationTooLong',
    );
  }

  if (values.message === '') {
    errors.message = workWithUsInquiryMessage(locale, 'messageRequired');
  } else if (values.message.length > workWithUsInquiryLimits.message) {
    errors.message = workWithUsInquiryMessage(locale, 'messageTooLong');
  }

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      data: {
        ok: false,
        kind: 'invalid',
        message: workWithUsInquiryMessage(locale, 'review'),
        values,
        errors,
        submissionToken,
      },
    };
  }

  return {
    ok: true,
    inquiry: {
      submissionToken,
      values,
      organization:
        values.organization === '' ? null : values.organization,
    },
  };
}
