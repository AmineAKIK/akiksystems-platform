import { Container, Heading, Link, Text } from '@akiksystems/ui';

import {
  destinationById,
  destinationHref,
  type GlobalDestinationId,
} from '../i18n/global-destinations';
import { requireExactLocale, type Locale } from '../i18n/locales';
import { buildNoIndexMeta } from '../lib/public-seo';

const copy = {
  en: {
    eyebrow: 'Code-only rebuild',
    body: 'This public surface is intentionally offline while it is rebuilt directly in code.',
    home: 'Return home',
  },
  fr: {
    eyebrow: 'Reconstruction code-only',
    body: 'Cette surface publique est volontairement hors ligne pendant sa reconstruction directement dans le code.',
    home: 'Retour à l’accueil',
  },
} as const;

export function pendingDestinationLoader(
  localeValue: string | undefined,
  expectedLocale: Locale,
  destinationId: GlobalDestinationId,
) {
  const locale = requireExactLocale(localeValue, expectedLocale);
  const destination = destinationById(destinationId);
  const alternateLocale: Locale = locale === 'en' ? 'fr' : 'en';

  return {
    locale,
    destinationId,
    localContext: {
      title: destination.label[locale],
      alternateHref: destinationHref(destinationId, alternateLocale),
    },
  };
}

export function pendingDestinationMeta(locale: Locale, destinationId: GlobalDestinationId) {
  return buildNoIndexMeta(`${destinationById(destinationId).label[locale]} · AkikSystems`);
}

export function PendingDestinationRoute({
  locale,
  destinationId,
}: {
  locale: Locale;
  destinationId: GlobalDestinationId;
}) {
  return (
    <PendingPage
      locale={locale}
      marker={destinationId}
      title={destinationById(destinationId).label[locale]}
    />
  );
}

/** A public page in preparation: not indexed, not linked, and a way back home. */
export function PendingPage({
  locale,
  marker,
  title,
}: {
  locale: Locale;
  marker: string;
  title: string;
}) {
  const labels = copy[locale];

  return (
    <main className="aks-proof-page" data-pending-destination={marker}>
      <Container>
        <div className="aks-proof-stack">
          <Text className="aks-proof-eyebrow" size="sm" tone="muted">
            {labels.eyebrow}
          </Text>
          <Heading level={1} size="lg">
            {title}
          </Heading>
          <Text tone="muted">{labels.body}</Text>
          <Link href={`/${locale}`}>{labels.home}</Link>
        </div>
      </Container>
    </main>
  );
}
