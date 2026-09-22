import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const extensions: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

export const publicImageVariantWidths = [320, 640, 960, 1280] as const;

export function parsePublicImageWidth(value: string | null): number | null {
  if (value === null || value === '') return null;
  const width = Number(value);
  return publicImageVariantWidths.includes(
    width as (typeof publicImageVariantWidths)[number],
  )
    ? width
    : null;
}

export async function resizePublicImage(
  bytes: Uint8Array,
  mimeType: string,
  width: number,
): Promise<Uint8Array> {
  const extension = extensions[mimeType];
  if (extension === undefined) {
    throw new Error(`Unsupported responsive image type: ${mimeType}`);
  }

  const directory = await mkdtemp(path.join(tmpdir(), 'aks-image-'));
  const input = path.join(directory, `input.${extension}`);
  const output = path.join(directory, `output.${extension}`);

  try {
    await writeFile(input, bytes);
    await execFileAsync('vipsthumbnail', [
      input,
      '--size',
      `${width}x>`,
      '--output',
      output,
    ]);
    return new Uint8Array(await readFile(output));
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
}
