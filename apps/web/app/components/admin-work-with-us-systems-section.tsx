import { Button, Heading, Text } from '@akiksystems/ui';
import { Form } from 'react-router';

export interface WorkWithUsAdminSystem {
  id: string;
  lifecycle: string;
  titleEn: string | null;
  titleFr: string | null;
  publishedEn: boolean;
  publishedFr: boolean;
}

export interface WorkWithUsSelectedSystem {
  systemId: string;
  position: number;
}

interface WorkWithUsSystemsActionData {
  ok?: boolean;
  message?: string;
}

export interface WorkWithUsSystemsSectionProps {
  systems: WorkWithUsAdminSystem[];
  selectedSystems: WorkWithUsSelectedSystem[];
  actionData?: WorkWithUsSystemsActionData | null;
}

function systemLabel(system: WorkWithUsAdminSystem): string {
  return system.titleEn ?? system.titleFr ?? system.id;
}

export function WorkWithUsSystemsSection({
  systems,
  selectedSystems,
  actionData,
}: WorkWithUsSystemsSectionProps) {
  const selectedIds = new Set(
    selectedSystems.map(({ systemId }) => systemId),
  );
  const availableSystems = systems.filter(
    (system) => system.lifecycle === 'active' && !selectedIds.has(system.id),
  );

  return (
    <section className="aks-admin-card" id="admin-work-with-us-systems">
      <div className="aks-proof-stack">
        <Heading level={2} size="sm">
          Selected Systems
        </Heading>
        <Text tone="muted">
          Choose and order up to four Systems. The selection is shared across
          languages; a System only appears publicly in a locale where that
          System has a published snapshot.
        </Text>

        {actionData?.message ? (
          <Text
            role={actionData.ok === false ? 'alert' : 'status'}
            size="sm"
            tone={actionData.ok === false ? 'muted' : 'strong'}
          >
            {actionData.message}
          </Text>
        ) : null}

        {selectedSystems.length === 0 ? (
          <Text size="sm" tone="muted">
            No System selected yet.
          </Text>
        ) : (
          <div className="aks-admin-asset-list">
            {selectedSystems.map((selection, index) => {
              const system = systems.find(
                (candidate) => candidate.id === selection.systemId,
              );

              if (system === undefined) return null;

              return (
                <article className="aks-admin-asset" key={system.id}>
                  <div className="aks-proof-stack">
                    <Text tone="strong">
                      {index + 1}. {systemLabel(system)}
                    </Text>
                    <Text size="sm" tone="muted">
                      EN {system.publishedEn ? 'published' : 'not published'} · FR{' '}
                      {system.publishedFr ? 'published' : 'not published'}
                    </Text>

                    {system.lifecycle !== 'active' ? (
                      <Text size="sm">
                        This System is not active and will not appear on either
                        public Work with us page.
                      </Text>
                    ) : null}
                    {!system.publishedEn ? (
                      <Text size="sm">
                        Not published in EN — hidden from /en/work-with-us.
                      </Text>
                    ) : null}
                    {!system.publishedFr ? (
                      <Text size="sm">
                        Not published in FR — hidden from
                        /fr/travailler-ensemble.
                      </Text>
                    ) : null}

                    <div className="aks-proof-actions">
                      <Form method="post">
                        <input
                          name="_intent"
                          type="hidden"
                          value="move-work-with-us-system"
                        />
                        <input
                          name="systemId"
                          type="hidden"
                          value={system.id}
                        />
                        <Button
                          disabled={index === 0}
                          emphasis="quiet"
                          name="direction"
                          type="submit"
                          value="up"
                        >
                          Move up
                        </Button>
                        <Button
                          disabled={index === selectedSystems.length - 1}
                          emphasis="quiet"
                          name="direction"
                          type="submit"
                          value="down"
                        >
                          Move down
                        </Button>
                      </Form>

                      <Form method="post">
                        <input
                          name="_intent"
                          type="hidden"
                          value="remove-work-with-us-system"
                        />
                        <input
                          name="systemId"
                          type="hidden"
                          value={system.id}
                        />
                        <Button emphasis="quiet" type="submit">
                          Remove
                        </Button>
                      </Form>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <Form className="aks-admin-form" method="post">
          <input
            name="_intent"
            type="hidden"
            value="add-work-with-us-system"
          />
          <label>
            <span>Add a System</span>
            <select
              defaultValue=""
              disabled={
                selectedSystems.length >= 4 || availableSystems.length === 0
              }
              name="systemId"
              required
            >
              <option disabled value="">
                Choose a System
              </option>
              {availableSystems.map((system) => (
                <option key={system.id} value={system.id}>
                  {systemLabel(system)}
                </option>
              ))}
            </select>
          </label>
          <Button
            disabled={
              selectedSystems.length >= 4 || availableSystems.length === 0
            }
            type="submit"
          >
            Add System
          </Button>
        </Form>

        {selectedSystems.length >= 4 ? (
          <Text size="sm" tone="muted">
            Maximum reached: four Systems.
          </Text>
        ) : null}
      </div>
    </section>
  );
}
