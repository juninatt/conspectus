import { useTheme } from './context'
import { THEME_PREFERENCES, type ThemePreference } from './theme'
import styles from './ThemeSwitch.module.css'

const LABELS: Record<ThemePreference, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
}

export function ThemeSwitch() {
  const { preference, setPreference } = useTheme()

  return (
    <div className={styles.switch} role="group" aria-label="Theme">
      {THEME_PREFERENCES.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={preference === option}
          onClick={() => setPreference(option)}
        >
          {LABELS[option]}
        </button>
      ))}
    </div>
  )
}
