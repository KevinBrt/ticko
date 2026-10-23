import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createTextScan } from './text-scan.ts';

function isText(...chunks: number[][]): boolean {
  const scan = createTextScan();
  for (const chunk of chunks) {
    scan.push(Uint8Array.from(chunk));
  }
  return scan.end();
}

const ascii = (text: string) => Array.from(text, (character) => character.charCodeAt(0));

describe('createTextScan', () => {
  it('reads UTF-8 and 8-bit encodings as text, so that a CSV saved by Excel passes', () => {
    // "Numéro;12 €" in UTF-8.
    expect(isText([...ascii('Num'), 0xc3, 0xa9, ...ascii('ro;12 '), 0xe2, 0x82, 0xac])).toBe(true);
    // "Numéro;12 €" in Windows-1252.
    expect(isText([...ascii('Num'), 0xe9, ...ascii('ro;12 '), 0x80])).toBe(true);
    expect(isText([0x1b, ...ascii('[31mERROR'), 0x1b, ...ascii('[0m\r\n')])).toBe(true);
  });

  it('refuses a file holding a NUL byte, as binary formats do', () => {
    expect(isText([...ascii('MZ'), 0x90, 0x00, 0x03])).toBe(false);
    expect(isText(ascii('almost text'), [0x00])).toBe(false);
  });

  it('reads UTF-16 announced by its byte order mark, whole characters only', () => {
    expect(isText([0xff, 0xfe, 0x68, 0x00, 0xe9, 0x00])).toBe(true);
    expect(isText([0xfe, 0xff, 0x00, 0x68, 0x00, 0xe9])).toBe(true);
    expect(isText([0xff, 0xfe, 0x68, 0x00, 0xe9])).toBe(false);
    expect(isText([0xff, 0xfe, 0x68, 0x00, 0x00, 0x00])).toBe(false);
  });

  it('decides on the byte order mark even when it comes byte by byte', () => {
    expect(isText([0xff], [0xfe], [0x68], [0x00])).toBe(true);
    expect(isText([0x68])).toBe(true);
    expect(isText([0x00])).toBe(false);
    expect(isText()).toBe(true);
  });

  it('answers the same whatever chunks the file arrives in', () => {
    const bytes = fc.oneof(
      fc.uint8Array({ maxLength: 64 }),
      fc.uint8Array({ maxLength: 64 }).map((rest) => Uint8Array.from([0xff, 0xfe, ...rest])),
    );
    fc.assert(
      fc.property(bytes, fc.array(fc.nat({ max: 70 }), { maxLength: 6 }), (file, cuts) => {
        const scan = createTextScan();
        let from = 0;
        for (const cut of [...cuts].sort((a, b) => a - b)) {
          scan.push(file.subarray(from, Math.max(from, cut)));
          from = Math.max(from, cut);
        }
        scan.push(file.subarray(from));
        expect(scan.end()).toBe(isText(Array.from(file)));
      }),
    );
  });

  it('reads any file without a NUL byte, nor a byte order mark, as text', () => {
    fc.assert(
      fc.property(fc.uint8Array({ minLength: 1, maxLength: 64 }), (file) => {
        const withoutNul = Array.from(file, (byte) => byte || 1);
        fc.pre(!(withoutNul[0] === 0xff && withoutNul[1] === 0xfe));
        fc.pre(!(withoutNul[0] === 0xfe && withoutNul[1] === 0xff));
        expect(isText(withoutNul)).toBe(true);
      }),
    );
  });
});
