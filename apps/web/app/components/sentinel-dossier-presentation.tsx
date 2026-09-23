import type { PlatformLocale } from '@akiksystems/core';
import { Container, Heading, Link, Text } from '@akiksystems/ui';

type DossierSectionKey =
  | 'context'
  | 'objectives'
  | 'architecture'
  | 'design'
  | 'security'
  | 'tests'
  | 'difficulties'
  | 'results'
  | 'limits'
  | 'evidence';

interface DossierSectionDefinition {
  key: DossierSectionKey;
  en: string;
  fr: string;
}

interface DossierBlock {
  type: 'paragraph' | 'list';
  content: string | string[];
}

interface DossierSection {
  key: DossierSectionKey;
  title: string;
  blocks: DossierBlock[];
}

export interface SentinelDossierArtifact {
  locale: PlatformLocale;
  slug: string;
  title: string;
  summary: string;
  body: string | null;
  sourceAssetId: string | null;
  training: {
    slug: string;
    title: string;
  } | null;
  system: {
    href: string;
    title: string;
  } | null;
}

const sections: DossierSectionDefinition[] = [
  { key: 'context', en: 'Context', fr: 'Contexte' },
  { key: 'objectives', en: 'Objectives', fr: 'Objectifs' },
  { key: 'architecture', en: 'Architecture', fr: 'Architecture' },
  { key: 'design', en: 'Design choices', fr: 'Choix de conception' },
  { key: 'security', en: 'Security', fr: 'Sécurité' },
  { key: 'tests', en: 'Tests', fr: 'Tests' },
  { key: 'difficulties', en: 'Difficulties', fr: 'Difficultés' },
  { key: 'results', en: 'Results', fr: 'Résultats' },
  { key: 'limits', en: 'Limits', fr: 'Limites' },
  { key: 'evidence', en: 'Evidence', fr: 'Preuves' },
];

function sectionKey(title: string, locale: PlatformLocale): DossierSectionKey | null {
  const normalized = title.trim().toLocaleLowerCase(locale);
  const match = sections.find(
    (section) => section[locale].toLocaleLowerCase(locale) === normalized,
  );
  return match?.key ?? null;
}

function parseBlocks(value: string): DossierBlock[] {
  const blocks: DossierBlock[] = [];
  const paragraphs: string[] = [];
  let list: string[] = [];

  const flushParagraphs = () => {
    if (paragraphs.length === 0) return;
    blocks.push({ type: 'paragraph', content: paragraphs.join(' ') });
    paragraphs.length = 0;
  };

  const flushList = () => {
    if (list.length === 0) return;
    blocks.push({ type: 'list', content: list });
    list = [];
  };

  for (const rawLine of value.split('\n')) {
    const line = rawLine.trim();
    if (line === '') {
      flushParagraphs();
      flushList();
      continue;
    }

    if (line.startsWith('- ')) {
      flushParagraphs();
      list.push(line.slice(2).trim());
      continue;
    }

    flushList();
    paragraphs.push(line);
  }

  flushParagraphs();
  flushList();
  return blocks;
}

function parseDossierSections(
  body: string | null,
  locale: PlatformLocale,
): DossierSection[] {
  if (body === null || body.trim() === '') return [];

  const parsed = body
    .split(/^##\s+/m)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const newline = chunk.indexOf('\n');
      const title = newline === -1 ? chunk : chunk.slice(0, newline).trim();
      const content = newline === -1 ? '' : chunk.slice(newline + 1).trim();
      const key = sectionKey(title, locale);
      if (key === null) return null;
      return { key, title, blocks: parseBlocks(content) };
    })
    .filter((section): section is DossierSection => section !== null);

  const byKey = new Map(parsed.map((section) => [section.key, section]));
  return sections
    .map((definition) => byKey.get(definition.key))
    .filter((section): section is DossierSection => section !== undefined);
}

function trainingHref(locale: PlatformLocale, slug: string): string {
  return locale === 'fr'
    ? `/${locale}/apprentissage/${slug}`
    : `/${locale}/learning/${slug}`;
}

export function isSentinelDossierArtifact(
  locale: PlatformLocale,
  slug: string,
): boolean {
  return (
    (locale === 'en' && slug === 'sentinel-dwwm-project-dossier') ||
    (locale === 'fr' && slug === 'dossier-projet-dwwm-sentinel')
  );
}

