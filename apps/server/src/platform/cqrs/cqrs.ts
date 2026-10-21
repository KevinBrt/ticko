import type { Db } from '@toppo/db';
import type { FastifyBaseLogger } from 'fastify';
import type { z } from 'zod';
import { type Access, assertAccess } from '../auth/access-control.ts';
import type { Actor } from '../auth/actor.ts';
import { RequestValidationError } from '../http/zod.ts';

/** The transaction a command runs in. */
export type Transaction = Parameters<Parameters<Db['transaction']>[0]>[0];

/** Capabilities and settings commands may need besides the database. Built once in `app.ts`. */
export interface Services {
  /** Hashes a password exactly as Better Auth verifies it. */
  hashPassword(password: string): Promise<string>;
  /** First-run code accepted by the setup wizard (printed in the logs or `TOPPO_SETUP_CODE`). */
  setupCode: string;
  /** Where users reach Toppo (`TOPPO_URL`), to build links they open, such as invitations. */
  publicUrl: URL;
}

/** What every command and query runs with: per HTTP request today, per plugin call later. */
export interface ExecutionContext {
  db: Db;
  actor: Actor | null;
  log: FastifyBaseLogger;
  services: Services;
}

/** Who runs an operation: possibly nobody when it is public, a signed-in user otherwise. */
export type ActorOf<A extends Access> = A extends 'public' ? Actor | null : Actor;

interface Scope<A extends Access> {
  actor: ActorOf<A>;
  log: FastifyBaseLogger;
  services: Services;
}

/** A command reads and writes through `tx` only: everything it does commits or rolls back together. */
export interface CommandScope<A extends Access = Access> extends Scope<A> {
  tx: Transaction;
}

/** A query reads through `db` and never writes. */
export interface QueryScope<A extends Access = Access> extends Scope<A> {
  db: Db;
}

interface Definition<Input extends z.ZodType, A extends Access> {
  /** `resource.action`, used in logs: `setup.complete`, `issue.create`. */
  name: string;
  /** Checked before anything else; the route running the operation declares the same. */
  access: A;
  /** Validated on every call, including from callers other than HTTP routes. */
  input: Input;
}

export interface CommandDefinition<Input extends z.ZodType, Output, A extends Access>
  extends Definition<Input, A> {
  handler(scope: CommandScope<A>, input: z.output<Input>): Promise<Output>;
}

export interface QueryDefinition<Input extends z.ZodType, Output, A extends Access>
  extends Definition<Input, A> {
  handler(scope: QueryScope<A>, input: z.output<Input>): Promise<Output>;
}

export interface Operation<Input extends z.ZodType, Output> {
  name: string;
  /** For the route's `config.access`, so the route and the operation cannot disagree. */
  access: Access;
  execute(context: ExecutionContext, input: z.input<Input>): Promise<Output>;
}

/**
 * A state change: access checked, input validated, then the handler runs in one transaction.
 * Return at most what the caller needs to go on (an id), not a read model: that is a query's job.
 */
export function defineCommand<Input extends z.ZodType, Output, A extends Access>(
  definition: CommandDefinition<Input, Output, A>,
): Operation<Input, Output> {
  return {
    name: definition.name,
    access: definition.access,
    async execute(context, rawInput) {
      const { actor, input } = prepare(definition, context, rawInput);
      const log = context.log.child({ command: definition.name });
      return await context.db.transaction((tx) =>
        definition.handler({ tx, actor, log, services: context.services }, input),
      );
    },
  };
}

/** A read: access checked, input validated, no transaction, no write. */
export function defineQuery<Input extends z.ZodType, Output, A extends Access>(
  definition: QueryDefinition<Input, Output, A>,
): Operation<Input, Output> {
  return {
    name: definition.name,
    access: definition.access,
    async execute(context, rawInput) {
      const { actor, input } = prepare(definition, context, rawInput);
      const log = context.log.child({ query: definition.name });
      return await definition.handler(
        { db: context.db, actor, log, services: context.services },
        input,
      );
    },
  };
}

/** Access first: a caller without access learns nothing, not even what input is expected. */
function prepare<Input extends z.ZodType, A extends Access>(
  definition: Definition<Input, A>,
  context: ExecutionContext,
  rawInput: unknown,
): { actor: ActorOf<A>; input: z.output<Input> } {
  assertAccess(definition.access, context.actor);
  const result = definition.input.safeParse(rawInput);
  if (!result.success) {
    const error = new RequestValidationError(result.error.issues);
    error.validationContext = 'input';
    throw error;
  }
  // assertAccess has just refused anonymous callers of every access but `public`.
  return { actor: context.actor as ActorOf<A>, input: result.data };
}
