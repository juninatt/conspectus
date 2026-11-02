# Conspectus

[![Backend](https://github.com/juninatt/conspectus/actions/workflows/backend.yml/badge.svg)](https://github.com/juninatt/conspectus/actions/workflows/backend.yml)

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
| Tabular JSON – a list of flat objects, one per row | Reader available (0.2.0) |
| SQLite | Planned (0.5.0) |
| CSV | Planned |

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

### Column types

Formats without a schema, such as JSON, get their column types inferred:

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
strings rather than being guessed.

## Tech stack

| Area     | Choice                                  |
|----------|-----------------------------------------|
| Backend  | Python, FastAPI, pytest                 |
| Frontend | TypeScript, React, Vite, Vitest         |
| Charts   | ECharts                                 |
| Tables   | TanStack Table                          |
| Storage  | SQLite locally, Postgres in the cloud   |
| Tooling  | uv, ruff, mypy (strict)                 |

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
| `format` | yes | Data format. Supported: `json`. |
| `path` | yes | Data file. Relative paths are resolved from the folder of `sources.yaml`; `~` is expanded. |
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

All commands run from `backend/`. All checks must pass before a change is
committed. The same checks run in CI (GitHub Actions) on every push to
`main` and every pull request that touches the backend.

```bash
uv run pytest            # tests
uv run ruff check .      # lint
uv run ruff format .     # format
uv run mypy              # type check (strict)
uv add <package>         # add a runtime dependency
uv add --dev <package>   # add a development dependency
```

### Conventions

- **Commits** follow [Conventional Commits](https://www.conventionalcommits.org/)
  in the imperative mood. Scopes: `backend`, `frontend`, `ci`, `docker`;
  no scope for repository-wide changes.
- **Versioning** follows [Semantic Versioning](https://semver.org/). The
  version is defined only in `backend/pyproject.toml`; the application reads
  it from the package metadata.
- **Changes** are recorded under *Unreleased* in [CHANGELOG.md](CHANGELOG.md)
  and moved to a version section on release. Each release is tagged `vX.Y.Z`.
- **Decisions** with lasting impact are recorded in
  [docs/decisions.md](docs/decisions.md).
- **Code organisation:** packages are split by responsibility (`api/`,
  `readers/`, `models/` …) while staying idiomatic Python.

## Repository layout

```
backend/    FastAPI application and tests
frontend/   React application and tests (from 0.6.0)
docs/       Roadmap and decision log
```

## License

[MIT](LICENSE)
