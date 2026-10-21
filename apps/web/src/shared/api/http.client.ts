import { apiErrorSchema } from '@toppo/shared';
import { z } from 'zod';

/** A failed API call, with the stable error code the server or Better Auth returned. */
export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
  }
}

/** Better Auth answers errors as `{ code, message }` rather than Toppo's envelope. */
const betterAuthErrorSchema = z.object({ code: z.string(), message: z.string() });

export interface ApiRequestOptions<T> {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Every response is validated: the UI never works on data of an unexpected shape. */
  schema: z.ZodType<T>;
}

export async function apiRequest<T>(
  path: string,
  { method = 'GET', body, schema }: ApiRequestOptions<T>,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: {
        accept: 'application/json',
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch (error) {
    throw new ApiRequestError(0, 'NETWORK_ERROR', 'The server cannot be reached', { cause: error });
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw toApiRequestError(response.status, payload);
  }
  return schema.parse(payload);
}

function toApiRequestError(status: number, payload: unknown): ApiRequestError {
  if (status === 429) {
    return new ApiRequestError(status, 'TOO_MANY_REQUESTS', 'Too many requests');
  }
  const toppo = apiErrorSchema.safeParse(payload);
  if (toppo.success) {
    return new ApiRequestError(status, toppo.data.error.code, toppo.data.error.message);
  }
  const betterAuth = betterAuthErrorSchema.safeParse(payload);
  if (betterAuth.success) {
    return new ApiRequestError(status, betterAuth.data.code, betterAuth.data.message);
  }
  return new ApiRequestError(status, 'UNEXPECTED_RESPONSE', `HTTP ${status}`);
}
