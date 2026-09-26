import {
  ensureWorkWithUsInquirySettings,
  listWorkWithUsInquiries,
  resetWorkWithUsInquiryNotification,
  setWorkWithUsInquiryHandled,
  updateWorkWithUsInquiryRecipient,
  writeAdminAuditEvent,
} from '@akiksystems/db';
import { Button, Container, Heading, Link, Text } from '@akiksystems/ui';
import { Form, useActionData, useLoaderData } from 'react-router';
import { z } from 'zod';

import { requireAdminSession } from '../lib/admin.server';
import { appDb } from '../lib/db.server';
import { queueWorkWithUsInquiryNotification } from '../lib/work-with-us-notification.server';

import type { Route } from './+types/admin-work-with-us-inquiries';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const recipientSchema = z
  .string()
  .trim()
  .max(254)
  .email()
  .transform((value) => value.toLowerCase());

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

function requiredInquiryId(form: FormData): string {
  const inquiryId = field(form, 'inquiryId');

  if (!uuidPattern.test(inquiryId)) {
    throw new Response('Inquiry not found.', { status: 404 });
  }

  return inquiryId;
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await requireAdminSession(request);
  const settings = await ensureWorkWithUsInquirySettings(
    appDb,
    session.user.email,
  );
  const inquiries = await listWorkWithUsInquiries(appDb, 100);

  return {
    email: session.user.email,
    settings,
    inquiries,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const session = await requireAdminSession(request);
  const form = await request.formData();
  const intent = field(form, '_intent');

  if (intent === 'save-notification-recipient') {
    const parsed = recipientSchema.safeParse(field(form, 'recipientEmail'));

    if (!parsed.success) {
      return {
        scope: 'settings' as const,
        ok: false,
        message: 'Enter a valid notification recipient email address.',
      };
    }

    await appDb.transaction().execute(async (transaction) => {
      await updateWorkWithUsInquiryRecipient(transaction, parsed.data);
      await writeAdminAuditEvent(transaction, {
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'work_with_us.inquiry_recipient_updated',
        entityType: 'work_with_us_inquiry_settings',
        entityId: 'public',
        metadata: {
          recipientEmail: parsed.data,
        },
      });
    });

    return {
      scope: 'settings' as const,
      ok: true,
      message: 'Inquiry notification recipient updated.',
    };
  }

  if (intent === 'mark-inquiry-handled' || intent === 'reopen-inquiry') {
    const inquiryId = requiredInquiryId(form);
    const handled = intent === 'mark-inquiry-handled';

    await appDb.transaction().execute(async (transaction) => {
      const updated = await setWorkWithUsInquiryHandled(
        transaction,
        inquiryId,
        handled,
      );

      if (!updated) {
        throw new Response('Inquiry not found.', { status: 404 });
      }

      await writeAdminAuditEvent(transaction, {
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: handled
          ? 'work_with_us.inquiry_handled'
          : 'work_with_us.inquiry_reopened',
        entityType: 'work_with_us_inquiry',
        entityId: inquiryId,
        metadata: {},
      });
    });

    return {
      scope: 'inquiry' as const,
      inquiryId,
      ok: true,
      message: handled ? 'Inquiry marked as handled.' : 'Inquiry reopened.',
    };
  }

  if (intent === 'retry-inquiry-notification') {
    const inquiryId = requiredInquiryId(form);

    const reset = await appDb.transaction().execute(async (transaction) => {
      const didReset = await resetWorkWithUsInquiryNotification(
        transaction,
        inquiryId,
      );

      if (didReset) {
        await writeAdminAuditEvent(transaction, {
          actorUserId: session.user.id,
          actorEmail: session.user.email,
          action: 'work_with_us.inquiry_notification_retried',
          entityType: 'work_with_us_inquiry',
          entityId: inquiryId,
          metadata: {},
        });
      }

      return didReset;
    });

    if (!reset) {
      return {
        scope: 'inquiry' as const,
        inquiryId,
        ok: false,
        message: 'This notification is already sent or the inquiry no longer exists.',
      };
    }

    const queued = await queueWorkWithUsInquiryNotification(inquiryId);

    return {
      scope: 'inquiry' as const,
      inquiryId,
      ok: queued,
      message: queued
        ? 'Notification queued for retry.'
        : 'Inquiry is safe, but the notification could not be queued. Retry later.',
    };
  }

  return {
    scope: 'page' as const,
    ok: false,
    message: 'Unsupported inquiry operation.',
  };
}

function timestamp(value: Date | string | null): string {
  if (value === null) return '—';
  return new Date(value).toISOString();
}

export default function AdminWorkWithUsInquiries() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  const openCount = data.inquiries.filter(
    (inquiry) => inquiry.handledAt === null,
  ).length;

  return (
    <main className="aks-admin-shell">
      <Container>
        <div className="aks-proof-stack">
          <section className="aks-admin-card">
            <div className="aks-proof-stack">
              <Text className="aks-proof-eyebrow" size="sm" tone="muted">
                L7 · Work with us · Inquiries
              </Text>
              <Heading level={1} size="md">
                Inquiry inbox
              </Heading>
              <Text tone="muted">
                Inquiry storage is the source of truth. Email is an asynchronous
                notification channel and can fail or retry without losing the
                visitor&apos;s message.
              </Text>
              <Text size="sm" tone="muted">
                {openCount} open · {data.inquiries.length} loaded · authenticated
                as {data.email}.
              </Text>
              <div className="aks-proof-actions">
                <Link href="/admin/work-with-us">Work with us administration</Link>
                <Link href="/admin">Administration home</Link>
              </div>
            </div>
          </section>

          <section className="aks-admin-card">
            <div className="aks-proof-stack">
              <Heading level={2} size="sm">
                Notification recipient
              </Heading>
              <Text tone="muted">
                This address is administrative configuration. Provider
                credentials remain environment secrets on the worker.
              </Text>

              {actionData?.scope === 'settings' ? (
                <Text
                  role={actionData.ok ? 'status' : 'alert'}
                  size="sm"
                  tone={actionData.ok ? 'strong' : 'muted'}
                >
                  {actionData.message}
                </Text>
              ) : null}

              <Form className="aks-admin-form" method="post">
                <input
                  name="_intent"
                  type="hidden"
                  value="save-notification-recipient"
                />
                <label>
                  <span>Recipient email</span>
                  <input
                    defaultValue={data.settings.recipientEmail ?? ''}
                    maxLength={254}
                    name="recipientEmail"
                    required
                    type="email"
                  />
                </label>
                <Button type="submit">Save recipient</Button>
              </Form>
            </div>
          </section>

          <section className="aks-admin-card">
            <div className="aks-proof-stack">
              <Heading level={2} size="sm">
                Inquiries
              </Heading>

              {actionData?.scope === 'page' ? (
                <Text role="alert" size="sm" tone="muted">
                  {actionData.message}
                </Text>
              ) : null}

              {data.inquiries.length === 0 ? (
                <Text tone="muted">No inquiries yet.</Text>
              ) : (
                data.inquiries.map((inquiry) => {
                  const notification = inquiry.notification;
                  const feedback =
                    actionData?.scope === 'inquiry' &&
                    actionData.inquiryId === inquiry.id
                      ? actionData
                      : null;

                  return (
                    <article
                      className="aks-admin-card aks-work-with-us-inquiry-admin-card"
                      data-inquiry-id={inquiry.id}
                      key={inquiry.id}
                    >
                      <div className="aks-proof-stack">
                        <div className="aks-work-with-us-inquiry-admin-header">
                          <div className="aks-proof-stack">
                            <Heading level={3} size="sm">
                              {inquiry.name}
                            </Heading>
                            <Text size="sm" tone="muted">
                              {inquiry.locale.toUpperCase()} · received{' '}
                              {timestamp(inquiry.createdAt)}
                            </Text>
                          </div>
                          <Text size="sm" tone={inquiry.handledAt === null ? 'strong' : 'muted'}>
                            {inquiry.handledAt === null
                              ? 'Open'
                              : `Handled · ${timestamp(inquiry.handledAt)}`}
                          </Text>
                        </div>

                        <div className="aks-work-with-us-inquiry-admin-meta">
                          <Text size="sm">
                            <Link href={`mailto:${inquiry.email}`}>
                              {inquiry.email}
                            </Link>
                          </Text>
                          <Text size="sm" tone="muted">
                            {inquiry.organization ?? 'No organization provided'}
                          </Text>
                        </div>

                        <div className="aks-work-with-us-inquiry-admin-message">
                          <Text>{inquiry.message}</Text>
                        </div>

                        <div className="aks-work-with-us-inquiry-admin-notification">
                          <Text size="sm" tone="strong">
                            Notification · {notification.state}
                          </Text>
                          <Text size="sm" tone="muted">
                            Attempts: {notification.attemptCount} · recipient:{' '}
                            {notification.recipientEmail ?? 'not selected'} · sent:{' '}
                            {timestamp(notification.sentAt)}
                          </Text>
                          {notification.lastError === null ? null : (
                            <Text size="sm" tone="muted">
                              {notification.lastError}
                            </Text>
                          )}
                        </div>

                        {feedback === null ? null : (
                          <Text
                            role={feedback.ok ? 'status' : 'alert'}
                            size="sm"
                            tone={feedback.ok ? 'strong' : 'muted'}
                          >
                            {feedback.message}
                          </Text>
                        )}

                        <div className="aks-proof-actions">
                          <Form method="post">
                            <input
                              name="_intent"
                              type="hidden"
                              value={
                                inquiry.handledAt === null
                                  ? 'mark-inquiry-handled'
                                  : 'reopen-inquiry'
                              }
                            />
                            <input
                              name="inquiryId"
                              type="hidden"
                              value={inquiry.id}
                            />
                            <Button emphasis="quiet" type="submit">
                              {inquiry.handledAt === null
                                ? 'Mark handled'
                                : 'Reopen'}
                            </Button>
                          </Form>

                          {notification.state === 'sent' ? null : (
                            <Form method="post">
                              <input
                                name="_intent"
                                type="hidden"
                                value="retry-inquiry-notification"
                              />
                              <input
                                name="inquiryId"
                                type="hidden"
                                value={inquiry.id}
                              />
                              <Button emphasis="quiet" type="submit">
                                Retry notification
                              </Button>
                            </Form>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </Container>
    </main>
  );
}
