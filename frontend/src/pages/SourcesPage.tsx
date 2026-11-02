import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'

import { sourcesQuery } from '../api/queries'
import { StatusMessage } from '../components/StatusMessage'
import styles from './SourcesPage.module.css'

export function SourcesPage() {
  const { data: sources, error, isPending } = useQuery(sourcesQuery)

  return (
    <section className={styles.page}>
      <h1>Sources</h1>
      {isPending ? (
        <StatusMessage title="Loading sources…" />
      ) : error ? (
        <StatusMessage title="Could not load sources" tone="error">
          <pre>{error.message}</pre>
        </StatusMessage>
      ) : sources.length === 0 ? (
        <StatusMessage title="No sources configured">
          <p>Add sources to sources.yaml and restart the backend.</p>
        </StatusMessage>
      ) : (
        <ul className={styles.list}>
          {sources.map((source) => (
            <li key={source.id}>
              <Link to={`/datasets/${source.id}`} className={styles.card}>
                <span className={styles.name}>{source.name}</span>
                {source.description && (
                  <span className={styles.description}>
                    {source.description}
                  </span>
                )}
                <span className={styles.format}>{source.format}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
