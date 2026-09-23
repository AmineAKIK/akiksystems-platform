import { Container, Heading, Link, Text } from '@akiksystems/ui';

import type { PublishedTrainingListItem } from '@akiksystems/db';

interface LearningOverviewProps {
  locale: 'en' | 'fr';
  trainings: Array<
    Omit<PublishedTrainingListItem, 'publishedAt'> & { publishedAt: string }
  >;
}

function dateRange(
  training: LearningOverviewProps['trainings'][number],
  locale: 'en' | 'fr',
) {
  if (training.startDate === null && training.endDate === null) {
    return locale === 'fr' ? 'Dates non renseignées' : 'Dates not specified';
  }
  if (training.startDate !== null && training.endDate !== null) {
    return `${training.startDate} → ${training.endDate}`;
  }
  return training.startDate ?? training.endDate ?? '';
}

export function LearningOverview({ locale, trainings }: LearningOverviewProps) {
  const base =
    locale === 'fr' ? `/${locale}/apprentissage` : `/${locale}/learning`;

  return (
    <main className="aks-proof-page aks-learning-overview">
      <Container>
        <div className="aks-proof-stack">
          <section className="aks-proof-hero">
            <Text className="aks-proof-eyebrow" size="sm" tone="muted">
              {locale === 'fr' ? 'Contexte de formation' : 'Training context'}
            </Text>
            <Heading level={1} size="lg">
              {locale === 'fr' ? 'Apprentissage' : 'Learning'}
            </Heading>
            <Text tone="muted">
              {locale === 'fr'
                ? 'La formation donne le contexte. Les preuves et productions restent des objets distincts, reliés et inspectables.'
                : 'Training provides context. Evidence and productions remain distinct, connected, inspectable objects.'}
            </Text>
          </section>

          <section className="aks-proof-stack" aria-labelledby="training-heading">
            <Heading id="training-heading" level={2} size="md">
              {locale === 'fr' ? 'Formations' : 'Training'}
            </Heading>
            {trainings.length === 0 ? (
              <Text tone="muted">
                {locale === 'fr'
                  ? 'Aucune formation publiée pour le moment.'
                  : 'No published training yet.'}
              </Text>
            ) : (
              <div className="aks-admin-asset-list">
                {trainings.map((training) => (
                  <article className="aks-admin-asset" key={training.trainingId}>
                    <div className="aks-proof-stack">
                      <Text size="sm" tone="muted">
                        {training.provider} · {dateRange(training, locale)}
                      </Text>
                      <Heading level={3} size="sm">
                        {training.title}
                      </Heading>
                      <Text>{training.summary}</Text>
                      <Text size="sm" tone="muted">
                        {locale === 'fr' ? 'État' : 'State'}: {training.state}
                      </Text>
                      <Link href={`${base}/${training.slug}`}>
                        {locale === 'fr'
                          ? 'Inspecter la formation'
                          : 'Inspect training'}
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </Container>
    </main>
  );
}
