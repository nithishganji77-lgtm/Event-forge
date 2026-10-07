import { detectImageMimeType } from '../src/utils/detectImageMimeType.js';

describe('detectImageMimeType', () => {
  it('recognizes a real JPEG by its magic bytes', () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
    expect(detectImageMimeType(jpeg)).toBe('image/jpeg');
  });

  it('recognizes a real PNG by its magic bytes', () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
    expect(detectImageMimeType(png)).toBe('image/png');
  });

  it('recognizes a real WebP by its RIFF/WEBP markers', () => {
    const webp = Buffer.concat([
      Buffer.from('RIFF', 'ascii'),
      Buffer.from([0x24, 0x00, 0x00, 0x00]),
      Buffer.from('WEBP', 'ascii'),
      Buffer.from([0x00, 0x00, 0x00, 0x00]),
    ]);
    expect(detectImageMimeType(webp)).toBe('image/webp');
  });

  it('rejects plain text content even with image-shaped framing', () => {
    expect(detectImageMimeType(Buffer.from('definitely not a real image'))).toBeNull();
  });

  it('rejects an empty or too-short buffer without throwing', () => {
    expect(detectImageMimeType(Buffer.alloc(0))).toBeNull();
    expect(detectImageMimeType(Buffer.from([0xff, 0xd8]))).toBeNull();
    expect(detectImageMimeType(null)).toBeNull();
  });

  it('rejects a RIFF file that is not actually WebP (e.g. a WAV file)', () => {
    const wav = Buffer.concat([
      Buffer.from('RIFF', 'ascii'),
      Buffer.from([0x24, 0x00, 0x00, 0x00]),
      Buffer.from('WAVE', 'ascii'),
      Buffer.from([0x00, 0x00, 0x00, 0x00]),
    ]);
    expect(detectImageMimeType(wav)).toBeNull();
  });
});
