import {
  type AssignableRolesResponse,
  assignableRolesResponseSchema,
  type MembersQuery,
  type MembersResponse,
  membersResponseSchema,
} from '@toppo/shared';
import { z } from 'zod';
import { apiRequest } from '../../../shared/api/http.client.ts';

/** Commands answer `204 No Content`. */
const noContent = z.null();

const userPath = (userId: string) => `/api/v1/users/${encodeURIComponent(userId)}`;

/** Server calls about the members of the instance, for holders of `instance.users.manage`. */
export const Users = {
  /** One page of members and pending invitations: the server searches, filters and sorts. */
  async members({ role, search, page }: MembersQuery): Promise<MembersResponse> {
    const params = new URLSearchParams();
    if (role) {
      params.set('role', role);
    }
    if (search) {
      params.set('search', search);
    }
    if (page && page > 1) {
      params.set('page', String(page));
    }
    const query = params.size > 0 ? `?${params}` : '';
    return await apiRequest(`/api/v1/members${query}`, { schema: membersResponseSchema });
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

  /** Erases the member for good; history keeps an anonymous author. */
  async delete(userId: string): Promise<void> {
    await apiRequest(userPath(userId), { method: 'DELETE', schema: noContent });
  },

  async reactivate(userId: string): Promise<void> {
    await apiRequest(`${userPath(userId)}/reactivate`, { method: 'POST', schema: noContent });
  },
};
