import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/** 32 symbols without look-alikes (0/O, 1/I): 5 bits each, so `byte % 32` has no bias. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const GROUPS = 3;
const GROUP_LENGTH = 4;

/**
 * A one-time code printed in the server logs at first start. Only someone with access to the
 * logs can create the first administrator, so an exposed fresh instance cannot be claimed.
 * 12 symbols = 60 bits: not guessable over the network.
 */
export function generateSetupCode(): string {
  const symbols = Array.from(randomBytes(GROUPS * GROUP_LENGTH), (byte) => ALPHABET[byte % 32]);
  const groups: string[] = [];
  for (let start = 0; start < symbols.length; start += GROUP_LENGTH) {
    groups.push(symbols.slice(start, start + GROUP_LENGTH).join(''));
  }
  return groups.join('-');
}

/** Ignores case, spaces and dashes, so a code typed from a terminal is accepted as shown. */
export function normalizeSetupCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Constant-time comparison: response timing reveals nothing about the expected code. */
export function setupCodesMatch(expected: string, provided: string): boolean {
  const digest = (code: string) => createHash('sha256').update(normalizeSetupCode(code)).digest();
  return timingSafeEqual(digest(expected), digest(provided));
}
