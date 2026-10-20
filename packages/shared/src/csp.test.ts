import { describe, expect, it } from 'vitest';
import { CSP_NONCE_PLACEHOLDER } from './csp.ts';

describe('CSP_NONCE_PLACEHOLDER', () => {
  it('survives HTML attribute serialization unchanged, so the server can find and replace it', () => {
    expect(CSP_NONCE_PLACEHOLDER).toMatch(/^[A-Z0-9_]+$/);
  });

  it('cannot be mistaken for real content', () => {
    expect(CSP_NONCE_PLACEHOLDER).toMatch(/^__.+__$/);
  });
});
