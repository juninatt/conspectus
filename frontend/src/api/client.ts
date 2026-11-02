import createClient from 'openapi-fetch'

import type { components, paths } from './schema'

export type SourceSummary = components['schemas']['SourceSummary']
export type DatasetResponse = components['schemas']['DatasetResponse']
export type Column = components['schemas']['Column']
export type ColumnType = components['schemas']['ColumnType']
export type Value = components['schemas']['Value']
export type Row = DatasetResponse['rows'][number]

/** An unsuccessful API response, with the backend's explanation. */
export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

const api = createClient<paths>({
  // Absolute, so requests also work outside the browser (in tests).
  baseUrl: `${window.location.origin}/api`,
  // Looked up on every call rather than captured once, so test tools that
  // replace fetch (MSW) see the requests.
  fetch: (request) => globalThis.fetch(request),
})

export async function fetchSources(): Promise<SourceSummary[]> {
  const { data, error, response } = await api.GET('/sources')
  if (data === undefined) throw toApiError(response, error)
  return data
}

export async function fetchDataset(sourceId: string): Promise<DatasetResponse> {
  const { data, error, response } = await api.GET('/datasets/{source_id}', {
    params: { path: { source_id: sourceId } },
  })
  if (data === undefined) throw toApiError(response, error)
  return data
}

function toApiError(response: Response, error: unknown): ApiError {
  return new ApiError(response.status, describe(error) ?? response.statusText)
}

// FastAPI errors look like {"detail": "..."}, or {"detail": [{"msg": ...}]}
// for invalid request parameters.
function describe(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('detail' in error)) {
    return undefined
  }
  const { detail } = error
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail
      .map((issue: unknown) =>
        typeof issue === 'object' && issue !== null && 'msg' in issue
          ? String(issue.msg)
          : String(issue),
      )
      .join('; ')
  }
  return undefined
}
