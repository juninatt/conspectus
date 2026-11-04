import { useEffect, useRef } from 'react'

import {
  type ChartOption,
  type EChartsType,
  init,
  type ZoomRange,
} from './echarts'
import styles from './Chart.module.css'

type Props = {
  option: ChartOption
  /** Describes the chart for screen readers. */
  label: string
  /** Called when the user zooms, with the visible range in percent. */
  onZoom?: (range: ZoomRange) => void
}

/** Renders an ECharts option and keeps it sized to its container. */
export function Chart({ option, label, onZoom }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<EChartsType | null>(null)
  // A ref, so the listener registered once always calls the latest callback.
  const onZoomRef = useRef(onZoom)
  useEffect(() => {
    onZoomRef.current = onZoom
  }, [onZoom])

  useEffect(() => {
    const container = containerRef.current
    if (container === null) return
    const chart = init(container)
    chartRef.current = chart
    chart.on('datazoom', () => {
      const { dataZoom } = chart.getOption() as {
        dataZoom?: { start?: number; end?: number }[]
      }
      const [zoom] = dataZoom ?? []
      if (zoom?.start !== undefined && zoom.end !== undefined) {
        onZoomRef.current?.({ start: zoom.start, end: zoom.end })
      }
    })
    const observer = new ResizeObserver(() => chart.resize())
    observer.observe(container)
    return () => {
      observer.disconnect()
      chart.dispose()
      chartRef.current = null
    }
  }, [])

  useEffect(() => {
    // notMerge: settings changes replace the chart instead of piling up series.
    chartRef.current?.setOption(option, { notMerge: true })
  }, [option])

  return (
    <div
      ref={containerRef}
      className={styles.chart}
      role="img"
      aria-label={label}
    />
  )
}
