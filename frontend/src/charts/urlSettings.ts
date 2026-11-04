/**
 * Chart settings live in the URL (?chart=line&x=day&y=temp&group=station),
 * so a chart can be bookmarked, shared and survives a reload.
 */
import type { Column, Row } from '../api/client'
import {
  CHART_TYPES,
  type ChartSettings,
  type ChartType,
  defaultSettings,
  groupCandidates,
  yCandidates,
} from './chartOptions'

const KEYS = { type: 'chart', x: 'x', y: 'y', group: 'group' } as const

/**
 * Reads chart settings from the URL. Anything missing or invalid – such as
 * a column that no longer exists – falls back to the defaults instead of
 * failing, since URLs outlive the data they were made for.
 */
export function readChartSettings(
  params: URLSearchParams,
  columns: Column[],
  rows: Row[],
): ChartSettings | null {
  const defaults = defaultSettings(columns, rows)
  if (defaults === null) return null

  const names = new Set(columns.map((column) => column.name))
  const numeric = new Set(yCandidates(columns).map((column) => column.name))
  const groupable = new Set(
    groupCandidates(columns).map((column) => column.name),
  )

  const type = params.get(KEYS.type)
  const x = params.get(KEYS.x)
  const y = [...new Set(params.getAll(KEYS.y))].filter((name) =>
    numeric.has(name),
  )
  // Once the chart has been adjusted, a missing group means "no grouping";
  // before that, the default grouping applies.
  const adjusted = params.has(KEYS.type)
  const group = adjusted ? params.get(KEYS.group) : defaults.group

  const settings: ChartSettings = {
    type: isChartType(type) ? type : defaults.type,
    x: x !== null && names.has(x) ? x : defaults.x,
    y: y.length > 0 ? y : defaults.y,
    group: null,
  }
  // Grouping splits a single y column; with several it is dropped.
  if (
    group !== null &&
    groupable.has(group) &&
    group !== settings.x &&
    settings.y.length === 1
  ) {
    settings.group = group
  }
  return settings
}

/** Returns `params` with the chart settings replaced; other keys are kept. */
export function writeChartSettings(
  params: URLSearchParams,
  settings: ChartSettings,
): URLSearchParams {
  const next = new URLSearchParams(params)
  for (const key of Object.values(KEYS)) next.delete(key)
  next.set(KEYS.type, settings.type)
  next.set(KEYS.x, settings.x)
  for (const column of settings.y) next.append(KEYS.y, column)
  if (settings.group !== null) next.set(KEYS.group, settings.group)
  return next
}

function isChartType(value: string | null): value is ChartType {
  return CHART_TYPES.some((type) => type === value)
}
