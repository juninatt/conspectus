import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'

import { ApiError } from '../api/client'
import { datasetQuery } from '../api/queries'
import { DataTable } from '../components/DataTable'
import { StatusMessage } from '../components/StatusMessage'
import styles from './DatasetPage.module.css'

export function DatasetPage() {
  const { sourceId = '' } = useParams()
  const { data: dataset, error, isPending } = useQuery(datasetQuery(sourceId))

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
            <h1>{dataset.name}</h1>
            <p className={styles.meta}>
              {dataset.total_rows} rows · {dataset.columns.length} columns
            </p>
          </header>
          {dataset.columns.length === 0 ? (
            <StatusMessage title="This source has no data yet" />
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
