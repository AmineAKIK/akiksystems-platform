export interface ImageDimensions {
  width: number;
  height: number;
}

function readUint24LE(bytes: Uint8Array, offset: number): number {
  return (
    bytes[offset]! |
    (bytes[offset + 1]! << 8) |
    (bytes[offset + 2]! << 16)
  );
}

function readUint16BE(bytes: Uint8Array, offset: number): number {
  return (bytes[offset]! << 8) | bytes[offset + 1]!;
}

function readUint32BE(bytes: Uint8Array, offset: number): number {
  return (
    bytes[offset]! * 0x1000000 +
    (bytes[offset + 1]! << 16) +
    (bytes[offset + 2]! << 8) +
    bytes[offset + 3]!
  );
}

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...bytes.slice(offset, offset + length));
}

function positive(width: number, height: number): ImageDimensions | null {
  return width > 0 && height > 0 ? { width, height } : null;
}

function pngDimensions(bytes: Uint8Array): ImageDimensions | null {
  if (
    bytes.length < 24 ||
    ascii(bytes, 1, 3) !== 'PNG'
  ) {
    return null;
  }

  return positive(readUint32BE(bytes, 16), readUint32BE(bytes, 20));
}

function jpegDimensions(bytes: Uint8Array): ImageDimensions | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return null;
  }

  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = bytes[offset + 1]!;
    offset += 2;

    if (marker === 0xd8 || marker === 0xd9) {
      continue;
    }

    if (offset + 2 > bytes.length) return null;
    const length = readUint16BE(bytes, offset);
    if (length < 2 || offset + length > bytes.length) return null;

    const isSof =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);

    if (isSof && length >= 7) {
      return positive(
        readUint16BE(bytes, offset + 5),
        readUint16BE(bytes, offset + 3),
      );
    }

    offset += length;
  }

  return null;
}

function webpDimensions(bytes: Uint8Array): ImageDimensions | null {
  if (
    bytes.length < 30 ||
    ascii(bytes, 0, 4) !== 'RIFF' ||
    ascii(bytes, 8, 4) !== 'WEBP'
  ) {
    return null;
  }

  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const kind = ascii(bytes, offset, 4);
    const chunkSize =
      bytes[offset + 4]! |
      (bytes[offset + 5]! << 8) |
      (bytes[offset + 6]! << 16) |
      (bytes[offset + 7]! << 24);
    const data = offset + 8;

    if (kind === 'VP8X' && data + 10 <= bytes.length) {
      return positive(
        1 + readUint24LE(bytes, data + 4),
        1 + readUint24LE(bytes, data + 7),
      );
    }

    if (kind === 'VP8 ' && data + 10 <= bytes.length) {
      if (
        bytes[data + 3] === 0x9d &&
        bytes[data + 4] === 0x01 &&
        bytes[data + 5] === 0x2a
      ) {
        return positive(
          readUint16BE(new Uint8Array([bytes[data + 7]!, bytes[data + 6]!]), 0) & 0x3fff,
          readUint16BE(new Uint8Array([bytes[data + 9]!, bytes[data + 8]!]), 0) & 0x3fff,
        );
      }
    }

    if (kind === 'VP8L' && data + 5 <= bytes.length && bytes[data] === 0x2f) {
      const b0 = bytes[data + 1]!;
      const b1 = bytes[data + 2]!;
      const b2 = bytes[data + 3]!;
      const b3 = bytes[data + 4]!;
      return positive(
        1 + (((b1 & 0x3f) << 8) | b0),
        1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)),
      );
    }

    offset = data + chunkSize + (chunkSize % 2);
  }

  return null;
}

function avifDimensions(bytes: Uint8Array): ImageDimensions | null {
  for (let offset = 4; offset + 12 <= bytes.length; offset += 1) {
    if (ascii(bytes, offset, 4) !== 'ispe') continue;
    const width = readUint32BE(bytes, offset + 4);
    const height = readUint32BE(bytes, offset + 8);
    const dimensions = positive(width, height);
    if (dimensions !== null) return dimensions;
  }

  return null;
}

export function imageDimensions(
  mimeType: string,
  bytes: Uint8Array,
): ImageDimensions | null {
  switch (mimeType) {
    case 'image/png':
      return pngDimensions(bytes);
    case 'image/jpeg':
      return jpegDimensions(bytes);
    case 'image/webp':
      return webpDimensions(bytes);
    case 'image/avif':
      return avifDimensions(bytes);
    default:
      return null;
  }
}
