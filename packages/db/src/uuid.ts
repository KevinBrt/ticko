import { randomFillSync } from 'node:crypto';

/**
 * Generates a UUID version 7 (RFC 9562): 48 bits of Unix time in milliseconds, then random bits.
 * Ids sort by creation time, which keeps B-tree indexes compact. Generated here because
 * PostgreSQL only has `uuidv7()` from version 18 and Toppo supports 16+.
 */
export function uuidv7(now: number = Date.now()): string {
  const bytes = randomFillSync(new Uint8Array(16));
  const view = new DataView(bytes.buffer);
  view.setUint16(0, Math.floor(now / 2 ** 32));
  view.setUint32(2, now % 2 ** 32);
  view.setUint8(6, (view.getUint8(6) & 0x0f) | 0x70);
  view.setUint8(8, (view.getUint8(8) & 0x3f) | 0x80);

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
