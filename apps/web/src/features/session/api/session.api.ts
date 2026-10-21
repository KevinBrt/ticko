import {
  type CurrentUser,
  meResponseSchema,
  type SetupRequest,
  setupResponseSchema,
  setupStatusResponseSchema,
} from '@toppo/shared';
import { z } from 'zod';
import { apiRequest } from '../../../shared/api/http.client.ts';

/** Server calls about the first-run setup and who is signed in. */
export const Session = {
  /** Whether the first-run wizard still has to run. */
  async isSetupRequired(): Promise<boolean> {
    return (await apiRequest('/api/v1/setup', { schema: setupStatusResponseSchema })).required;
  },

  /** Creates the instance's first administrator. */
  async completeSetup(request: SetupRequest): Promise<void> {
    await apiRequest('/api/v1/setup', {
      method: 'POST',
      body: request,
      schema: setupResponseSchema,
    });
  },

  /** The signed-in user, or `null` when nobody is. */
  async currentUser(): Promise<CurrentUser | null> {
    return (await apiRequest('/api/v1/me', { schema: meResponseSchema })).user;
  },

  async signIn(email: string, password: string): Promise<void> {
    await apiRequest('/api/auth/sign-in/email', {
      method: 'POST',
      body: { email, password },
      schema: z.unknown(),
    });
  },

  async signOut(): Promise<void> {
    await apiRequest('/api/auth/sign-out', { method: 'POST', body: {}, schema: z.unknown() });
  },
};
