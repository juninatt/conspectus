import { Link, Outlet } from 'react-router'

import styles from './Layout.module.css'

export function Layout() {
  return (
    <>
      <header className={styles.header}>
        <div className={styles.inner}>
          <Link to="/" className={styles.brand}>
            Conspectus
          </Link>
        </div>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </>
  )
}
