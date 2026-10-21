import {
  type AssignableRolesResponse,
  assignableRolesResponseSchema,
  type UserSummary,
  usersResponseSchema,
} from '@toppo/shared';
import { z } from 'zod';
import { apiRequest } from '../../../shared/api/http.client.ts';

/** Commands answer `204 No Content`. */
const noContent = z.null();

const userPath = (userId: string) => `/api/v1/users/${encodeURIComponent(userId)}`;

/** Server calls about the accounts of the instance, for holders of `instance.users.manage`. */
export const Users = {
  async list(): Promise<UserSummary[]> {
    return (await apiRequest('/api/v1/users', { schema: usersResponseSchema })).users;
  },

  /** The instance roles users can be given. */
  async assignableRoles(): Promise<AssignableRolesResponse['roles']> {
    return (await apiRequest('/api/v1/users/roles', { schema: assignableRolesResponseSchema }))
      .roles;
  },

  async changeRole(userId: string, roleId: string): Promise<void> {
    await apiRequest(userPath(userId), { method: 'PATCH', body: { roleId }, schema: noContent });
  },

  async deactivate(userId: string): Promise<void> {
    await apiRequest(`${userPath(userId)}/deactivate`, { method: 'POST', schema: noContent });
  },

  async reactivate(userId: string): Promise<void> {
    await apiRequest(`${userPath(userId)}/reactivate`, { method: 'POST', schema: noContent });
  },
};
