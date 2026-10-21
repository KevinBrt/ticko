import { queryOptions } from '@tanstack/react-query';
import { Roles } from '../api/roles.api.ts';

/** Cached roles data. Keys start with `roles`. */
export const RolesQueries = {
  /** A short configuration list: loaded whole. */
  all: queryOptions({
    queryKey: ['roles', 'all'],
    queryFn: () => Roles.list(),
  }),
};
