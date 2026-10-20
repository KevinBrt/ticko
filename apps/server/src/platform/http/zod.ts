import type {
  FastifySchemaCompiler,
  FastifySerializerCompiler,
  FastifyTypeProvider,
} from 'fastify';
import { z } from 'zod';

/** Lets Fastify infer request and reply types from the Zod schemas declared on a route. */
export interface ZodTypeProvider extends FastifyTypeProvider {
  validator: this['schema'] extends z.ZodType ? z.output<this['schema']> : unknown;
  serializer: this['schema'] extends z.ZodType ? z.input<this['schema']> : unknown;
}

/** Returned by the validator compiler; the error handler turns it into a 400 response. */
export class RequestValidationError extends Error {
  readonly issues: readonly z.core.$ZodIssue[];
  /** Set by Fastify to the request part that failed: `body`, `params`, `querystring` or `headers`. */
  validationContext?: string;

  constructor(issues: readonly z.core.$ZodIssue[]) {
    super('Request validation failed');
    this.name = 'RequestValidationError';
    this.issues = issues;
  }
}

function assertZodSchema(schema: unknown): asserts schema is z.ZodType {
  if (!(schema instanceof z.ZodType)) {
    throw new TypeError('Route schemas must be Zod schemas');
  }
}

export const validatorCompiler: FastifySchemaCompiler<unknown> = ({ schema }) => {
  assertZodSchema(schema);
  return (data) => {
    const result = schema.safeParse(data);
    return result.success
      ? { value: result.data }
      : { error: new RequestValidationError(result.error.issues) };
  };
};

/**
 * Parses every response through its schema before sending it. Unknown fields are stripped,
 * so a handler can never leak a column it forgot to remove (password hash, internal flags…).
 */
export const serializerCompiler: FastifySerializerCompiler<unknown> = ({ schema }) => {
  assertZodSchema(schema);
  return (data) => JSON.stringify(schema.parse(data));
};
