import { bootstrapWorkWithUsCollaboration } from '@akiksystems/db';

import { appDb } from '../app/lib/db.server';

try {
  const result = await bootstrapWorkWithUsCollaboration(appDb);
  const published =
    result.publishedLocales.length === 0
      ? 'no new public locale'
      : `published ${result.publishedLocales
          .map((locale) => locale.toUpperCase())
          .join(', ')}`;
  const preserved =
    result.preservedDraftLocales.length === 0
      ? ''
      : `; preserved authored drafts for ${result.preservedDraftLocales
          .map((locale) => locale.toUpperCase())
          .join(', ')}`;

  process.stdout.write(
    `AKS-125 Work with us collaboration bootstrap ${result.createdPage ? 'created' : 'reused'} page ${result.pageId}; ${published}${preserved}.\n`,
  );
} finally {
  await appDb.destroy();
}
