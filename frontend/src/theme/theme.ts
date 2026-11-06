/**
 * Theme preference: light, dark, or following the operating system.
 * The preference is personal, so it is kept in the browser (localStorage)
 * rather than in the URL or on the server.
 *
 * index.html repeats a few lines of this logic in an inline script, so the
 * theme is set before the app loads; keep the two in sync.
 */
export type Theme = 'light' | 'dark'
export type ThemePreference = Theme | 'system'

export const THEME_PREFERENCES: ThemePreference[] = ['light', 'dark', 'system']
export const STORAGE_KEY = 'conspectus-theme'
export const DARK_QUERY = '(prefers-color-scheme: dark)'

export function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return THEME_PREFERENCES.find((theme) => theme === stored) ?? 'system'
  } catch {
    // Storage can be unavailable, e.g. in some private browsing modes.
    return 'system'
  }
}

export function savePreference(preference: ThemePreference): void {
  try {
    localStorage.setItem(STORAGE_KEY, preference)
  } catch {
    // Not saved; the choice still applies until the page is reloaded.
  }
}

export function resolveTheme(
  preference: ThemePreference,
  systemIsDark: boolean,
): Theme {
  if (preference === 'system') return systemIsDark ? 'dark' : 'light'
  return preference
}

/** Switches every design token at once via the data-theme attribute. */
export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
}
