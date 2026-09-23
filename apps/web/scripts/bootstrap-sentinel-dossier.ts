import { bootstrapSentinelDossier } from '@akiksystems/db';

import { appDb } from '../app/lib/db.server';

try {
  const result = await bootstrapSentinelDossier(appDb);
  process.stdout.write(
    result.created
      ? `Sentinel dossier bootstrap completed: ${result.learningArtifactId}.\n`
      : `Sentinel dossier bootstrap skipped: LearningArtifact already exists as ${result.learningArtifactId}.\n`,
  );
} finally {
  await appDb.destroy();
}
