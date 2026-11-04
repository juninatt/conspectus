import { useQuery } from '@tanstack/react-query'
import { lazy, Suspense } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'

import { ApiError } from '../api/client'
import { datasetQuery } from '../api/queries'
import { DataTable } from '../components/DataTable'
import { StatusMessage } from '../components/StatusMessage'
import styles from './DatasetPage.module.css'

// Charts pull in ECharts, the largest dependency; load it only when needed.
const ChartView = lazy(() =>
  import('../charts/ChartView').then((module) => ({
    default: module.ChartView,
  })),
)

type View = 'table' | 'chart'

export function DatasetPage() {
  const { sourceId = '' } = useParams()
  const { data: dataset, error, isPending } = useQuery(datasetQuery(sourceId))
  const [params, setParams] = useSearchParams()
  const view: View = params.get('view') === 'chart' ? 'chart' : 'table'

  const showView = (next: View) => {
    const updated = new URLSearchParams(params)
    updated.set('view', next)
    setParams(updated)
  }

  return (
    <section className={styles.page}>
      <Link to="/" className={styles.back}>
        ← All sources
      </Link>
      {isPending ? (
        <StatusMessage title="Loading data…" />
      ) : error ? (
        <DatasetError error={error} />
      ) : (
        <>
          <header className={styles.header}>
            <div>
              <h1>{dataset.name}</h1>
              <p className={styles.meta}>
                {dataset.total_rows} rows · {dataset.columns.length} columns
              </p>
            </div>
            <div className={styles.views} role="group" aria-label="View">
              {(['table', 'chart'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={view === option}
                  onClick={() => showView(option)}
                >
                  {option === 'table' ? 'Table' : 'Chart'}
                </button>
              ))}
            </div>
          </header>
          {dataset.columns.length === 0 ? (
            <StatusMessage title="This source has no data yet" />
          ) : view === 'chart' ? (
            <Suspense fallback={<StatusMessage title="Loading chart…" />}>
              <ChartView columns={dataset.columns} rows={dataset.rows} />
            </Suspense>
          ) : (
            <DataTable columns={dataset.columns} rows={dataset.rows} />
          )}
        </>
      )}
    </section>
  )
}

function DatasetError({ error }: { error: Error }) {
  const status = error instanceof ApiError ? error.status : undefined
  const title =
    status === 404
      ? 'Source not found'
      : status === 422
        ? 'This source cannot be read'
        : 'Could not load data'
  return (
    <StatusMessage title={title} tone="error">
      <pre>{error.message}</pre>
    </StatusMessage>
  )
}
