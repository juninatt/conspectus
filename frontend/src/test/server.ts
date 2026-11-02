import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

import type { DatasetResponse, SourceSummary } from '../api/client'

/** Builds a URL the way the API client does, for use in request handlers. */
export const apiUrl = (path: string) => `${window.location.origin}/api${path}`

export const sources: SourceSummary[] = [
  {
    id: 'weather-stations',
    name: 'Weather stations',
    description: 'Hourly readings',
    format: 'json',
  },
  {
    id: 'daily-averages',
    name: 'Daily averages',
    description: null,
    format: 'sqlite',
  },
]

export const weatherStations: DatasetResponse = {
  id: 'weather-stations',
  name: 'Weather stations',
  columns: [
    { name: 'recorded', type: 'datetime', nullable: false },
    { name: 'station', type: 'string', nullable: false },
    { name: 'temperature', type: 'number', nullable: true },
  ],
  rows: [
    { recorded: '2026-10-01T08:00:00', station: 'north', temperature: 12.5 },
    { recorded: '2026-10-01T09:00:00', station: 'south', temperature: null },
    { recorded: '2026-10-01T10:00:00', station: 'east', temperature: 9.75 },
  ],
  total_rows: 3,
}

/** A stand-in for the backend: tests override handlers to simulate errors. */
export const server = setupServer(
  http.get(apiUrl('/sources'), () => HttpResponse.json(sources)),
  http.get(apiUrl('/datasets/weather-stations'), () =>
    HttpResponse.json(weatherStations),
  ),
)
