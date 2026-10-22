import { containsText, schema } from '@toppo/db';
import { PROJECTS_PAGE_SIZE, type ProjectsResponse, projectsQuerySchema } from '@toppo/shared';
import { and, count, isNotNull, isNull, sql } from 'drizzle-orm';
import { reachableBy } from '../../../platform/auth/project-access.ts';
import { defineQuery } from '../../../platform/cqrs/cqrs.ts';

const { projects } = schema;

/** One page of the projects the caller reaches, with the counts of the active and archived tabs. */
export const listProjects = defineQuery({
  name: 'project.list',
  access: 'authenticated',
  input: projectsQuerySchema,
  async handler({ db, actor }, { state, search, page }): Promise<ProjectsResponse> {
    const visible = and(
      reachableBy(actor.id),
      search ? containsText([projects.key, projects.name], search) : undefined,
    );
    const inState =
      state === 'archived' ? isNotNull(projects.archivedAt) : isNull(projects.archivedAt);

    const rows = await db
      .select({
        id: projects.id,
        key: projects.key,
        name: projects.name,
        description: projects.description,
      })
      .from(projects)
      .where(and(visible, inState))
      .orderBy(sql`lower(${projects.name})`, projects.key)
      .limit(PROJECTS_PAGE_SIZE)
      .offset((page - 1) * PROJECTS_PAGE_SIZE);
    const [counts] = await db
      .select({
        active: count(sql`case when ${projects.archivedAt} is null then 1 end`),
        archived: count(projects.archivedAt),
      })
      .from(projects)
      .where(visible);

    const active = counts?.active ?? 0;
    const archived = counts?.archived ?? 0;
    return {
      rows,
      matching: state === 'archived' ? archived : active,
      counts: { active, archived },
      page,
      pageSize: PROJECTS_PAGE_SIZE,
    };
  },
});
