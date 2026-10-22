import { randomFillSync, randomInt } from 'node:crypto';

/** A new millisecond's counter starts in the lower half: room for 2,048 more ids in it. */
const COUNTER_START_MAX = 0x800;
const COUNTER_MAX = 0xfff;

let lastTime = Number.NaN;
let counter = 0;

/**
 * Generates a UUID version 7 (RFC 9562): 48 bits of Unix time in milliseconds, a 12-bit counter,
 * then random bits. Ids sort by creation time, which keeps B-tree indexes compact; within one
 * millisecond the counter keeps them in the order they were made (RFC 9562, method 1), so rows
 * written together, such as the activities of one change, read back in order. Generated here
 * because PostgreSQL only has `uuidv7()` from version 18 and Toppo supports 16+.
 */
export function uuidv7(now: number = Date.now()): string {
  counter = now === lastTime && counter < COUNTER_MAX ? counter + 1 : randomInt(COUNTER_START_MAX);
  lastTime = now;
  const bytes = randomFillSync(new Uint8Array(16));
  const view = new DataView(bytes.buffer);
  view.setUint16(0, Math.floor(now / 2 ** 32));
  view.setUint32(2, now % 2 ** 32);
  view.setUint16(6, 0x7000 | counter);
  view.setUint8(8, (view.getUint8(8) & 0x3f) | 0x80);

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
