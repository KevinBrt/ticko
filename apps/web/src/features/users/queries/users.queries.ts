import { queryOptions } from '@tanstack/react-query';
import { Users } from '../api/users.api.ts';

/** Cached user management data. Keys start with `users`. */
export const UsersQueries = {
  list: queryOptions({
    queryKey: ['users', 'list'],
    queryFn: () => Users.list(),
  }),
  assignableRoles: queryOptions({
    queryKey: ['users', 'assignable-roles'],
    queryFn: () => Users.assignableRoles(),
  }),
};
