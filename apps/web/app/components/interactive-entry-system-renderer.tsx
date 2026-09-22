import { Container, Heading, Link, Text } from '@akiksystems/ui';
import { Link as RouterLink } from 'react-router';

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
                      ? 'Ouvrir Oria dans un nouvel onglet'
                      : 'Open Oria in a new tab'}
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
                ? 'Oria est une démonstration portfolio fictive et non industrielle. Elle ne traite aucune donnée de client réel et ne constitue pas un service médical ou un cabinet de nutrition en activité.'
                : 'Oria is a fictional, non-industrial portfolio demonstration. It processes no real client data and is not a medical service or an operating nutrition practice.'}
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
                {supportingLinks.map((link) => (
                  <Link href={link.url} key={link.id}>
                    {link.kind === 'repository'
                      ? locale === 'fr'
                        ? 'Dépôt'
                        : 'Repository'
                      : link.kind === 'documentation'
                        ? 'Documentation'
                        : 'Demo'}
                  </Link>
                ))}
              </nav>
            ) : null}
          </footer>
        </article>
      </Container>
    </main>
  );
}
