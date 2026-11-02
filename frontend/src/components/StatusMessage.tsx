import type { ReactNode } from 'react'

import styles from './StatusMessage.module.css'

type Props = {
  title: string
  tone?: 'info' | 'error'
  children?: ReactNode
}

/** A loading, empty or error state shown in place of content. */
export function StatusMessage({ title, tone = 'info', children }: Props) {
  return (
    <div
      className={`${styles.message} ${styles[tone]}`}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <p className={styles.title}>{title}</p>
      {children}
    </div>
  )
}
