import { describe, expect, it } from 'vitest';
import { decodeText } from './text-decoding.util.ts';

const bytes = (...values: number[]) => Uint8Array.from(values).buffer;

describe('decodeText', () => {
  it('reads UTF-8, without its byte order mark', () => {
    expect(decodeText(new TextEncoder().encode('Numéro;12 €').buffer)).toBe('Numéro;12 €');
    expect(decodeText(bytes(0xef, 0xbb, 0xbf, 0x61))).toBe('a');
  });

  it('reads UTF-16 announced by its byte order mark, either way round', () => {
    expect(decodeText(bytes(0xff, 0xfe, 0x68, 0x00, 0xe9, 0x00))).toBe('hé');
    expect(decodeText(bytes(0xfe, 0xff, 0x00, 0x68, 0x00, 0xe9))).toBe('hé');
  });

  it('reads anything else as Windows-1252, as Excel saves a CSV', () => {
    // "Numéro;12 €" in Windows-1252: é is 0xE9, € is 0x80.
    expect(
      decodeText(bytes(0x4e, 0x75, 0x6d, 0xe9, 0x72, 0x6f, 0x3b, 0x31, 0x32, 0x20, 0x80)),
    ).toBe('Numéro;12 €');
  });
});
