import type { PublishedLegalPage } from '@akiksystems/db';
import { Container, Heading } from '@akiksystems/ui';

import { WritingEditorialRenderer } from './writing-editorial-renderer';

export function LegalPageView({ page }: { page: PublishedLegalPage }) {
  return (
    <main className="aks-legal-page">
      <Container width="wide">
        <article className="aks-writing-reader aks-proof-stack">
          <Heading level={1} size="lg">
            {page.title}
          </Heading>
          <WritingEditorialRenderer
            assetHref={() => {
              throw new Error('Legal pages do not support contextual assets.');
            }}
            assets={[]}
            document={page.document}
            locale={page.locale}
          />
        </article>
      </Container>
    </main>
  );
}
