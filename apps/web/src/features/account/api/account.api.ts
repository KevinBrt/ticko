import type { ChangePasswordRequest, UpdateAccountRequest } from '@toppo/shared';
import { z } from 'zod';
import { apiRequest } from '../../../shared/api/http.client.ts';

/** Both answer `204 No Content`. */
const noContent = z.null();

/** Server calls about one's own account. */
export const Account = {
  async update(account: UpdateAccountRequest): Promise<void> {
    await apiRequest('/api/v1/me', { method: 'PATCH', body: account, schema: noContent });
  },

  /** Signs out every other device; this one carries on in a new session. */
  async changePassword(passwords: ChangePasswordRequest): Promise<void> {
    await apiRequest('/api/auth/change-password', {
      method: 'POST',
      body: passwords,
      schema: noContent,
    });
  },
};
