import type { PlatformLocale } from '@akiksystems/core';
import { createWorkWithUsInquiry } from '@akiksystems/db';
import { data } from 'react-router';

import { appDb } from './db.server';
import {
  validateWorkWithUsInquiryForm,
  workWithUsInquiryLimits,
  workWithUsInquiryMessage,
  type WorkWithUsInquiryActionData,
} from './work-with-us-inquiry';

function contentLength(request: Request): number | null {
  const raw = request.headers.get('content-length');
  if (raw === null) return null;

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function actionData(
  payload: WorkWithUsInquiryActionData,
  status: number,
  headers?: HeadersInit,
) {
  return data(payload, {
    status,
    headers: {
      'Cache-Control': 'private, no-store, max-age=0',
      ...headers,
    },
  });
}

export async function handleWorkWithUsInquirySubmission(
  request: Request,
  locale: PlatformLocale,
) {
  const length = contentLength(request);
  if (length !== null && length > workWithUsInquiryLimits.requestBytes) {
    return actionData(
      {
        ok: false,
        kind: 'invalid',
        message: workWithUsInquiryMessage(locale, 'invalidSubmission'),
      },
      413,
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return actionData(
      {
        ok: false,
        kind: 'invalid',
        message: workWithUsInquiryMessage(locale, 'invalidSubmission'),
      },
      400,
    );
  }

  if (form.get('_intent') !== 'submit-work-with-us-inquiry') {
    return actionData(
      {
        ok: false,
        kind: 'invalid',
        message: workWithUsInquiryMessage(locale, 'invalidSubmission'),
      },
      400,
    );
  }

  const validation = validateWorkWithUsInquiryForm(form, locale);
  if (!validation.ok) {
    return actionData(validation.data, 422);
  }

  try {
    const result = await createWorkWithUsInquiry(appDb, {
      submissionToken: validation.inquiry.submissionToken,
      locale,
      name: validation.inquiry.values.name,
      email: validation.inquiry.values.email,
      organization: validation.inquiry.organization,
      message: validation.inquiry.values.message,
    });

    if (result.status === 'rate_limited') {
      return actionData(
        {
          ok: false,
          kind: 'rate_limited',
          message: workWithUsInquiryMessage(locale, 'rateLimited'),
          values: validation.inquiry.values,
          submissionToken: validation.inquiry.submissionToken,
        },
        429,
        {
          'Retry-After': String(result.retryAfterSeconds),
        },
      );
    }

    return actionData(
      {
        ok: true,
        kind: 'success',
      },
      200,
    );
  } catch {
    return actionData(
      {
        ok: false,
        kind: 'error',
        message: workWithUsInquiryMessage(locale, 'failure'),
        values: validation.inquiry.values,
        submissionToken: validation.inquiry.submissionToken,
      },
      500,
    );
  }
}
