import { bootstrapSentinelSystemDraft } from '@akiksystems/db';

import { appDb } from '../app/lib/db.server';

try {
  const result = await bootstrapSentinelSystemDraft(appDb);
  process.stdout.write(
    result.created
      ? `Sentinel draft bootstrap created System ${result.systemId} at position ${result.editorialPosition}.\n`
      : `Sentinel draft bootstrap reused System ${result.systemId} at position ${result.editorialPosition}.\n`,
  );
} finally {
  await appDb.destroy();
}
