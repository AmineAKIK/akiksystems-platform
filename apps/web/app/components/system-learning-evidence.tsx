import type { PlatformLocale } from '@akiksystems/core';
import { Heading, Link, Text } from '@akiksystems/ui';

export interface SystemLearningEvidenceItem {
  id: string;
  href: string;
  title: string;
  summary: string;
}

export function SystemLearningEvidence({
  locale,
  items,
}: {
  locale: PlatformLocale;
  items: SystemLearningEvidenceItem[];
}) {
  if (items.length === 0) return null;

  return (
    <section
      aria-labelledby="system-learning-evidence-heading"
      className="aks-system-learning-evidence"
    >
      <div className="aks-system-learning-evidence-heading">
        <Text className="aks-proof-eyebrow" size="sm" tone="muted">
          {locale === 'fr' ? 'Apprentissage' : 'Learning'}
        </Text>
        <Heading id="system-learning-evidence-heading" level={2} size="sm">
          {locale === 'fr'
            ? 'Preuves d’apprentissage liées'
            : 'Connected learning evidence'}
        </Heading>
        <Text tone="muted">
          {locale === 'fr'
            ? 'Ces preuves sont publiées depuis Learning et reliées à ce System. Leur contexte de formation reste distinct et inspectable sur leur propre page.'
            : 'These published Learning artifacts are connected to this System. Their Training context stays distinct and inspectable on each evidence page.'}
        </Text>
      </div>

      <div className="aks-system-learning-evidence-grid">
        {items.map((item) => (
          <article className="aks-system-learning-evidence-card" key={item.id}>
            <div className="aks-proof-stack">
              <Heading level={3} size="sm">
                {item.title}
              </Heading>
              <Text>{item.summary}</Text>
              <Link href={item.href}>
                {locale === 'fr'
                  ? 'Inspecter la preuve'
                  : 'Inspect learning evidence'}
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
