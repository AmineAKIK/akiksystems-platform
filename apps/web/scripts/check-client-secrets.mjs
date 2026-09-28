import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const clientDirectory = fileURLToPath(new URL('../build/client/', import.meta.url));

const forbiddenMarkers = [
  'DATABASE_URL',
  'postgres://',
  'postgresql://',
  'graphile-worker',
  'SECRET_ACCESS_KEY',
  'ACCESS_KEY_ID',
];

/** @param {string} directory @returns {Promise<string[]>} */
async function filesRecursively(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  /** @type {string[]} */
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await filesRecursively(entryPath)));
    } else {
      files.push(entryPath);
    }
  }

  return files;
}

const files = await filesRecursively(clientDirectory);

for (const file of files) {
  const content = await fs.readFile(file, 'utf8');

  for (const marker of forbiddenMarkers) {
    if (content.includes(marker)) {
      throw new Error(`Client bundle contains retired server marker "${marker}" in ${file}.`);
    }
  }
}

process.stdout.write('Client bundle contains no retired database, worker, or storage markers.\n');
