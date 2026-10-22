import { queryOptions } from '@tanstack/react-query';
import { Categories } from '../api/categories.api.ts';
import { Priorities } from '../api/priorities.api.ts';

/** Cached settings of the issues' properties. Keys start with `properties`. */
export const PropertiesQueries = {
  /** Everything about properties, to refresh it all after a change. */
  all: ['properties'] as const,
  categories: queryOptions({
    queryKey: ['properties', 'categories'],
    queryFn: () => Categories.list(),
  }),
  priorities: queryOptions({
    queryKey: ['properties', 'priorities'],
    queryFn: () => Priorities.list(),
  }),
};
