import { describe, expect, it } from 'vitest';

import {
  validateWorkWithUsInquiryForm,
  workWithUsInquiryLimits,
} from './work-with-us-inquiry';

function form(values: Record<string, string>): FormData {
  const result = new FormData();
  for (const [key, value] of Object.entries(values)) {
    result.set(key, value);
  }
  return result;
}

const token = '00000000-0000-4000-8000-000000000042';

describe('validateWorkWithUsInquiryForm', () => {
  it('normalizes a valid inquiry without widening the form contract', () => {
    const result = validateWorkWithUsInquiryForm(
      form({
        submissionToken: token,
        name: '  Ada Lovelace  ',
        email: '  ADA@Example.COM ',
        organization: '  Analytical Systems ',
        message: '  A concrete message about a system.  ',
        faxNumber: '',
      }),
      'en',
    );

    expect(result).toEqual({
      ok: true,
      inquiry: {
        submissionToken: token,
        values: {
          name: 'Ada Lovelace',
          email: 'ada@example.com',
          organization: 'Analytical Systems',
          message: 'A concrete message about a system.',
        },
        organization: 'Analytical Systems',
      },
    });
  });

  it('returns localized field errors and preserves entered values', () => {
    const result = validateWorkWithUsInquiryForm(
      form({
        submissionToken: token,
        name: '',
        email: 'not-an-email',
        organization: 'Organisation',
        message: '',
      }),
      'fr',
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.data.kind).toBe('invalid');
    expect(result.data.errors).toEqual({
      name: 'Indiquez votre nom.',
      email: 'Indiquez une adresse e-mail valide.',
      message: 'Écrivez un message.',
    });
    expect(result.data.values?.organization).toBe('Organisation');
    expect(result.data.submissionToken).toBe(token);
  });

  it('enforces explicit server-side field limits', () => {
    const result = validateWorkWithUsInquiryForm(
      form({
        submissionToken: token,
        name: 'A'.repeat(workWithUsInquiryLimits.name + 1),
        email: `${'a'.repeat(250)}@example.com`,
        organization: 'O'.repeat(workWithUsInquiryLimits.organization + 1),
        message: 'M'.repeat(workWithUsInquiryLimits.message + 1),
      }),
      'en',
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(Object.keys(result.data.errors ?? {})).toEqual([
      'name',
      'email',
      'organization',
      'message',
    ]);
  });

  it('rejects malformed tokens and the anti-spam trap without persistence', () => {
    for (const values of [
      {
        submissionToken: 'not-a-uuid',
        faxNumber: '',
      },
      {
        submissionToken: token,
        faxNumber: '555-0100',
      },
    ]) {
      const result = validateWorkWithUsInquiryForm(
        form({
          name: 'Ada Lovelace',
          email: 'ada@example.com',
          organization: '',
          message: 'A valid message.',
          ...values,
        }),
        'en',
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.data.message).toContain('submission is invalid');
      }
    }
  });
});
