import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'

import type { Column, Row } from '../api/client'
import { StatusMessage } from '../components/StatusMessage'
import { Chart } from './Chart'
import { buildChartModel, type ChartSettings, MAX_SERIES } from './chartOptions'
import { ChartSettingsBar } from './ChartSettingsBar'
import styles from './ChartView.module.css'
import type { ZoomRange } from './echarts'
import { readChartTheme } from './theme'
import { readChartSettings, writeChartSettings } from './urlSettings'

type Props = {
  columns: Column[]
  rows: Row[]
}

export function ChartView({ columns, rows }: Props) {
  const [params, setParams] = useSearchParams()
  const settings = useMemo(
    () => readChartSettings(params, columns, rows),
    [params, columns, rows],
  )
  const theme = useMemo(() => readChartTheme(), [])
  // The zoom belongs to an x column: kept when only the chart type or the
  // y columns change, dropped when x changes and the old range means nothing.
  const [zoom, setZoom] = useState<{ x: string; range: ZoomRange } | null>(null)
  const range = zoom !== null && zoom.x === settings?.x ? zoom.range : undefined
  const model = useMemo(
    () => settings && buildChartModel(columns, rows, settings, theme, range),
    [columns, rows, settings, theme, range],
  )

  if (settings === null || model === null) {
    return (
      <StatusMessage title="Nothing to chart">
        <p>This dataset has no numeric columns to plot.</p>
      </StatusMessage>
    )
  }

  // replace: adjusting a chart should not fill the browser history.
  const update = (next: ChartSettings) =>
    setParams(writeChartSettings(params, next), { replace: true })

  return (
    <div className={styles.container}>
      <ChartSettingsBar
        columns={columns}
        settings={settings}
        onChange={update}
      />
      {model.omittedSeries > 0 && (
        <p className={styles.notice} role="status">
          Showing the first {MAX_SERIES} series; {model.omittedSeries} more are
          left out so every series keeps a distinct color.
        </p>
      )}
      <Chart
        option={model.option}
        label={describe(settings)}
        onZoom={(next) => setZoom({ x: settings.x, range: next })}
      />
    </div>
  )
}

function describe({ type, x, y, group }: ChartSettings): string {
  const grouping = group === null ? '' : `, grouped by ${group}`
  return `${type} chart of ${y.join(' and ')} by ${x}${grouping}`
}
