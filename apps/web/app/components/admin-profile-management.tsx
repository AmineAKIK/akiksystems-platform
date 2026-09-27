import type { DraftProfile, PublicSystemReference } from '@akiksystems/db';
import { Button, Heading, Link, Text } from '@akiksystems/ui';
import { Form } from 'react-router';

interface ProfileAdminManagementActionData {
  ok?: boolean;
  message?: string;
}

interface ProfileWritingCandidate {
  id: string;
  title: string;
  slug: string;
  href: string;
}

interface ProfileTechnologyCandidate {
  id: string;
  slug: string;
  name: string;
}

interface ProfileAssetSummary {
  id: string;
  filename: string | null;
  mimeType: string | null;
}

interface ProfilePortraitSummary extends ProfileAssetSummary {
  alt: Record<string, string | null>;
}

export interface ProfileAdminManagementProps {
  locale: 'en' | 'fr';
  profile: DraftProfile;
  systems: PublicSystemReference[];
  writings: ProfileWritingCandidate[];
  technologies: ProfileTechnologyCandidate[];
  assets: {
    portrait: ProfilePortraitSummary | null;
    cv: ProfileAssetSummary | null;
  };
  actionData?: ProfileAdminManagementActionData | null;
}

const contactKinds = ['linkedin', 'github', 'email', 'phone'] as const;
const languageCodes = ['fr', 'en', 'ar'] as const;

function contactByKind(
  profile: DraftProfile,
  kind: (typeof contactKinds)[number],
) {
  return profile.contacts.find((contact) => contact.kind === kind);
}

function candidateTitle(
  candidates: Array<{ id: string; title: string }>,
  id: string | null,
): string | null {
  if (id === null) return null;
  return candidates.find((candidate) => candidate.id === id)?.title ?? null;
}