export function SentinelDossierPresentation({
  artifact,
  overviewHref,
  sourceHref,
}: {
  artifact: SentinelDossierArtifact;
  overviewHref: string;
  sourceHref: string;
}) {
  const parsedSections = parseDossierSections(artifact.body, artifact.locale);
  const locale = artifact.locale;
  const expectedCount = sections.length;

  return (
    <main className="aks-proof-page aks-dossier-page">
      <Container>
        <article className="aks-dossier">
          <header className="aks-dossier-hero">
            <div className="aks-proof-stack">
              <Text className="aks-proof-eyebrow" size="sm" tone="muted">
                {locale === 'fr'
                  ? 'Dossier DWWM · lecture Web native'
                  : 'DWWM dossier · native Web reading'}
              </Text>
              <Heading level={1} size="lg">
                {artifact.title}
              </Heading>
              <Text className="aks-dossier-lead">{artifact.summary}</Text>
            </div>

            <dl className="aks-dossier-facts">
              <div>
                <dt>{locale === 'fr' ? 'Lecture' : 'Reading'}</dt>
                <dd>
                  {locale === 'fr'
                    ? `${expectedCount} angles d’inspection`
                    : `${expectedCount} inspection angles`}
                </dd>
              </div>
              <div>
                <dt>{locale === 'fr' ? 'Baseline' : 'Baseline'}</dt>
                <dd>v1.0.0-rc.9</dd>
              </div>
              <div>
                <dt>{locale === 'fr' ? 'Source PDF' : 'Source PDF'}</dt>
                <dd>
                  {artifact.sourceAssetId === null
                    ? locale === 'fr'
                      ? 'Non publiée'
                      : 'Not published'
                    : locale === 'fr'
                      ? 'Disponible'
                      : 'Available'}
                </dd>
              </div>
            </dl>
          </header>

          <section
            className="aks-dossier-context"
            aria-labelledby="dossier-context-links"
          >
            <div className="aks-dossier-section-heading">
              <Text className="aks-proof-eyebrow" size="sm" tone="muted">
                {locale === 'fr' ? 'Relations' : 'Relationships'}
              </Text>
              <Heading id="dossier-context-links" level={2} size="sm">
                {locale === 'fr'
                  ? 'Contexte distinct, preuve connectée'
                  : 'Distinct context, connected evidence'}
              </Heading>
            </div>
            <div className="aks-dossier-context-grid">
              {artifact.training !== null ? (
                <div className="aks-dossier-context-card">
                  <Text size="sm" tone="muted">
                    {locale === 'fr' ? 'Formation' : 'Training'}
                  </Text>
                  <Link href={trainingHref(locale, artifact.training.slug)}>
                    {artifact.training.title}
                  </Link>
                </div>
              ) : null}
              {artifact.system !== null ? (
                <div className="aks-dossier-context-card">
                  <Text size="sm" tone="muted">
                    System
                  </Text>
                  <Link href={artifact.system.href}>{artifact.system.title}</Link>
                </div>
              ) : null}
            </div>
          </section>

          <div className="aks-dossier-reading-layout">
            <nav
              className="aks-dossier-nav"
              aria-label={
                locale === 'fr'
                  ? 'Sommaire du dossier'
                  : 'Dossier table of contents'
              }
            >
              <Text className="aks-proof-eyebrow" size="sm" tone="muted">
                {locale === 'fr' ? 'Sommaire' : 'Contents'}
              </Text>
              <ol className="aks-dossier-nav-list">
                {parsedSections.map((section, index) => (
                  <li key={section.key}>
                    <a href={`#dossier-${section.key}`}>
                      <span aria-hidden="true">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      {section.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>

            <div className="aks-dossier-sections">
              {parsedSections.map((section, index) => (
                <section
                  className="aks-dossier-section"
                  id={`dossier-${section.key}`}
                  key={section.key}
                >
                  <div className="aks-dossier-section-number" aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                  <div className="aks-dossier-section-content">
                    <Heading level={2} size="md">
                      {section.title}
                    </Heading>
                    {section.blocks.map((block, blockIndex) =>
                      block.type === 'paragraph' ? (
                        <Text key={blockIndex}>{block.content as string}</Text>
                      ) : (
                        <ul className="aks-dossier-list" key={blockIndex}>
                          {(block.content as string[]).map((item) => (
                            <li key={item}>
                              <Text>{item}</Text>
                            </li>
                          ))}
                        </ul>
                      ),
                    )}

                    {section.key === 'evidence' ? (
                      <div className="aks-dossier-evidence-grid">
                        {artifact.training !== null ? (
                          <div className="aks-dossier-evidence-card">
                            <Text size="sm" tone="muted">
                              {locale === 'fr'
                                ? 'Contexte de formation'
                                : 'Training context'}
                            </Text>
                            <Link href={trainingHref(locale, artifact.training.slug)}>
                              {artifact.training.title}
                            </Link>
                          </div>
                        ) : null}
                        {artifact.system !== null ? (
                          <div className="aks-dossier-evidence-card">
                            <Text size="sm" tone="muted">
                              {locale === 'fr'
                                ? 'Système inspectable'
                                : 'Inspectable System'}
                            </Text>
                            <Link href={artifact.system.href}>
                              {artifact.system.title}
                            </Link>
                          </div>
                        ) : null}
                        <div className="aks-dossier-evidence-card">
                          <Text size="sm" tone="muted">
                            {locale === 'fr'
                              ? 'Candidat d’examen'
                              : 'Examination candidate'}
                          </Text>
                          <Link href="https://github.com/AmineAKIK/sentinel-fullstack/releases/tag/v1.0.0-rc.9">
                            v1.0.0-rc.9 · ed26a25e…
                          </Link>
                        </div>
                        <div className="aks-dossier-evidence-card">
                          <Text size="sm" tone="muted">
                            {locale === 'fr' ? 'Document source' : 'Source document'}
                          </Text>
                          {artifact.sourceAssetId === null ? (
                            <Text>
                              {locale === 'fr'
                                ? 'Le PDF original sera publié séparément.'
                                : 'The original PDF will be published separately.'}
                            </Text>
                          ) : (
                            <Link href={sourceHref}>
                              {locale === 'fr'
                                ? 'Ouvrir le PDF original'
                                : 'Open original PDF'}
                            </Link>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </section>
              ))}
            </div>
          </div>

          <footer className="aks-dossier-footer">
            <Link href={overviewHref}>
              {locale === 'fr'
                ? 'Retour à Apprentissage'
                : 'Back to Learning'}
            </Link>
          </footer>
        </article>
      </Container>
    </main>
  );
}
