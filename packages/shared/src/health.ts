import { z } from 'zod';

const checkStatusSchema = z.enum(['ok', 'error']);

/** Body of `GET /health`, used by Docker, orchestrators and reverse proxies. */
export const healthResponseSchema = z.object({
  status: checkStatusSchema,
  checks: z.object({
    database: checkStatusSchema,
  }),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
