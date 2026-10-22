import {
  type AssignableRolesResponse,
  assignableRolesResponseSchema,
  type ProjectCandidatesResponse,
  type ProjectMembersQuery,
  type ProjectMembersResponse,
  projectCandidatesResponseSchema,
  projectMembersResponseSchema,
} from '@toppo/shared';
import { z } from 'zod';
import { apiRequest } from '../../../shared/api/http.client.ts';
import { projectPath } from './projects.api.ts';

/** Commands answer `204 No Content`. */
const noContent = z.null();

const memberPath = (key: string, userId: string) =>
  `${projectPath(key)}/members/${encodeURIComponent(userId)}`;

/** Server calls about who has access to a project, for holders of `project.members.manage`. */
export const ProjectMembers = {
  async list(key: string, { search, page }: ProjectMembersQuery): Promise<ProjectMembersResponse> {
    const params = new URLSearchParams();
    if (search) {
      params.set('search', search);
    }
    if (page && page > 1) {
      params.set('page', String(page));
    }
    const query = params.size > 0 ? `?${params}` : '';
    return await apiRequest(`${projectPath(key)}/members${query}`, {
      schema: projectMembersResponseSchema,
    });
  },

  /** People who could join: active members of the instance not in the project yet. */
  async candidates(key: string, search: string): Promise<ProjectCandidatesResponse['people']> {
    const query = search ? `?${new URLSearchParams({ search })}` : '';
    return (
      await apiRequest(`${projectPath(key)}/candidates${query}`, {
        schema: projectCandidatesResponseSchema,
      })
    ).people;
  },

  /** The roles the caller may give there: none granting more than they hold. */
  async roles(key: string): Promise<AssignableRolesResponse['roles']> {
    return (
      await apiRequest(`${projectPath(key)}/roles`, { schema: assignableRolesResponseSchema })
    ).roles;
  },

  /** `roleId` null: their own role applies in the project. */
  async add(key: string, userIds: string[], roleId: string | null): Promise<void> {
    await apiRequest(`${projectPath(key)}/members`, {
      method: 'POST',
      body: { userIds, roleId },
      schema: noContent,
    });
  },

  async changeRole(key: string, userId: string, roleId: string | null): Promise<void> {
    await apiRequest(memberPath(key, userId), {
      method: 'PATCH',
      body: { roleId },
      schema: noContent,
    });
  },

  async remove(key: string, userId: string): Promise<void> {
    await apiRequest(memberPath(key, userId), { method: 'DELETE', schema: noContent });
  },
};
