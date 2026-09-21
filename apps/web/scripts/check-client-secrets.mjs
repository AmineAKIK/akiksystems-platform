import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const clientDirectory = fileURLToPath(new URL('../build/client/', import.meta.url));
const forbiddenTokens = [
  'DATABASE_URL',
  'BETTER_AUTH_SECRET',
  'ADMIN_PASSWORD',
  'postgres://',
  'postgresql://',
  'AKIKSYSTEMS_SECRET_SENTINEL',
];

/**
 * @param {string} directory
 * @returns {Promise<string[]>}
 */
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

  for (const token of forbiddenTokens) {
    if (content.includes(token)) {
      throw new Error(`Client bundle contains forbidden server secret marker "${token}" in ${file}.`);
    }
  }
}

process.stdout.write('Client bundle contains no server secret markers.\n');
