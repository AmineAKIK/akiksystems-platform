import { describe, expect, it } from 'vitest';

import { imageDimensions } from './image-dimensions.server';

function writeAscii(bytes: Uint8Array, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    bytes[offset + index] = value.charCodeAt(index);
  }
}

function writeUint32BE(bytes: Uint8Array, offset: number, value: number) {
  bytes[offset] = (value >>> 24) & 0xff;
  bytes[offset + 1] = (value >>> 16) & 0xff;
  bytes[offset + 2] = (value >>> 8) & 0xff;
  bytes[offset + 3] = value & 0xff;
}

describe('imageDimensions', () => {
  it('reads PNG dimensions from the IHDR header', () => {
    const bytes = new Uint8Array(24);
    bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
    writeAscii(bytes, 12, 'IHDR');
    writeUint32BE(bytes, 16, 1440);
    writeUint32BE(bytes, 20, 900);

    expect(imageDimensions('image/png', bytes)).toEqual({
      width: 1440,
      height: 900,
    });
  });

  it('reads extended WebP canvas dimensions', () => {
    const bytes = new Uint8Array(30);
    writeAscii(bytes, 0, 'RIFF');
    writeAscii(bytes, 8, 'WEBP');
    writeAscii(bytes, 12, 'VP8X');
    bytes[16] = 10;
    const width = 1280 - 1;
    const height = 720 - 1;
    bytes[24] = width & 0xff;
    bytes[25] = (width >> 8) & 0xff;
    bytes[26] = (width >> 16) & 0xff;
    bytes[27] = height & 0xff;
    bytes[28] = (height >> 8) & 0xff;
    bytes[29] = (height >> 16) & 0xff;

    expect(imageDimensions('image/webp', bytes)).toEqual({
      width: 1280,
      height: 720,
    });
  });

  it('reads JPEG SOF dimensions', () => {
    const bytes = new Uint8Array([
      0xff, 0xd8,
      0xff, 0xc0,
      0x00, 0x11,
      0x08,
      0x02, 0xd0,
      0x05, 0x00,
      0x03,
      0x01, 0x11, 0x00,
      0x02, 0x11, 0x00,
      0x03, 0x11, 0x00,
    ]);

    expect(imageDimensions('image/jpeg', bytes)).toEqual({
      width: 1280,
      height: 720,
    });
  });

  it('reads AVIF ispe dimensions when present in the header range', () => {
    const bytes = new Uint8Array(20);
    writeAscii(bytes, 4, 'ispe');
    writeUint32BE(bytes, 8, 1024);
    writeUint32BE(bytes, 12, 768);

    expect(imageDimensions('image/avif', bytes)).toEqual({
      width: 1024,
      height: 768,
    });
  });

  it('returns null for non-image media', () => {
    expect(imageDimensions('application/pdf', new Uint8Array())).toBeNull();
  });
});
