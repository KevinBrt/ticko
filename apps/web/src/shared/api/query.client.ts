import { QueryClient } from '@tanstack/react-query';
import { ApiRequestError } from './http.client.ts';

const MAX_RETRIES = 2;

/** Retries transient failures only: a 4xx answer will not change by asking again. */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (failureCount, error) =>
          !(error instanceof ApiRequestError && error.status >= 400 && error.status < 500) &&
          failureCount < MAX_RETRIES,
      },
    },
  });
}
