# Conspectus

[![Backend](https://github.com/juninatt/conspectus/actions/workflows/backend.yml/badge.svg)](https://github.com/juninatt/conspectus/actions/workflows/backend.yml)
[![Frontend](https://github.com/juninatt/conspectus/actions/workflows/frontend.yml/badge.svg)](https://github.com/juninatt/conspectus/actions/workflows/frontend.yml)

*Latin: "overview".*

Conspectus reads data that other applications produce – files and databases
in common formats – and presents it as interactive charts and tables. It is
source-agnostic: any project, in any language, can be connected by writing its
data in a supported format and listing it as a source.

> **Status:** early development. See the [roadmap](docs/roadmap.md) and the
> [changelog](CHANGELOG.md).

## How it works

```
producing applications → JSON / SQLite / CSV files
  → backend (FastAPI)
      1. sources are listed in sources.yaml
      2. one reader per file format
      3. every reader returns the same dataset model (columns, types, rows)
      4. REST API: /sources, /datasets/{id}
  → JSON over HTTP →
frontend (React + TypeScript): dataset list, tables, charts, dashboards
```

- Conspectus only **reads** data. Producers don't need to know it exists –
  they just write a file.
- Readers are interchangeable: adding a format means adding a reader, nothing
  else changes.
- Backend and frontend communicate only through the API.

## Supported data formats

| Format | Status |
|--------|--------|
| Tabular JSON – a list of flat objects, one per row | Supported |
| SQLite – a table or the result of a query | Supported |
| CSV | Planned |

### JSON

Example of tabular JSON:

```json
[
  {"timestamp": "2026-10-01T08:00:00", "station": "north", "temperature": 12.5},
  {"timestamp": "2026-10-01T09:00:00", "station": "south", "temperature": null}
]
```

- Columns are all keys found in any row, in order of first appearance.
  A key missing from a row counts as a missing value.
- Nested objects or lists inside a row are not supported; the file is
  rejected with an error naming the row and column.

### SQLite

A source reads either a whole `table` or the result of a `query`. The
database is opened **read-only**, so not even a mistaken query can change
it; the producing application keeps writing as usual, and new rows show up
on the next request.

- Declared column types `BOOLEAN`/`BOOL`, `DATE` and `DATETIME`/`TIMESTAMP`
  are used when every value fits them, since SQLite stores booleans as 0/1
  and dates as text. All other columns – and every column of a query
  result – get their types inferred.
- Binary (`BLOB`) values are not supported; select other columns with a
  query instead.
- Databases in WAL mode are handled: changes are picked up even before they
  reach the main database file.

### Column types

Column types are inferred from the values unless the format declares them
or they are set in the configuration:

| Type | Inferred when all values are … |
|------|--------------------------------|
| `integer` | whole numbers |
| `number` | numbers, with at least one decimal |
| `boolean` | `true` / `false` |
| `date` | ISO 8601 dates, e.g. `2026-10-01` |
| `datetime` | ISO 8601 date-times, e.g. `2026-10-01T14:30:00Z` (date-only values allowed in the mix) |
| `string` | anything else, including mixed types |

Missing values are ignored when inferring, and mark the column as nullable.
Only ISO 8601 dates are recognised – ambiguous formats like `01/10/2026` stay
strings rather than being guessed. Values 0 and 1 are never inferred as
booleans, but are accepted when a column is explicitly typed `boolean`.

## Tech stack

| Area     | Choice                                  |
|----------|-----------------------------------------|
| Backend  | Python, FastAPI, pytest |
| Frontend | TypeScript (strict), React, Vite, React Router |
| Data fetching | TanStack Query, with types generated from the API's OpenAPI schema |
| Tables   | TanStack Table |
| Charts   | ECharts, loaded only when a chart is opened |
| Styling  | CSS Modules and CSS variables (design tokens), light and dark theme |
| Storage  | SQLite locally, Postgres in the cloud (planned) |
| Tooling  | uv, ruff, mypy · npm, oxlint, Prettier, Vitest, Testing Library, MSW |

## Getting started

### Backend

Requires [uv](https://docs.astral.sh/uv/) (it installs the right Python
version automatically).

```bash
cd backend
uv sync                                  # create environment, install deps
cp sources.example.yaml sources.yaml     # then list your own sources
uv run fastapi dev src/conspectus/main.py
```

The API is then available at <http://localhost:8000>, with interactive
documentation at <http://localhost:8000/docs>.

### Frontend

Requires [Node.js](https://nodejs.org/) 24 or later. Start the backend first.

```bash
cd frontend
npm ci                                   # install exact locked dependencies
npm run dev
```

Open <http://localhost:5173>. During development, requests to `/api/…` are
forwarded to the backend on port 8000, so no CORS setup is needed.

## API

Interactive documentation for all endpoints is served at `/docs`.

| Endpoint | Returns |
|----------|---------|
| `GET /health` | `{"status": "ok"}` when the service is running |
| `GET /sources` | All configured sources: `id`, `name`, `description`, `format` |
| `GET /datasets/{id}` | Columns and rows of one source |

`/datasets/{id}` accepts `limit` and `offset` for paging; without them all
rows are returned. `total_rows` always counts every row:

```json
{
  "id": "weather-stations",
  "name": "Weather stations",
  "columns": [{"name": "temperature", "type": "number", "nullable": true}],
  "rows": [{"timestamp": "2026-10-01T08:00:00", "temperature": 12.5}],
  "total_rows": 3
}
```

Errors have the form `{"detail": "..."}`:

| Status | Meaning |
|--------|---------|
| `404` | No source with that id – for example after a source was renamed |
| `422` | The source exists but cannot be read; `detail` names the file, row and column |

A source that cannot be read never affects the others. Data files are read
on first request and cached until the file changes, so responses stay fast
and always reflect the current file.

## Charts

Each dataset can be shown as a **table** or a **chart** – switch with the
buttons next to its name. A chart is configured in the bar above it:

| Setting | Choices |
|---------|---------|
| Type | Line, bar or scatter |
| X axis | Any column. Dates and date-times give a time axis, numbers a numeric axis, text and booleans one category per value. Bars over dates use one category per date. |
| Y axis | One or more numeric columns, all on one shared axis. |
| Group by | A text or boolean column (other than the x column): one series per value. Available with a single y column. |

- **A useful chart from the start.** Time goes on the x axis if there is a
  date column, the first numeric column on y. If x values repeat – several
  stations measured at the same time – the chart is grouped by the first
  text or boolean column, so each group gets its own line.
- **Settings live in the URL**, e.g.
  `/datasets/station-readings?view=chart&chart=line&x=recorded&y=temperature&group=station`,
  so a chart can be bookmarked or shared. Settings that no longer fit the
  data fall back to the defaults.
- **Scales:** bars start at zero, since bar length encodes the value; lines
  and points fit the data's range.
- **Colors** come from a fixed palette of eight, assigned in order and never
  repeated. Each group keeps its color in every chart type. Beyond eight
  series the rest are left out, with a notice.
- **Zoom** with the slider or the mouse wheel on time and numeric axes. The
  zoom is kept when changing chart type or y columns, and reset when the x
  column changes.
- Rows are plotted as they are; there is no aggregation yet. Several values
  for the same x, such as many readings per day in a bar chart, give several
  bars. Aggregate in a SQLite `query` until the API supports it.

## Themes

The switch in the header chooses **Light**, **Dark** or **System**. System
is the default and follows the operating system, also when it changes while
the app is open. The choice is remembered in the browser.

- All colors are design tokens in
  [`tokens.css`](frontend/src/styles/tokens.css); the dark theme redefines
  them under `[data-theme='dark']`, so components need no theme logic.
- Dark colors are chosen for dark backgrounds rather than inverted. Charts
  keep the same eight hues, stepped and validated for the dark surface, so a
  series keeps its color identity in both themes.
- A test checks that every text color meets WCAG AA contrast (4.5:1) on the
  backgrounds it is used on, in both themes.
- A small script in `index.html` applies the theme before the app loads, so
  the dark theme never flashes white.

## Configuring sources

Sources are listed in `backend/sources.yaml`. The file is local and not
committed; start from [sources.example.yaml](backend/sources.example.yaml).
To use a file elsewhere, set `CONSPECTUS_SOURCES` to its path.

```yaml
sources:
  - name: Weather stations          # id: weather-stations
    description: Hourly readings    # optional
    format: json
    path: data/measurements.json    # relative to sources.yaml
    columns:                        # optional type overrides
      serviced: date
```

| Field | Required | Meaning |
|-------|----------|---------|
| `name` | yes | Display name. The source id is derived from it. |
| `description` | no | Free text. |
| `format` | yes | Data format: `json` or `sqlite`. |
| `path` | yes | Data file. Relative paths are resolved from the folder of `sources.yaml`; `~` is expanded. |
| `table` | sqlite | Table to read. Set either `table` or `query`. |
| `query` | sqlite | SQL query whose result is the dataset. |
| `columns` | no | Column name → type, overriding inference. Every value must fit the type, or reading the source fails with an error naming the row. |

The **id** is the name in lowercase, with accents removed and anything other
than letters and digits replaced by hyphens: `Weather stations` →
`weather-stations`.

> [!WARNING]
> **Renaming a source changes its id.** Everything that refers to the old id
> stops working: API URLs such as `/datasets/weather-stations` return
> *not found*, and saved dashboards lose that source. Two names that result
> in the same id are rejected.

The configuration is validated when it is loaded: unknown fields, missing
fields and unsupported formats or types are reported with the source they
belong to. Whether data files exist is only checked when a source is read,
since the producing application may not have written them yet. Changes to
`sources.yaml` require a restart.

## Development

All checks must pass before a change is committed. The same checks run in CI
(GitHub Actions) on every push to `main` and every pull request, with one
workflow for the backend and one for the frontend.

### Backend

Run from `backend/`:

```bash
uv run pytest            # tests
uv run ruff check .      # lint
uv run ruff format .     # format
uv run mypy              # type check (strict)
uv add <package>         # add a runtime dependency
uv add --dev <package>   # add a development dependency
```

### Frontend

Run from `frontend/`:

```bash
npm test                 # tests (Vitest)
npm run lint             # lint (oxlint)
npm run format           # format (Prettier)
npm run typecheck        # type check (strict)
npm run build            # production build
npm run generate:api     # regenerate API types after backend API changes
```

`src/api/schema.d.ts` is generated from the backend's OpenAPI schema and is
committed. After changing the API, run `npm run generate:api`; CI fails if
the committed types are out of date.

### Conventions

- **Commits** follow [Conventional Commits](https://www.conventionalcommits.org/)
  in the imperative mood. The scope names the feature area; changes that
  span the whole repository have no scope.

  | Part | Scopes |
  |------|--------|
  | Backend | `api`, `config`, `readers`, `catalog` |
  | Frontend | `ui` (layout, styling, theme), `table`, `charts`, `dashboards` |
  | Both | `types` (generated API types) |
  | Infrastructure | `ci`, `docker`, `deps` (dependencies) |

  Commits before 0.7.0 use the earlier scopes `backend` and `frontend`.
- **Versioning** follows [Semantic Versioning](https://semver.org/). The
  application has one version, set in `backend/pyproject.toml` and
  `frontend/package.json`; CI checks that they match.
- **Changes** are recorded under *Unreleased* in [CHANGELOG.md](CHANGELOG.md)
  and moved to a version section on release. Each release is tagged `vX.Y.Z`.
- **Decisions** with lasting impact are recorded in
  [docs/decisions.md](docs/decisions.md).
- **Code organisation:** code is split by responsibility – `api/`,
  `readers/`, `models/` … in the backend; `api/`, `components/`, `pages/`,
  `styles/` in the frontend – while staying idiomatic.

## Repository layout

```
backend/    FastAPI application and tests
frontend/   React application and tests
docs/       Roadmap and decision log
```

## License

[MIT](LICENSE)
