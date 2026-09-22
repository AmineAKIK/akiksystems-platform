import { Container, Heading, Link, Text } from '@akiksystems/ui';
import { Link as RouterLink } from 'react-router';

import { DeferredDemoLink } from './deferred-demo-link';
import { SystemProofTransparency } from './system-proof-transparency';
import {
  SystemPresentation,
  type SystemDetailViewProps,
} from './system-detail-view';

export function InteractiveEntrySystemRenderer({
  locale,
  title,
  summary,
  proofTransparency,
  presentationDocument,
  technologies,
  links,
  assets,
  preview = false,
}: SystemDetailViewProps) {
  const live = links.find((link) => link.kind === 'live') ?? null;
  const supportingLinks = links.filter((link) => link.kind !== 'live');

  return (
    <main className="aks-interactive-entry" id="system-content" tabIndex={-1}>
      <Container width="wide">
        <article className="aks-interactive-entry-stack">
          <header className="aks-interactive-entry-hero">
            <div className="aks-interactive-entry-intro">
              <Text className="aks-proof-eyebrow" size="sm" tone="muted">
                {preview
                  ? locale === 'fr'
                    ? 'Aperçu privé · entrée interactive'
                    : 'Private preview · interactive entry'
                  : locale === 'fr'
                    ? 'Système · entrée interactive'
                    : 'System · interactive entry'}
              </Text>
              <Heading level={1} size="lg">
                {title}
              </Heading>
              <Text className="aks-interactive-entry-summary" size="lg">
                {summary}
              </Text>
            </div>

            <aside className="aks-interactive-entry-transition">
              <Text className="aks-proof-eyebrow" size="sm" tone="muted">
                {locale === 'fr' ? 'Passage vers l’application' : 'Passage to the live application'}
              </Text>
              <Heading level={2} size="sm">
                {locale === 'fr'
                  ? 'AkikSystems reste votre point de retour'
                  : 'AkikSystems remains your return point'}
              </Heading>
              <Text tone="muted">
                {locale === 'fr'
                  ? 'L’application live s’ouvre dans un nouvel onglet. Cette page reste ouverte avec les preuves, limites et liens techniques du projet.'
                  : 'The live application opens in a new tab. This page stays open with the project evidence, boundaries, and technical links.'}
              </Text>

              <div className="aks-interactive-entry-actions">
                {live !== null ? (
                  <Link
                    href={live.url}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {locale === 'fr'
                      ? 'Ouvrir l’application dans un nouvel onglet'
                      : 'Open the live application in a new tab'}
                  </Link>
                ) : null}

                <RouterLink
                  className="aks-link"
                  prefetch="intent"
                  to={`/${locale}/systems`}
                  viewTransition
                >
                  {locale === 'fr' ? 'Retour aux Systèmes' : 'Back to Systems'}
                </RouterLink>
              </div>
            </aside>
          </header>

          <SystemProofTransparency
            locale={locale}
            transparency={proofTransparency}
          />

          <section className="aks-interactive-entry-boundary">
            <Text className="aks-proof-eyebrow" size="sm" tone="muted">
              {locale === 'fr' ? 'Avant d’entrer' : 'Before entering'}
            </Text>
            <Text>
              {locale === 'fr'
                ? 'Cette application s’ouvre en dehors d’AkikSystems. Consultez la transparence de preuve ci-dessus pour distinguer ce qui est implémenté, simulé ou non revendiqué avant de continuer.'
                : 'This application opens outside AkikSystems. Review the proof-transparency summary above to distinguish what is implemented, simulated, or not claimed before continuing.'}
            </Text>
          </section>

          <SystemPresentation
            assets={assets}
            document={presentationDocument}
            locale={locale}
          />

          <footer className="aks-interactive-entry-footer">
            {technologies.length > 0 ? (
              <section>
                <Text className="aks-proof-eyebrow" size="sm" tone="muted">
                  {locale === 'fr' ? 'Technologies vérifiables' : 'Inspectable technologies'}
                </Text>
                <ul
                  aria-label={locale === 'fr' ? 'Technologies utilisées' : 'Technologies'}
                  className="aks-system-detail-tags"
                >
                  {technologies.map((technology) => (
                    <li key={technology.id}>{technology.name}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            {supportingLinks.length > 0 ? (
              <nav
                aria-label={locale === 'fr' ? 'Preuves du système' : 'System evidence'}
                className="aks-proof-actions"
              >
                {supportingLinks.map((link) =>
                  link.kind === 'demo' ? (
                    <DeferredDemoLink
                      key={link.id}
                      locale={locale}
                      url={link.url}
                    />
                  ) : (
                    <Link href={link.url} key={link.id}>
                      {link.kind === 'repository'
                        ? locale === 'fr'
                          ? 'Dépôt'
                          : 'Repository'
                        : link.label ?? 'Documentation'}
                    </Link>
                  ),
                )}
              </nav>
            ) : null}
          </footer>
        </article>
      </Container>
    </main>
  );
}
