import { Container, Heading, Text } from '@akiksystems/ui';
import type { LegalPageContent, LegalPageId } from '../i18n/legal-pages';
import type { Locale } from '../i18n/locales';

interface LegalPageViewProps {
  content: LegalPageContent;
  id: LegalPageId;
  locale: Locale;
}

export function LegalPageView({ content, id, locale }: LegalPageViewProps) {
  return (
    <main className="aks-legal-page" data-legal-page={id}>
      <Container>
        <article className="aks-legal-document">
          <header className="aks-legal-header">
            <Text className="aks-legal-eyebrow" size="sm" tone="muted">
              {content.eyebrow}
            </Text>
            <Heading level={1} size="lg">
              {content.title}
            </Heading>
            <Text className="aks-legal-description" size="lg" tone="muted">
              {content.description}
            </Text>
            <Text className="aks-legal-updated" size="sm" tone="muted">
              {content.updatedLabel}:{' '}
              <time dateTime={content.updatedAtIso}>{content.updatedAt}</time>
            </Text>
          </header>
          <nav
            aria-label={locale === 'fr' ? 'Sommaire' : 'Table of contents'}
            className="aks-legal-toc"
          >
            <Text size="sm" tone="muted">
              {locale === 'fr' ? 'Sur cette page' : 'On this page'}
            </Text>
            <ol>
              {content.sections.map((section) => (
                <li key={section.id}>
                  <a className="aks-link" href={`#${section.id}`}>
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <div className="aks-legal-sections">
            {content.sections.map((section) => (
              <section id={section.id} key={section.id}>
                <Heading level={2} size="sm">
                  {section.title}
                </Heading>
                {section.paragraphs?.map((paragraph) => (
                  <Text key={paragraph}>{paragraph}</Text>
                ))}
                {section.items === undefined ? null : (
                  <ul>
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
          <footer className="aks-legal-document-footer">
            {/* The contact pages are in preparation: the address the notice itself publishes. */}
            <a className="aks-link" href="mailto:contact@akiksystems.com">
              {locale === 'fr' ? 'Contacter AkikSystems' : 'Contact AkikSystems'}
            </a>
          </footer>
        </article>
      </Container>
    </main>
  );
}
