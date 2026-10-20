import { describe, expect, it } from 'vitest';
import { projectKeySchema } from './project-key.ts';

describe('projectKeySchema', () => {
  it.each(['WEB', 'API', 'A1', 'ABCDEFGHIJ', 'V2API'])('accepts %s', (key) => {
    expect(projectKeySchema.safeParse(key).success).toBe(true);
  });

  it.each([
    ['', 'empty'],
    ['A', 'too short'],
    ['ABCDEFGHIJK', 'too long'],
    ['web', 'lowercase'],
    ['1API', 'starts with a digit'],
    ['WEB-1', 'contains a dash'],
    ['WÉB', 'contains a non-ASCII letter'],
    [' WEB', 'contains whitespace'],
  ])('rejects %j (%s)', (key) => {
    expect(projectKeySchema.safeParse(key).success).toBe(false);
  });
});
