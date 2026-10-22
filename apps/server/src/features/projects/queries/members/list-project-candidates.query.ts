import { containsText, schema } from '@toppo/db';
import {
  PICKER_RESULTS_MAX,
  type ProjectCandidatesResponse,
  pickerQuerySchema,
  projectKeyParamsSchema,
} from '@toppo/shared';
import { and, isNull, sql } from 'drizzle-orm';
import { defineQuery } from '../../../../platform/cqrs/cqrs.ts';

const { projectMembers, users } = schema;

/** The first active members of the instance matching a search, who are not in the project yet. */
export const listProjectCandidates = defineQuery({
  name: 'project.listCandidates',
  access: { project: 'projectKey', permission: 'project.members.manage' },
  input: projectKeyParamsSchema.extend(pickerQuerySchema.shape),
  async handler({ db, project }, { search }): Promise<ProjectCandidatesResponse> {
    const people = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(
        and(
          isNull(users.deletedAt),
          isNull(users.deactivatedAt),
          sql`not exists (select 1 from ${projectMembers}
            where ${projectMembers.projectId} = ${project.id} and ${projectMembers.userId} = ${users.id})`,
          search ? containsText([users.name, users.email], search) : undefined,
        ),
      )
      .orderBy(sql`lower(${users.name})`, users.id)
      .limit(PICKER_RESULTS_MAX);
    return { people };
  },
});
