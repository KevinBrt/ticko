import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { RequestValidationError, serializerCompiler, validatorCompiler } from './zod.ts';

const route = { method: 'POST', url: '/api/test' } as const;

describe('validatorCompiler', () => {
  const validate = validatorCompiler({
    ...route,
    schema: z.object({ count: z.coerce.number().int() }),
    httpPart: 'body',
  });

  it('returns the parsed value', () => {
    expect(validate({ count: '3' })).toStrictEqual({ value: { count: 3 } });
  });

  it('returns a RequestValidationError listing the issues', () => {
    const result = validate({ count: 'three' });
    expect(result).toStrictEqual({ error: expect.any(RequestValidationError) });
  });

  it('refuses non-Zod schemas', () => {
    expect(() =>
      validatorCompiler({ ...route, schema: { type: 'object' }, httpPart: 'body' }),
    ).toThrow('Route schemas must be Zod schemas');
  });
});

describe('serializerCompiler', () => {
  const serialize = serializerCompiler({
    ...route,
    schema: z.object({ id: z.string() }),
    httpStatus: '200',
  });

  it('serializes only the declared fields', () => {
    expect(serialize({ id: 'a', secret: 'b' })).toBe('{"id":"a"}');
  });

  it('throws when the handler returns data that breaks the contract', () => {
    expect(() => serialize({ id: 42 })).toThrow();
  });
});
