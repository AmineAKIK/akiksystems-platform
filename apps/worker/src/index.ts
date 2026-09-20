import { startWorker } from './runtime.js';

const connectionString = process.env.DATABASE_URL;

if (connectionString === undefined || connectionString.trim() === '') {
  throw new Error('DATABASE_URL is required to start @akiksystems/worker.');
}

const runner = await startWorker({ connectionString });

let shuttingDown = false;

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  console.info(`[worker] ${signal} received; starting graceful shutdown.`);

  await runner.stop(`Received ${signal}`);
  await runner.promise;

  console.info('[worker] graceful shutdown complete.');
}

process.once('SIGINT', () => {
  void shutdown('SIGINT');
});

process.once('SIGTERM', () => {
  void shutdown('SIGTERM');
});

await runner.promise;
