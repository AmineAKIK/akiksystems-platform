import { bootstrapRendreAttentionEssay } from '@akiksystems/db';

import { appDb } from '../app/lib/db.server';

try {
  const result = await bootstrapRendreAttentionEssay(appDb);
  process.stdout.write(
    `Rendre l’attention au réel bootstrap ${result.created ? 'created' : 'reused'} Writing ${result.writingId}${result.linkedSystemId ? ` and linked ProtoCap ${result.linkedSystemId}` : ''}.\n`,
  );
} finally {
  await appDb.destroy();
}
