import { queryOptions } from '@tanstack/react-query';
import { ProjectWorkflow } from '../api/project-workflow.api.ts';
import { Workflow } from '../api/workflow.api.ts';

/** Cached workflows. Keys start with `workflows`. */
export const WorkflowsQueries = {
  /** Every workflow, to refresh them all after a change. */
  all: ['workflows'] as const,
  instance: queryOptions({
    queryKey: ['workflows', 'instance'],
    queryFn: () => Workflow.get(),
  }),
  /** The workflow a project follows, its own or the instance's. */
  project: (projectKey: string) =>
    queryOptions({
      queryKey: ['workflows', 'project', projectKey],
      queryFn: () => ProjectWorkflow.get(projectKey),
    }),
};
