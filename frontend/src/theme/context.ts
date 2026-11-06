import { createContext, useContext } from 'react'

import type { Theme, ThemePreference } from './theme'

export type ThemeState = {
  /** What the user chose. */
  preference: ThemePreference
  /** What is shown: the preference with "system" resolved. */
  theme: Theme
  setPreference: (preference: ThemePreference) => void
}

export const ThemeContext = createContext<ThemeState | null>(null)

export function useTheme(): ThemeState {
  const state = useContext(ThemeContext)
  if (state === null) throw new Error('useTheme needs a ThemeProvider')
  return state
}
