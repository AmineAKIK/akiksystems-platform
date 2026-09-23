import { bootstrapDwwmTraining } from '@akiksystems/db';

import { appDb } from '../app/lib/db.server';

try {
  const result = await bootstrapDwwmTraining(appDb);
  process.stdout.write(
    result.created
      ? `DWWM Training bootstrap completed: ${result.trainingId}.\n`
      : `DWWM Training bootstrap skipped: Training already exists as ${result.trainingId}.\n`,
  );
} finally {
  await appDb.destroy();
}
