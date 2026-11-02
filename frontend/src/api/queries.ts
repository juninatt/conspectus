import { QueryClient, queryOptions } from '@tanstack/react-query'

import { ApiError, fetchDataset, fetchSources } from './client'

export const sourcesQuery = queryOptions({
  queryKey: ['sources'],
  queryFn: fetchSources,
})

export function datasetQuery(sourceId: string) {
  return queryOptions({
    queryKey: ['datasets', sourceId],
    queryFn: () => fetchDataset(sourceId),
  })
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // 4xx errors (unknown source, unreadable data) won't fix themselves;
        // only retry network problems and server errors.
        retry: (failureCount, error) =>
          !(error instanceof ApiError && error.status < 500) &&
          failureCount < 2,
      },
    },
  })
}