export function ProfileAdminManagement({
  locale,
  profile,
  systems,
  writings,
  technologies,
  assets,
  actionData,
}: ProfileAdminManagementProps) {
  const selectedSystemTitle = candidateTitle(systems, profile.currentSystemId);
  const selectedWritingTitle = candidateTitle(
    writings,
    profile.systemicScaleWritingId,
  );

  return (
    <div className="aks-admin-profile-management-stack">
      <header className="aks-admin-profile-management-heading">
        <Text className="aks-admin-profile-management-kicker" size="sm">
          Structure & canonical relations
        </Text>
        <Heading level={2} size="md">
          Data behind the visual editor
        </Heading>
        <Text tone="muted">
          These fields are global or canonical. Changing them can affect both
          locales, so they stay outside the localized canvas.
        </Text>
      </header>

      {actionData?.message ? (
        <Text
          className="aks-admin-profile-management-feedback"
          role={actionData.ok === false ? 'alert' : 'status'}
          size="sm"
          tone={actionData.ok === false ? 'muted' : 'strong'}
        >
          {actionData.message}
        </Text>
      ) : null}

      <section className="aks-admin-profile-management-card">
        <div className="aks-admin-profile-management-card-heading">
          <Heading level={3} size="sm">
            Global Profile facts
          </Heading>
          <Text size="sm" tone="muted">
            Saving this block marks EN and FR draft.
          </Text>
        </div>

        <Form className="aks-admin-profile-global-form" method="post">
          <input name="locale" type="hidden" value={locale} />

          <label className="aks-admin-profile-field">
            <span>Display name</span>
            <input
              defaultValue={profile.displayName ?? ''}
              name="displayName"
              placeholder="Public name"
              type="text"
            />
          </label>

          <div className="aks-admin-profile-field-grid">
            <label className="aks-admin-profile-field">
              <span>Current project System</span>
              <select
                defaultValue={profile.currentSystemId ?? ''}
                name="currentSystemId"
              >
                <option value="">No current project</option>
                {profile.currentSystemId !== null &&
                selectedSystemTitle === null ? (
                  <option value={profile.currentSystemId}>
                    Selected globally · unavailable in {locale.toUpperCase()}
                  </option>
                ) : null}
                {systems.map((system) => (
                  <option key={system.id} value={system.id}>
                    {system.title}
                  </option>
                ))}
              </select>
              <small>
                Only active Systems published in {locale.toUpperCase()} are
                selectable.
              </small>
            </label>

            <label className="aks-admin-profile-field">
              <span>Systemic Scale Writing</span>
              <select
                defaultValue={profile.systemicScaleWritingId ?? ''}
                name="systemicScaleWritingId"
              >
                <option value="">No linked Writing</option>
                {profile.systemicScaleWritingId !== null &&
                selectedWritingTitle === null ? (
                  <option value={profile.systemicScaleWritingId}>
                    Selected globally · unavailable in {locale.toUpperCase()}
                  </option>
                ) : null}
                {writings.map((writing) => (
                  <option key={writing.id} value={writing.id}>
                    {writing.title}
                  </option>
                ))}
              </select>
              <small>
                Only Writings published in {locale.toUpperCase()} are selectable.
              </small>
            </label>
          </div>

          <fieldset className="aks-admin-profile-fieldset">
            <legend>Contacts</legend>
            <div className="aks-admin-profile-contact-grid">
              {contactKinds.map((kind) => {
                const contact = contactByKind(profile, kind);
                return (
                  <div className="aks-admin-profile-contact-field" key={kind}>
                    <label>
                      <span>{kind}</span>
                      <input
                        defaultValue={contact?.value ?? ''}
                        name={'contact:' + kind}
                        placeholder={
                          kind === 'email'
                            ? 'name@example.com'
                            : kind === 'phone'
                              ? '+33…'
                              : 'https://…'
                        }
                        type={kind === 'email' ? 'email' : 'text'}
                      />
                    </label>
                    <label className="aks-admin-profile-check">
                      <input
                        defaultChecked={contact?.visible ?? true}
                        name={'contactVisible:' + kind}
                        type="checkbox"
                      />
                      <span>Visible</span>
                    </label>
                  </div>
                );
              })}
            </div>
          </fieldset>

          <div className="aks-admin-profile-field-grid">
            <fieldset className="aks-admin-profile-fieldset">
              <legend>Languages</legend>
              <div className="aks-admin-profile-check-list">
                {languageCodes.map((language) => (
                  <label className="aks-admin-profile-check" key={language}>
                    <input
                      defaultChecked={profile.languages.includes(language)}
                      name="languages"
                      type="checkbox"
                      value={language}
                    />
                    <span>{language.toUpperCase()}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="aks-admin-profile-fieldset">
              <legend>Mobility</legend>
              <div className="aks-admin-profile-check-list">
                <label className="aks-admin-profile-check">
                  <input
                    defaultChecked={profile.mobility.worldwide}
                    name="mobilityWorldwide"
                    type="checkbox"
                  />
                  <span>Worldwide</span>
                </label>
                <label className="aks-admin-profile-check">
                  <input
                    defaultChecked={profile.mobility.remote}
                    name="mobilityRemote"
                    type="checkbox"
                  />
                  <span>Remote</span>
                </label>
                <label className="aks-admin-profile-check">
                  <input
                    defaultChecked={profile.mobility.relocation}
                    name="mobilityRelocation"
                    type="checkbox"
                  />
                  <span>Relocation</span>
                </label>
              </div>
            </fieldset>
          </div>

          <Button name="_intent" type="submit" value="save-profile-global">
            Save global Profile facts
          </Button>
        </Form>
      </section>

      <section className="aks-admin-profile-management-card">
        <div className="aks-admin-profile-management-card-heading">
          <Heading level={3} size="sm">
            Portrait & CV
          </Heading>
          <Text size="sm" tone="muted">
            Draft assets are previewed privately. Existing public snapshots keep
            their previous bytes until republished.
          </Text>
        </div>

        <div className="aks-admin-profile-assets-grid">
          <article className="aks-admin-profile-asset-card">
            <div>
              <Text size="sm" tone="strong">
                Portrait
              </Text>
              <Text size="sm" tone="muted">
                {assets.portrait?.filename ?? 'No portrait selected'}
              </Text>
            </div>

            {assets.portrait === null ? null : (
              <>
                <img
                  alt={assets.portrait.alt[locale] ?? ''}
                  className="aks-admin-profile-asset-preview"
                  src={'/admin/profile/assets/' + assets.portrait.id}
                />
                <Form className="aks-admin-profile-asset-alt-form" method="post">
                  <label className="aks-admin-profile-field">
                    <span>English alt text</span>
                    <input
                      defaultValue={assets.portrait.alt.en ?? ''}
                      name="altEN"
                      type="text"
                    />
                  </label>
                  <label className="aks-admin-profile-field">
                    <span>French alt text</span>
                    <input
                      defaultValue={assets.portrait.alt.fr ?? ''}
                      name="altFR"
                      type="text"
                    />
                  </label>
                  <Button
                    emphasis="quiet"
                    name="_intent"
                    type="submit"
                    value="save-profile-portrait-alt"
                  >
                    Save alt text
                  </Button>
                </Form>
              </>
            )}

            <Form
              className="aks-admin-profile-upload-form"
              encType="multipart/form-data"
              method="post"
            >
              <label className="aks-admin-profile-field">
                <span>{assets.portrait === null ? 'Upload portrait' : 'Replace portrait'}</span>
                <input
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  name="file"
                  required
                  type="file"
                />
              </label>
              <div className="aks-admin-profile-field-grid">
                <label className="aks-admin-profile-field">
                  <span>English alt text</span>
                  <input name="altEn" type="text" />
                </label>
                <label className="aks-admin-profile-field">
                  <span>French alt text</span>
                  <input name="altFr" type="text" />
                </label>
              </div>
              <Button
                name="_intent"
                type="submit"
                value="upload-profile-portrait"
              >
                Upload portrait
              </Button>
            </Form>

            {assets.portrait === null ? null : (
              <Form method="post">
                <Button
                  emphasis="quiet"
                  name="_intent"
                  type="submit"
                  value="remove-profile-portrait"
                >
                  Remove portrait from draft
                </Button>
              </Form>
            )}
          </article>

          <article className="aks-admin-profile-asset-card">
            <div>
              <Text size="sm" tone="strong">
                CV
              </Text>
              <Text size="sm" tone="muted">
                {assets.cv?.filename ?? 'No CV selected'}
              </Text>
            </div>

            {assets.cv === null ? null : (
              <Link href={'/admin/profile/assets/' + assets.cv.id}>
                Open draft CV
              </Link>
            )}

            <Form
              className="aks-admin-profile-upload-form"
              encType="multipart/form-data"
              method="post"
            >
              <label className="aks-admin-profile-field">
                <span>{assets.cv === null ? 'Upload CV' : 'Replace CV'}</span>
                <input
                  accept="application/pdf"
                  name="file"
                  required
                  type="file"
                />
              </label>
              <Button name="_intent" type="submit" value="upload-profile-cv">
                Upload CV
              </Button>
            </Form>

            {assets.cv === null ? null : (
              <Form method="post">
                <Button
                  emphasis="quiet"
                  name="_intent"
                  type="submit"
                  value="remove-profile-cv"
                >
                  Remove CV from draft
                </Button>
              </Form>
            )}
          </article>
        </div>
      </section>

      <section className="aks-admin-profile-management-card">
        <div className="aks-admin-profile-management-card-heading">
          <Heading level={3} size="sm">
            Stack groups
          </Heading>
          <Text size="sm" tone="muted">
            Group structure and Technology membership are global. Group titles
            remain localized and are edited directly in the visual canvas.
          </Text>
        </div>

        <Form className="aks-admin-profile-add-group" method="post">
          <input name="locale" type="hidden" value={locale} />
          <label className="aks-admin-profile-field">
            <span>New group title · {locale.toUpperCase()}</span>
            <input name="groupTitle" placeholder="e.g. Front-end" required type="text" />
          </label>
          <Button
            name="_intent"
            type="submit"
            value="add-profile-stack-group"
          >
            Add Stack group
          </Button>
        </Form>

        <div className="aks-admin-profile-stack-management-list">
          {profile.stackGroups.length === 0 ? (
            <Text size="sm" tone="muted">
              No Stack groups yet.
            </Text>
          ) : (
            profile.stackGroups.map((group, groupIndex) => {
              const selectedIds = new Set(
                group.technologies.map((technology) => technology.id),
              );
              const available = technologies.filter(
                (technology) => !selectedIds.has(technology.id),
              );

              return (
                <article className="aks-admin-profile-stack-management-card" key={group.id}>
                  <div className="aks-admin-profile-stack-management-heading">
                    <div>
                      <Text tone="strong">
                        {group.title?.trim() || 'Untitled in ' + locale.toUpperCase()}
                      </Text>
                      <Text size="sm" tone="muted">
                        Position {group.position + 1} · {group.technologies.length}{' '}
                        Technologies
                      </Text>
                    </div>
                    <div className="aks-admin-profile-row-actions">
                      <Form method="post">
                        <input name="groupId" type="hidden" value={group.id} />
                        <input name="direction" type="hidden" value="up" />
                        <Button
                          disabled={groupIndex === 0}
                          emphasis="quiet"
                          name="_intent"
                          type="submit"
                          value="move-profile-stack-group"
                        >
                          ↑
                        </Button>
                      </Form>
                      <Form method="post">
                        <input name="groupId" type="hidden" value={group.id} />
                        <input name="direction" type="hidden" value="down" />
                        <Button
                          disabled={groupIndex === profile.stackGroups.length - 1}
                          emphasis="quiet"
                          name="_intent"
                          type="submit"
                          value="move-profile-stack-group"
                        >
                          ↓
                        </Button>
                      </Form>
                      <Form method="post">
                        <input name="groupId" type="hidden" value={group.id} />
                        <Button
                          emphasis="quiet"
                          name="_intent"
                          type="submit"
                          value="remove-profile-stack-group"
                        >
                          Remove
                        </Button>
                      </Form>
                    </div>
                  </div>

                  <div className="aks-admin-profile-technology-list">
                    {group.technologies.map((technology, technologyIndex) => (
                      <div className="aks-admin-profile-technology-row" key={technology.id}>
                        <span>{technology.name}</span>
                        <div className="aks-admin-profile-row-actions">
                          <Form method="post">
                            <input name="groupId" type="hidden" value={group.id} />
                            <input
                              name="technologyId"
                              type="hidden"
                              value={technology.id}
                            />
                            <input name="direction" type="hidden" value="up" />
                            <Button
                              disabled={technologyIndex === 0}
                              emphasis="quiet"
                              name="_intent"
                              type="submit"
                              value="move-profile-stack-technology"
                            >
                              ↑
                            </Button>
                          </Form>
                          <Form method="post">
                            <input name="groupId" type="hidden" value={group.id} />
                            <input
                              name="technologyId"
                              type="hidden"
                              value={technology.id}
                            />
                            <input name="direction" type="hidden" value="down" />
                            <Button
                              disabled={
                                technologyIndex === group.technologies.length - 1
                              }
                              emphasis="quiet"
                              name="_intent"
                              type="submit"
                              value="move-profile-stack-technology"
                            >
                              ↓
                            </Button>
                          </Form>
                          <Form method="post">
                            <input name="groupId" type="hidden" value={group.id} />
                            <input
                              name="technologyId"
                              type="hidden"
                              value={technology.id}
                            />
                            <Button
                              emphasis="quiet"
                              name="_intent"
                              type="submit"
                              value="remove-profile-stack-technology"
                            >
                              Remove
                            </Button>
                          </Form>
                        </div>
                      </div>
                    ))}
                  </div>

                  {available.length === 0 ? null : (
                    <Form className="aks-admin-profile-add-technology" method="post">
                      <input name="groupId" type="hidden" value={group.id} />
                      <label className="aks-admin-profile-field">
                        <span>Add Technology</span>
                        <select name="technologyId" required>
                          <option value="">Choose Technology</option>
                          {available.map((technology) => (
                            <option key={technology.id} value={technology.id}>
                              {technology.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <Button
                        name="_intent"
                        type="submit"
                        value="add-profile-stack-technology"
                      >
                        Add
                      </Button>
                    </Form>
                  )}
                </article>
              );
            })
          )}
        </div>
      </section>

      <section className="aks-admin-profile-management-card">
        <div className="aks-admin-profile-management-card-heading">
          <Heading level={3} size="sm">
            Publication controls
          </Heading>
          <Text size="sm" tone="muted">
            Unpublishing removes only the active locale snapshot. Draft content
            and the other locale stay intact.
          </Text>
        </div>
        <Form method="post">
          <input name="locale" type="hidden" value={locale} />
          <Button
            emphasis="quiet"
            name="_intent"
            type="submit"
            value="unpublish-profile-localization"
          >
            Unpublish {locale.toUpperCase()}
          </Button>
        </Form>
      </section>
    </div>
  );
}
