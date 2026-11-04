// Registers only the ECharts parts the app uses, which keeps the bundle small.
import {
  BarChart,
  type BarSeriesOption,
  LineChart,
  type LineSeriesOption,
  ScatterChart,
  type ScatterSeriesOption,
} from 'echarts/charts'
import {
  DataZoomComponent,
  type DataZoomComponentOption,
  GridComponent,
  type GridComponentOption,
  LegendComponent,
  type LegendComponentOption,
  TooltipComponent,
  type TooltipComponentOption,
} from 'echarts/components'
// Renamed: `use` is ECharts' registration function, not a React hook.
import { type ComposeOption, use as register } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'

register([
  BarChart,
  LineChart,
  ScatterChart,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  CanvasRenderer,
])

/** The chart option type, limited to the registered parts. */
export type ChartOption = ComposeOption<
  | BarSeriesOption
  | LineSeriesOption
  | ScatterSeriesOption
  | DataZoomComponentOption
  | GridComponentOption
  | LegendComponentOption
  | TooltipComponentOption
>

/** The visible part of a zoomable x axis, in percent of its full range. */
export type ZoomRange = { start: number; end: number }

export { init } from 'echarts/core'
export type { EChartsType } from 'echarts/core'
