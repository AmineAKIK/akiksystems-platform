import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const clientDirectory = fileURLToPath(new URL('../build/client/', import.meta.url));

const forbiddenMarkers = [
  'postgres://',
  'postgresql://',
  'AKIKSYSTEMS_SECRET_SENTINEL',
];

const serverSecretValues = [
  process.env.DATABASE_URL,
  process.env.BETTER_AUTH_SECRET,
  process.env.ADMIN_PASSWORD,
].filter(
  /** @returns {value is string} */
  (value) => typeof value === 'string' && value.length >= 8,
);

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

  for (const marker of forbiddenMarkers) {
    if (content.includes(marker)) {
      throw new Error(`Client bundle contains forbidden server marker "${marker}" in ${file}.`);
    }
  }

  for (const secret of serverSecretValues) {
    if (content.includes(secret)) {
      throw new Error(`Client bundle contains a server-only secret value in ${file}.`);
    }
  }
}

process.stdout.write('Client bundle contains no server-only secret values.\n');
