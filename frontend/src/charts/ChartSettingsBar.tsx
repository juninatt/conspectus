import type { Column } from '../api/client'
import {
  CHART_TYPES,
  type ChartSettings,
  type ChartType,
  groupCandidates,
  xCandidates,
  yCandidates,
} from './chartOptions'
import styles from './ChartSettingsBar.module.css'

const TYPE_LABELS: Record<ChartType, string> = {
  line: 'Line',
  bar: 'Bar',
  scatter: 'Scatter',
}

type Props = {
  columns: Column[]
  settings: ChartSettings
  onChange: (settings: ChartSettings) => void
}

/** Chart type, axes and grouping. Only choices that make sense are offered. */
export function ChartSettingsBar({ columns, settings, onChange }: Props) {
  const update = (changes: Partial<ChartSettings>) =>
    onChange({ ...settings, ...changes })

  const toggleY = (name: string, checked: boolean) => {
    const y = checked
      ? [...settings.y, name]
      : settings.y.filter((column) => column !== name)
    // Grouping splits a single y column, so it is cleared for several.
    update({ y, group: y.length > 1 ? null : settings.group })
  }

  const canGroup = settings.y.length === 1

  return (
    <div className={styles.bar}>
      <label className={styles.field}>
        Type
        <select
          value={settings.type}
          onChange={(event) =>
            update({ type: event.target.value as ChartType })
          }
        >
          {CHART_TYPES.map((type) => (
            <option key={type} value={type}>
              {TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        X axis
        <select
          value={settings.x}
          onChange={(event) => {
            const x = event.target.value
            // Grouping by the x column itself would add nothing.
            update({ x, group: settings.group === x ? null : settings.group })
          }}
        >
          {xCandidates(columns).map((column) => (
            <option key={column.name} value={column.name}>
              {column.name} ({column.type})
            </option>
          ))}
        </select>
      </label>

      <fieldset className={styles.field}>
        <legend>Y axis</legend>
        <div className={styles.options}>
          {yCandidates(columns).map((column) => {
            const checked = settings.y.includes(column.name)
            return (
              <label key={column.name} className={styles.check}>
                <input
                  type="checkbox"
                  checked={checked}
                  // At least one y column must stay selected.
                  disabled={checked && settings.y.length === 1}
                  onChange={(event) =>
                    toggleY(column.name, event.target.checked)
                  }
                />
                {column.name}
              </label>
            )
          })}
        </div>
      </fieldset>

      <label className={styles.field}>
        Group by
        <select
          value={settings.group ?? ''}
          disabled={!canGroup}
          title={canGroup ? undefined : 'Grouping needs a single Y column'}
          onChange={(event) => update({ group: event.target.value || null })}
        >
          <option value="">None</option>
          {groupCandidates(columns, settings.x).map((column) => (
            <option key={column.name} value={column.name}>
              {column.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
