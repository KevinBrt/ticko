import type { FastifyReply, FastifyRequest } from 'fastify';
import { CLIENT_IP_HEADER } from './auth.ts';

/** Hop-by-hop or recomputed headers that must not be copied between the two worlds. */
const SKIPPED_HEADERS = new Set([
  'connection',
  'content-length',
  'transfer-encoding',
  'keep-alive',
]);

/** Request headers as a Fetch `Headers`, with the client address set from Fastify's resolution. */
export function toFetchHeaders(request: FastifyRequest): Headers {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (value === undefined || SKIPPED_HEADERS.has(name) || name === CLIENT_IP_HEADER) {
      continue;
    }
    headers.set(name, Array.isArray(value) ? value.join(', ') : value);
  }
  headers.set(CLIENT_IP_HEADER, request.ip);
  return headers;
}

export function toFetchRequest(request: FastifyRequest, origin: string): Request {
  const hasBody =
    request.body !== undefined && request.method !== 'GET' && request.method !== 'HEAD';
  return new Request(new URL(request.url, origin), {
    method: request.method,
    headers: toFetchHeaders(request),
    ...(hasBody ? { body: JSON.stringify(request.body) } : {}),
  });
}

export function forwardSetCookies(headers: Headers, reply: FastifyReply): void {
  const cookies = headers.getSetCookie();
  if (cookies.length > 0) {
    reply.header('set-cookie', cookies);
  }
}

export async function sendFetchResponse(
  response: Response,
  reply: FastifyReply,
): Promise<FastifyReply> {
  reply.status(response.status);
  for (const [name, value] of response.headers) {
    if (name !== 'set-cookie' && !SKIPPED_HEADERS.has(name)) {
      reply.header(name, value);
    }
  }
  forwardSetCookies(response.headers, reply);
  return reply.send(await response.text());
}
