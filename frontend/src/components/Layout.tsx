import { Link, Outlet } from 'react-router'

import { ThemeSwitch } from '../theme/ThemeSwitch'
import styles from './Layout.module.css'

export function Layout() {
  return (
    <>
      <header className={styles.header}>
        <div className={styles.inner}>
          <Link to="/" className={styles.brand}>
            Conspectus
          </Link>
          <ThemeSwitch />
        </div>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </>
  )
}
