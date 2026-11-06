import {
  type ReactNode,
  useCallback,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react'

import { ThemeContext } from './context'
import {
  applyTheme,
  DARK_QUERY,
  readPreference,
  resolveTheme,
  savePreference,
  type ThemePreference,
} from './theme'

function subscribeToSystem(onChange: () => void) {
  const query = window.matchMedia(DARK_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

const systemIsDark = () => window.matchMedia(DARK_QUERY).matches

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState(readPreference)
  // Follows the operating system live, e.g. when it switches in the evening.
  const systemDark = useSyncExternalStore(subscribeToSystem, systemIsDark)
  const theme = resolveTheme(preference, systemDark)

  // A layout effect runs before any regular effect, so components reading
  // the design tokens in their effects (charts) already see the new theme.
  useLayoutEffect(() => applyTheme(theme), [theme])

  const setPreference = useCallback((next: ThemePreference) => {
    savePreference(next)
    setPreferenceState(next)
  }, [])

  const state = useMemo(
    () => ({ preference, theme, setPreference }),
    [preference, theme, setPreference],
  )
  return <ThemeContext value={state}>{children}</ThemeContext>
}
