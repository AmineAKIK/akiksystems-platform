import {
  getPublishedWorkWithUsPage,
  listWorkWithUsProofReferences,
} from '@akiksystems/db';
import { randomUUID } from 'node:crypto';
import {
  data,
  useActionData,
  useLoaderData,
  useNavigation,
  useParams,
} from 'react-router';

import { WorkWithUsView } from '../components/work-with-us-view';
import { requireExactLocale } from '../i18n/locales';
import { appDb } from '../lib/db.server';
import { handleWorkWithUsInquirySubmission } from '../lib/work-with-us-inquiry.server';

import type { Route } from './+types/work-with-us-fr';

export async function loader({ params }: Route.LoaderArgs) {
  const locale = requireExactLocale(params.locale, 'fr');
  const [content, systemReferences] = await Promise.all([
    getPublishedWorkWithUsPage(appDb, locale),
    listWorkWithUsProofReferences(appDb, locale),
  ]);

  return data(
    {
      content,
      systemReferences,
      submissionToken: randomUUID(),
    },
    {
      headers: {
        // The form token must never be shared by an intermediary cache.
        'Cache-Control': 'private, no-store, max-age=0',
      },
    },
  );
}

export async function action({ request, params }: Route.ActionArgs) {
  const locale = requireExactLocale(params.locale, 'fr');
  return handleWorkWithUsInquirySubmission(request, locale);
}

export function meta() {
  return [{ title: 'Travailler ensemble · AkikSystems' }];
}

export default function WorkWithUsRoute() {
  const params = useParams();
  const locale = requireExactLocale(params.locale, 'fr');
  const { content, systemReferences, submissionToken } =
    useLoaderData<typeof loader>();
  const inquiryActionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const inquirySubmitting =
    navigation.state === 'submitting' &&
    navigation.formData?.get('_intent') === 'submit-work-with-us-inquiry';

  return (
    <WorkWithUsView
      content={content}
      inquiryActionData={inquiryActionData}
      inquirySubmitting={inquirySubmitting}
      locale={locale}
      submissionToken={submissionToken}
      systemReferences={systemReferences}
    />
  );
}
