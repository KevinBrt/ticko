import { describe, expect, it } from 'vitest';
import { generateSetupCode, normalizeSetupCode, setupCodesMatch } from './setup-code.util.ts';

describe('generateSetupCode', () => {
  it('produces three groups of four unambiguous symbols', () => {
    for (let i = 0; i < 200; i++) {
      expect(generateSetupCode()).toMatch(
        /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/,
      );
    }
  });

  it('is different every time', () => {
    const codes = new Set(Array.from({ length: 1000 }, generateSetupCode));
    expect(codes.size).toBe(1000);
  });
});

describe('setupCodesMatch', () => {
  it('accepts the code however it was typed', () => {
    expect(setupCodesMatch('ABCD-EFGH-JKLM', 'abcd efgh jklm')).toBe(true);
    expect(setupCodesMatch('ABCD-EFGH-JKLM', ' ABCDEFGHJKLM ')).toBe(true);
  });

  it.each(['', 'ABCD-EFGH-JKLN', 'ABCD-EFGH', 'ABCD-EFGH-JKLM-X'])('refuses %j', (provided) => {
    expect(setupCodesMatch('ABCD-EFGH-JKLM', provided)).toBe(false);
  });

  it('normalizes to letters and digits only', () => {
    expect(normalizeSetupCode('ab-12 cd')).toBe('AB12CD');
  });
});
