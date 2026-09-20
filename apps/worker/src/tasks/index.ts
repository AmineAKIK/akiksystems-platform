import type { TaskList } from 'graphile-worker';

import { foundationTestTask } from './foundation-test.js';

export const taskList = {
  'foundation:test': foundationTestTask,
} satisfies TaskList;
