import { type Db, schema, uuidv7 } from '@ticko/db';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@ticko/shared';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';

export const AUTH_BASE_PATH = '/api/auth';

/**
 * Better Auth trusts `X-Forwarded-For` by default, which any client can forge to dodge rate
 * limits. The server overwrites this header with the address Fastify resolved (which honors
 * `TICKO_TRUST_PROXY`) and Better Auth reads only this one.
 */
export const CLIENT_IP_HEADER = 'x-ticko-client-ip';

const DAY_SECONDS = 24 * 60 * 60;

export interface AuthOptions {
  db: Db;
  secret: string;
  publicUrl: URL;
}

export function createAuth({ db, secret, publicUrl }: AuthOptions) {
  return betterAuth({
    appName: 'Ticko',
    baseURL: publicUrl.origin,
    basePath: AUTH_BASE_PATH,
    secret,
    trustedOrigins: [publicUrl.origin],
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: {
        user: schema.users,
        session: schema.sessions,
        account: schema.accounts,
        verification: schema.verifications,
        rateLimit: schema.rateLimits,
      },
    }),
    emailAndPassword: {
      enabled: true,
      // Accounts are created by the first-run wizard and, later, by administrators.
      disableSignUp: true,
      minPasswordLength: PASSWORD_MIN_LENGTH,
      maxPasswordLength: PASSWORD_MAX_LENGTH,
    },
    session: {
      expiresIn: 30 * DAY_SECONDS,
      updateAge: DAY_SECONDS,
    },
    rateLimit: {
      // Off by default outside production: always on here, tests included.
      enabled: true,
      storage: 'database',
      window: 60,
      max: 100,
      customRules: {
        '/sign-in/email': { window: 60, max: 5 },
      },
    },
    advanced: {
      cookiePrefix: 'ticko',
      // Explicit: Better Auth would otherwise force Secure cookies in production, breaking
      // plain-HTTP installs on a LAN.
      useSecureCookies: publicUrl.protocol === 'https:',
      database: { generateId: () => uuidv7() },
      ipAddress: { ipAddressHeaders: [CLIENT_IP_HEADER] },
    },
    telemetry: { enabled: false },
  });
}

export type Auth = ReturnType<typeof createAuth>;
