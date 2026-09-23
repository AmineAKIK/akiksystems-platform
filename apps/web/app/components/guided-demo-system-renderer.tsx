import type {
  PresentationBlock,
  PresentationEvidenceStatus,
} from '@akiksystems/core';
import { Container, Heading, Link, Text } from '@akiksystems/ui';

import { DeferredDemoLink } from './deferred-demo-link';
import { SystemProofTransparency } from './system-proof-transparency';
import { SystemLearningEvidence } from './system-learning-evidence';
import {
  PresentationBlockView,
  type SystemDetailAsset,
  type SystemDetailViewProps,
} from './system-detail-view';

interface GuidedSection {
  heading: string;
  evidenceStatus: PresentationEvidenceStatus | null;
  blocks: PresentationBlock[];
}

function splitPresentation(blocks: PresentationBlock[]): {
  lead: PresentationBlock[];
  sections: GuidedSection[];
} {
  const lead: PresentationBlock[] = [];
  const sections: GuidedSection[] = [];
  let current: GuidedSection | null = null;

  for (const block of blocks) {
    if (block.type === 'heading' && block.level === 2) {
      current = {
        heading: block.text,
        evidenceStatus: block.evidenceStatus ?? null,
        blocks: [],
      };
      sections.push(current);
      continue;
    }

    if (current === null) {
      lead.push(block);
    } else {
      current.blocks.push(block);
    }
  }

  return { lead, sections };
}

function statusForSection(
  status: PresentationEvidenceStatus | null,
  locale: SystemDetailViewProps['locale'],
): string {
  switch (status) {
    case 'implemented':
      return locale === 'fr' ? 'Implémenté' : 'Implemented';
    case 'hypothesis':
      return locale === 'fr' ? 'Hypothèse' : 'Hypothesis';
    case 'future_integration':
      return locale === 'fr' ? 'Intégration future' : 'Future integration';
    case 'boundary':
    case null:
      return locale === 'fr' ? 'Limite explicite' : 'Explicit boundary';
  }
}

function assetMap(assets: SystemDetailAsset[]) {
  return new Map(assets.map((asset) => [asset.id, asset]));
}

export function GuidedDemoSystemRenderer({
  locale,
  title,
  summary,
  proofTransparency,
  presentationDocument,
  technologies,
  originTitle,
  originSummary,
  links,
  assets,
  learningEvidence = [],
  preview = false,
}: SystemDetailViewProps) {
  const { lead, sections } = splitPresentation(presentationDocument.blocks);
  const media = assetMap(assets);
  const demo = links.find((link) => link.kind === 'demo') ?? null;
  const live = links.find((link) => link.kind === 'live') ?? null;
  const supportingLinks = links.filter(
    (link) => link.kind !== 'demo' && link.kind !== 'live',
  );

  return (
    <main className="aks-guided-demo" id="system-content" tabIndex={-1}>
      <Container width="wide">
        <article className="aks-guided-demo-stack">
          <header className="aks-guided-demo-hero">
            <div className="aks-guided-demo-intro">
              <Text className="aks-proof-eyebrow" size="sm" tone="muted">
                {preview
                  ? locale === 'fr'
                    ? 'Aperçu privé · démonstration guidée'
                    : 'Private preview · guided demonstration'
                  : locale === 'fr'
                    ? 'Système · démonstration guidée'
                    : 'System · guided demonstration'}
              </Text>
              <Heading level={1} size="lg">
                {title}
              </Heading>
              <Text className="aks-guided-demo-summary" size="lg">
                {summary}
              </Text>

              <div className="aks-guided-demo-actions">
                {demo !== null ? (
                  <DeferredDemoLink locale={locale} url={demo.url} />
                ) : null}
                {live !== null ? (
                  <Link href={live.url}>
                    {locale === 'fr' ? 'Ouvrir le système' : 'Open the system'}
                  </Link>
                ) : null}
              </div>
            </div>

            <aside className="aks-guided-demo-contract">
              <Text className="aks-proof-eyebrow" size="sm" tone="muted">
                {locale === 'fr' ? 'Contrat de preuve' : 'Evidence contract'}
              </Text>
              <Text>
                {locale === 'fr'
                  ? 'Cette expérience sépare ce qui fonctionne aujourd’hui, ce qui est simulé, ce qui reste une hypothèse et ce qui demanderait une intégration future.'
                  : 'This experience separates what works today, what is simulated, what remains a hypothesis, and what would require future integration.'}
              </Text>
            </aside>
          </header>

          <SystemProofTransparency
            locale={locale}
            transparency={proofTransparency}
          />

          {originTitle !== null ? (
            <section className="aks-guided-demo-origin">
              <Text className="aks-proof-eyebrow" size="sm" tone="muted">
                {locale === 'fr' ? 'Contexte d’origine' : 'Origin context'}
              </Text>
              <Heading level={2} size="sm">
                {originTitle}
              </Heading>
              {originSummary !== null ? <Text tone="muted">{originSummary}</Text> : null}
            </section>
          ) : null}

          {lead.length > 0 ? (
            <section className="aks-guided-demo-lead" aria-label={locale === 'fr' ? 'Introduction' : 'Introduction'}>
              {lead.map((block, index) => (
                <PresentationBlockView
                  assetById={media}
                  block={block}
                  index={index}
                  key={`lead-${block.type}-${index}`}
                  locale={locale}
                />
              ))}
            </section>
          ) : null}

          <div className="aks-guided-demo-evidence">
            {sections.map((section, sectionIndex) => (
              <section className="aks-guided-demo-card" key={section.heading}>
                <div className="aks-guided-demo-card-header">
                  <span className="aks-guided-demo-status">
                    {statusForSection(section.evidenceStatus, locale)}
                  </span>
                  <Heading level={2} size="sm">
                    {section.heading}
                  </Heading>
                </div>
                <div className="aks-guided-demo-card-body">
                  {section.blocks.map((block, blockIndex) => (
                    <PresentationBlockView
                      assetById={media}
                      block={block}
                      index={sectionIndex * 100 + blockIndex}
                      key={`${section.heading}-${block.type}-${blockIndex}`}
                      locale={locale}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>

          <SystemLearningEvidence
            items={learningEvidence}
            locale={locale}
          />

          <footer className="aks-guided-demo-footer">
            {technologies.length > 0 ? (
              <section>
                <Text className="aks-proof-eyebrow" size="sm" tone="muted">
                  {locale === 'fr' ? 'Technologies vérifiables' : 'Inspectable technologies'}
                </Text>
                <ul className="aks-system-detail-tags" aria-label={locale === 'fr' ? 'Technologies utilisées' : 'Technologies'}>
                  {technologies.map((technology) => (
                    <li key={technology.id}>{technology.name}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            {supportingLinks.length > 0 ? (
              <nav aria-label={locale === 'fr' ? 'Preuves du système' : 'System evidence'} className="aks-proof-actions">
                {supportingLinks.map((link) => (
                  <Link href={link.url} key={link.id}>
                    {link.kind === 'repository'
                      ? locale === 'fr'
                        ? 'Dépôt'
                        : 'Repository'
                      : link.label ?? 'Documentation'}
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
