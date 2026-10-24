import { describe, expect, it } from 'vitest';
import { issueLabelsRequestSchema, LABEL_NAME_MAX_LENGTH, labelsRequestSchema } from './labels.ts';

const ID = '01a1569b-9900-7000-8000-000000001101';

describe('labelsRequestSchema', () => {
  it('saves a list without a default, each name trimmed', () => {
    expect(
      labelsRequestSchema.parse({ labels: [{ name: ' Mobile ', color: 'blue' }], removed: [] }),
    ).toStrictEqual({ labels: [{ name: 'Mobile', color: 'blue' }], removed: [] });
    expect(labelsRequestSchema.safeParse({ labels: [], removed: [ID] }).success).toBe(true);
  });

  it('refuses a name twice whatever the case, a long one, or a label kept and removed', () => {
    const named = (...names: string[]) => names.map((name) => ({ name, color: 'gray' }));
    expect(
      labelsRequestSchema.safeParse({ labels: named('Docs', 'DOCS'), removed: [] }).success,
    ).toBe(false);
    expect(
      labelsRequestSchema.safeParse({
        labels: named('x'.repeat(LABEL_NAME_MAX_LENGTH + 1)),
        removed: [],
      }).success,
    ).toBe(false);
    expect(
      labelsRequestSchema.safeParse({
        labels: [{ id: ID, name: 'Docs', color: 'gray' }],
        removed: [ID],
      }).success,
    ).toBe(false);
  });
});

describe('issueLabelsRequestSchema', () => {
  it('gives each label once', () => {
    expect(issueLabelsRequestSchema.safeParse({ labelIds: [ID] }).success).toBe(true);
    expect(issueLabelsRequestSchema.safeParse({ labelIds: [ID, ID] }).success).toBe(false);
  });
});
