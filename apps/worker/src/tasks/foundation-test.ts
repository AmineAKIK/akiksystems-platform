import type { Task } from 'graphile-worker';

export const foundationTestTask: Task<'foundation:test'> = async (payload, helpers) => {
  helpers.logger.info(
    `AKS-005 foundation job executed: probeId=${payload.probeId} queuedAt=${payload.queuedAt} jobId=${helpers.job.id}`,
  );
};
