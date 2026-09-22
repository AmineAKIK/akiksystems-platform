import type { PlatformLocale } from '@akiksystems/core';
import { Link, Text } from '@akiksystems/ui';

export function DeferredDemoLink({
  locale,
  url,
}: {
  locale: PlatformLocale;
  url: string;
}) {
  return (
    <details
      className="aks-deferred-demo"
      data-demo-loading="deferred"
    >
      <summary>
        {locale === 'fr' ? 'Préparer la démo' : 'Prepare demo'}
      </summary>
      <div className="aks-deferred-demo-body">
        <Text size="sm" tone="muted">
          {locale === 'fr'
            ? 'Aucun contenu tiers n’est chargé sur cette page. La démo externe ne s’ouvre qu’après votre action.'
            : 'No third-party demo content is loaded on this page. The external demo opens only after your action.'}
        </Text>
        <Link
          href={url}
          rel="noopener noreferrer external"
          target="_blank"
        >
          {locale === 'fr' ? 'Ouvrir la démo' : 'Open demo'}
        </Link>
      </div>
    </details>
  );
}
