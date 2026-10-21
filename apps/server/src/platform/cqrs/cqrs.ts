import type { Db } from '@toppo/db';
import type { CurrentUser } from '@toppo/shared';
import type { FastifyBaseLogger } from 'fastify';
import type { z } from 'zod';
import { HttpError } from '../http/http-error.ts';
import { RequestValidationError } from '../http/zod.ts';

/** The transaction a command runs in. */
export type Transaction = Parameters<Parameters<Db['transaction']>[0]>[0];

/**
 * Who may run a command or query:
 * - `public`: anyone, signed in or not;
 * - `authenticated`: a signed-in user, available as `actor`.
 * Permission checks (`{ permission: 'issue.update' }`) arrive with the permission model.
 */
export type Access = 'public' | 'authenticated';

/** Capabilities and settings commands may need besides the database. Built once in `app.ts`. */
export interface Services {
  /** Hashes a password exactly as Better Auth verifies it. */
  hashPassword(password: string): Promise<string>;
  /** First-run code accepted by the setup wizard (printed in the logs or `TOPPO_SETUP_CODE`). */
  setupCode: string;
}

/** What every command and query runs with: per HTTP request today, per plugin call later. */
export interface ExecutionContext {
  db: Db;
  actor: CurrentUser | null;
  log: FastifyBaseLogger;
  services: Services;
}

interface Scope {
  actor: CurrentUser | null;
  log: FastifyBaseLogger;
  services: Services;
}

/** A command reads and writes through `tx` only: everything it does commits or rolls back together. */
export interface CommandScope extends Scope {
  tx: Transaction;
}

/** A query reads through `db` and never writes. */
export interface QueryScope extends Scope {
  db: Db;
}

interface Definition<Input extends z.ZodType> {
  /** `resource.action`, used in logs: `setup.complete`, `issue.create`. */
  name: string;
  access: Access;
  /** Validated on every call, including from callers other than HTTP routes. */
  input: Input;
}

export interface CommandDefinition<Input extends z.ZodType, Output> extends Definition<Input> {
  handler(scope: CommandScope, input: z.output<Input>): Promise<Output>;
}

export interface QueryDefinition<Input extends z.ZodType, Output> extends Definition<Input> {
  handler(scope: QueryScope, input: z.output<Input>): Promise<Output>;
}

export interface Operation<Input extends z.ZodType, Output> {
  name: string;
  execute(context: ExecutionContext, input: z.input<Input>): Promise<Output>;
}

/**
 * A state change: access checked, input validated, then the handler runs in one transaction.
 * Return at most what the caller needs to go on (an id), not a read model: that is a query's job.
 */
export function defineCommand<Input extends z.ZodType, Output>(
  definition: CommandDefinition<Input, Output>,
): Operation<Input, Output> {
  return {
    name: definition.name,
    async execute(context, rawInput) {
      const input = prepare(definition, context, rawInput);
      const log = context.log.child({ command: definition.name });
      return await context.db.transaction((tx) =>
        definition.handler({ tx, actor: context.actor, log, services: context.services }, input),
      );
    },
  };
}

/** A read: access checked, input validated, no transaction, no write. */
export function defineQuery<Input extends z.ZodType, Output>(
  definition: QueryDefinition<Input, Output>,
): Operation<Input, Output> {
  return {
    name: definition.name,
    async execute(context, rawInput) {
      const input = prepare(definition, context, rawInput);
      const log = context.log.child({ query: definition.name });
      return await definition.handler(
        { db: context.db, actor: context.actor, log, services: context.services },
        input,
      );
    },
  };
}

/** Access first: an anonymous caller learns nothing, not even what input is expected. */
function prepare<Input extends z.ZodType>(
  definition: Definition<Input>,
  context: ExecutionContext,
  rawInput: unknown,
): z.output<Input> {
  if (definition.access === 'authenticated' && !context.actor) {
    throw new HttpError(401, 'UNAUTHENTICATED', 'Authentication required');
  }
  const result = definition.input.safeParse(rawInput);
  if (!result.success) {
    const error = new RequestValidationError(result.error.issues);
    error.validationContext = 'input';
    throw error;
  }
  return result.data;
}
