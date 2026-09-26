import type {
  PublicProfile,
  PublicSystemReference,
} from '@akiksystems/db';
import { Button, Container, Link, Text } from '@akiksystems/ui';
import { Form } from 'react-router';

import {
  PublicProfileView,
  type PublicProfileEditorField,
} from './public-profile-view';

interface AdminProfileInlineEditorProps {
  locale: 'en' | 'fr';
  profile: PublicProfile;
  publication:
    | {
        published_at: string;
      }
    | null;
  systemReferences: PublicSystemReference[];
}

function InlineProfileField({
  field,
}: {
  field: PublicProfileEditorField;
}) {
  const className = [
    'aks-admin-profile-inline',
    `aks-admin-profile-inline--${field.variant}`,
  ].join(' ');

  if (field.multiline === true) {
    return (
      <textarea
        aria-label={field.placeholder}
        className={className}
        defaultValue={field.value ?? ''}
        maxLength={field.maxLength}
        name={field.name}
        placeholder={field.placeholder}
        required={field.required}
        rows={1}
      />
    );
  }

  return (
    <input
      aria-label={field.placeholder}
      className={className}
      defaultValue={field.value ?? ''}
      maxLength={field.maxLength}
      name={field.name}
      placeholder={field.placeholder}
      required={field.required}
      type="text"
    />
  );
}

export function AdminProfileInlineEditor({
  locale,
  profile,
  publication,
  systemReferences,
}: AdminProfileInlineEditorProps) {
  const publicHref = locale === 'fr' ? '/fr/profil' : '/en/profile';

  return (
    <Form className="aks-admin-profile-editor-form" method="post">
      <input name="locale" type="hidden" value={locale} />

      <div className="aks-admin-profile-toolbar">
        <Container width="wide">
          <div className="aks-admin-profile-toolbar-inner">
            <div className="aks-admin-profile-toolbar-context">
              <span className="aks-admin-profile-toolbar-kicker">
                Live profile editor
              </span>
              <nav
                aria-label="Profile locale"
                className="aks-admin-profile-locale-tabs"
              >
                <Link
                  className="aks-admin-profile-locale-tab"
                  data-active={locale === 'en' || undefined}
                  href="/admin/profile?locale=en"
                >
                  EN
                </Link>
                <Link
                  className="aks-admin-profile-locale-tab"
                  data-active={locale === 'fr' || undefined}
                  href="/admin/profile?locale=fr"
                >
                  FR
                </Link>
              </nav>
              <span className="aks-admin-profile-toolbar-status">
                {locale === 'fr' ? 'Français' : 'English'} ·{' '}
                {publication === null ? 'draft only' : 'published'}
              </span>
            </div>

            <div className="aks-admin-profile-toolbar-actions">
              <Link href={publicHref}>Open public Profile</Link>
              <Button
                emphasis="quiet"
                name="_intent"
                type="submit"
                value="profile-inline-save"
              >
                Save {locale.toUpperCase()} draft
              </Button>
              <Button
                name="_intent"
                type="submit"
                value="profile-inline-publish"
              >
                Publish {locale.toUpperCase()}
              </Button>
            </div>
          </div>
        </Container>
      </div>

      <div className="aks-admin-profile-editor-canvas">
        <PublicProfileView
          editor={{
            renderField: (field) => <InlineProfileField field={field} />,
          }}
          profile={profile}
          systemReferences={systemReferences}
        />
      </div>

      <Container width="wide">
        <Text className="aks-admin-profile-editor-note" size="sm" tone="muted">
          Text owned by Profile is editable in place. System and Experience
          evidence, languages, mobility, portrait and source CV remain structured
          controls below.
        </Text>
      </Container>
    </Form>
  );
}
