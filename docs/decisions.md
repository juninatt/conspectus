# Decision log

Important decisions and why they were made. Newest entries last.
Each entry: date, decision, context/rationale. Superseded decisions are kept
and marked as such rather than deleted.

---

## 001 – Separate backend and frontend (2026-10-28)
**Decision:** Python + FastAPI backend and TypeScript + React (Vite) frontend,
in one repository under `backend/` and `frontend/`. They communicate only
through an HTTP/JSON API.

**Why:** Each side uses the best tool for its job, and the API boundary keeps
them independently testable and replaceable. One repository keeps CI, Docker
and documentation in one place. Streamlit was rejected: fast to start, but it
couples UI and data logic and would require a rewrite to reach the intended
quality.

## 002 – ECharts for charts, TanStack Table for tables (2026-10-28)
**Decision:** Use ECharts and TanStack Table in the frontend.

**Why:** ECharts covers a wide range of interactive chart types with good
performance on larger datasets. TanStack Table is headless, so sorting,
filtering and pagination logic comes for free while styling stays fully under
our control.

## 003 – Read data, don't receive it (2026-10-28)
**Decision:** Conspectus reads files and databases that other projects
produce. There is no live push or ingestion API.

**Why:** Keeps the other projects unaware of Conspectus – they only need to
write a file. Simpler to build, test and reason about.

## 004 – Tabular JSON first, then SQLite, then CSV (2026-10-28)
**Decision:** First supported format is a JSON list of flat objects (one per
row). SQLite follows, then CSV. Nested JSON is out of scope for now.

**Why:** Tabular JSON is trivial to produce from virtually any language and maps
directly to a table. Adding SQLite second proves that readers are
interchangeable behind a common dataset model.

## 005 – SQLite locally, Postgres later (2026-10-28)
**Decision:** Store Conspectus' own metadata (e.g. saved dashboards) in SQLite
while running locally; move to Postgres when deploying to the cloud.

**Why:** SQLite needs no server and is ideal for local development. Using a
standard SQL access layer keeps the later switch small.

## 006 – MIT license (2026-10-28)
**Decision:** The project is released under the MIT license.

**Why:** Short, widely understood and permissive. It makes clear that the code
may be read, run and reused, which suits a public portfolio project.

## 007 – Source-agnostic by design (2026-10-28)
**Decision:** Conspectus has no knowledge of any specific data producer. All
sources are described in configuration, and code, docs and sample data stay
generic.

**Why:** The application should be easy to connect to many different
producers. Coupling it to particular projects would leak their assumptions
into the data model and make it harder to reuse.

## 008 – Python tooling: uv, ruff, mypy (2026-10-28)
**Decision:** Manage the backend environment and dependencies with uv, lint
and format with ruff, and type check with mypy in strict mode from the start.
The package uses the `src/` layout.

**Why:** uv's lock file gives identical environments locally, in CI and in
Docker. ruff replaces several tools with one fast one. Strict typing from day
one is much cheaper than adding it later, and the dataset model – columns and
types – is the core of the application. The `src/` layout makes tests run
against the installed package, which catches packaging mistakes early.

## 009 – Semantic versioning with changelog and tags (2026-11-01)
**Decision:** Plan and release work as Semantic Versioning milestones
(`MAJOR.MINOR.PATCH`). Each release is recorded in `CHANGELOG.md` and marked
with an annotated git tag `vX.Y.Z`. The version number is defined once, in
`backend/pyproject.toml`.

**Why:** Versions give each milestone a clear scope and a point in history
that can be found, compared and rolled back to. A changelog tells readers
what changed without digging through commits. A single source for the version
number prevents it from drifting between files. Before 1.0.0 the API may
still change; 1.0.0 marks the first complete release for local use.

The SQLite reader is planned before the frontend so that the dataset model is
proven against two formats before anything is built on top of it.

## 010 – Dataset model and column type inference (2026-11-02)
**Decision:** Every reader returns a `Dataset`: a list of columns (name, type,
nullable) and rows keyed by column name. Column types are `string`,
`integer`, `number`, `boolean`, `date` and `datetime`. For formats without a
schema the type is inferred from the values:
- missing values (`null` or absent keys) are ignored and make the column
  nullable; a column with only missing values is `string`
- dates are recognised only in ISO 8601 form
- a mix of integers and decimals is `number`; a mix of dates and date-times
  is `datetime`; any other mix is `string`
- nested objects or lists are rejected with an error

Readers receive their settings when created and expose a single `read()`
method, so all formats share one interface.

**Why:** Rows keyed by name match both tabular JSON and how the frontend
table consumes data. Integers and decimals are kept apart because they are
used differently (counts and ids versus measurements). Accepting only ISO
dates avoids silently misreading ambiguous formats such as `01/10/2026`.
Falling back to `string` keeps imperfect data viewable instead of failing
the whole dataset, while nested data is rejected explicitly because it is
out of scope rather than something to guess at. Mixing time-zone-aware and
naive date-times also falls back to `string`, since they cannot be compared.

**Known limitation:** files are read fully into memory. This is fine for
tens of thousands of rows; streaming can be added behind the same reader
interface if needed. Per-column type overrides are planned for the source
configuration in 0.3.0.

## 011 – Source configuration (2026-11-02)
**Decision:** Sources are listed in a YAML file, `sources.yaml`, read with
PyYAML's safe loader and validated with Pydantic. Rules:
- Only `sources.example.yaml` is committed; the real file is local. Its
  location defaults to the working directory and can be changed with
  `CONSPECTUS_SOURCES`.
- Each source has `name`, `format` and format-specific fields (`path` for
  JSON), plus optional `description` and per-column type overrides.
- The source **id is derived from the name**. Renaming a source changes its
  id, which breaks URLs and references to the old id; this is documented
  with a warning. Names giving the same id are rejected.
- Relative data paths are resolved from the folder of the configuration file.
- Unknown fields are errors. The structure is validated when loaded; data
  files are only checked when read.
- A type override is strict: every value must fit, otherwise reading fails
  with the row and column. Overrides for columns that don't exist are errors.

**Why:** A real configuration contains local paths to other projects, which
don't belong in a public, source-agnostic repository. Deriving ids keeps the
configuration minimal; the cost – unstable ids on rename – was accepted and
is made visible instead. Resolving paths from the configuration file makes
behaviour independent of where the server is started. Rejecting unknown
fields turns typos into errors instead of silent misconfiguration. Checking
data files lazily lets Conspectus start before producers have written their
files. Overrides are strict because an explicitly stated type is a promise
about the data, unlike inference, which is deliberately lenient.

## 012 – Dataset API, caching and errors (2026-11-02)
**Decision:**
- `GET /sources` lists every configured source; `GET /datasets/{id}` returns
  columns, rows (one object per row) and `total_rows`.
- Paging with `limit` and `offset` is supported from the start. Without them
  all rows are returned.
- A dataset is cached in memory after the first read and re-read when the
  file's modification time or size changes.
- Errors use FastAPI's `{"detail": "..."}` shape: 404 for an unknown id,
  422 for a source that cannot be read. One failing source never affects
  the others.
- The configuration is loaded when the application starts; a missing or
  invalid configuration stops startup with a message.

**Why:** Paging is cheap to add now but would change the API contract later,
after the frontend depends on it. Caching on file changes keeps responses
fast without ever serving stale data and without a separate refresh step.
404 and 422 separate "this id does not exist" – likely after a rename – from
"the data is broken", which need different fixes. Loading the configuration
at startup surfaces mistakes immediately instead of on the first request.

**Known limitations:** error details include local file paths, which is
fine for local use but must be revisited before a public deployment. All
rows of a dataset are held in memory, and paging slices that in-memory list.

## 013 – Continuous integration with GitHub Actions (2026-11-02)
**Decision:** A GitHub Actions workflow runs the same checks as local
development – ruff lint, ruff format check, mypy and pytest – on every push
to `main` and every pull request. It installs dependencies with
`uv sync --locked` and only runs when files under `backend/` or the
workflow itself change. Workflow permissions are read-only. The frontend
will get its own workflow.

**Why:** Running the local checks automatically means a broken commit is
caught even when a local step is skipped, and the status is visible on
every commit and in the README badge. `--locked` fails the build if
`uv.lock` is out of date, so CI always tests the exact dependency versions
that are committed. One workflow per part of the repository keeps runs fast
and failures easy to locate.

**Note:** because the workflow is path-filtered, it does not run for changes
outside `backend/`. If its check is later made required for merging, pull
requests that don't touch the backend would wait for it forever; that
setup must then be adjusted.

## 014 – SQLite reader (2026-11-02)
**Decision:**
- A SQLite source reads either a `table` or the result of a `query` –
  exactly one of them.
- Databases are opened read-only (`mode=ro`).
- Declared column types `BOOLEAN`/`BOOL`, `DATE` and `DATETIME`/`TIMESTAMP`
  are used as hints when every value fits them; otherwise, and for all
  other columns and every query result, types are inferred. Explicit types
  in the configuration still take precedence, and an explicit `boolean`
  accepts 0 and 1.
- `BLOB` values are rejected with an error naming the column.
- Readers report which files they depend on, and the cache watches all of
  them. For SQLite that is the database and its `-wal` file.
- Type selection and conversion are shared by all readers.

**Why:** A query lets users join, filter and aggregate in the database
without changing the producing application, while a table covers the
common case with no SQL at all. Opening read-only makes "Conspectus never
modifies source data" a guarantee enforced by SQLite rather than a
promise. SQLite does not enforce declared types, so only declarations that
carry information the values cannot (0/1 meaning boolean, text meaning a
date) are trusted, and only when the data agrees. In WAL mode new rows are
written to the `-wal` file first, so watching only the database file would
serve stale data. Sharing the type logic keeps JSON and SQLite behaving
identically.

**Known limitation:** all rows are loaded into memory; `limit` and
`offset` are not yet pushed down into SQL.

## 015 – Frontend stack and structure (2026-11-02)
**Decision:**
- React with TypeScript in strict mode, built with Vite; npm as package
  manager.
- oxlint for linting and Prettier for formatting. ESLint was the original
  choice, but `typescript-eslint` does not support TypeScript 7, which the
  Vite template now uses; oxlint is the template's default and includes the
  React hooks rules.
- TypeScript types for the API are generated from the backend's OpenAPI
  schema (openapi-typescript, run in isolation because it requires
  TypeScript 5) and committed. CI fails if they are out of date.
- TanStack Query for data fetching; React Router for URLs per dataset.
- Styling with CSS Modules and CSS variables as design tokens, no component
  library.
- The table loads the whole dataset and sorts and pages in the browser.
- In development, Vite forwards `/api/…` to the backend.
- Tests use Vitest, Testing Library and MSW to simulate the backend.
- The app has one version: `frontend/package.json` matches
  `backend/pyproject.toml`, checked in CI. This amends decision 009, which
  kept the version in a single file.

**Why:** Generated types turn API changes into compile errors instead of
runtime bugs. TanStack Query handles loading, errors, caching and retries
that would otherwise be hand-written. CSS variables keep full control of
the design and make theming and dark mode (0.8.0) a matter of redefining
tokens. Testing through the rendered UI with a simulated backend checks
behaviour the way a user experiences it, without a running server.
Forwarding `/api` gives the browser a single origin, so the backend needs
no CORS configuration.

**Shortcut, accepted:** sorting and paging in the browser works well up to
a few thousand rows. When the API gains server-side sorting and filtering,
the table switches to requesting one page at a time; the change stays inside
the table component.

## 016 – Charts (2026-11-04)
**Decision:**
- ECharts, with only the needed parts registered (line, bar, scatter,
  tooltip, legend, zoom, canvas renderer), wrapped in a small own React
  component. The chart view is loaded only when opened.
- Column types decide the choices: any column on x (time, value or category
  axis by type), numeric columns on y, text and boolean columns for
  grouping. Several y columns share one axis; grouping requires a single y
  column and never uses the x column.
- The default chart puts time on x and the first numeric column on y, and
  groups by the first text or boolean column when x values repeat on a time
  or numeric axis.
- Settings are stored in the URL; invalid values fall back to the defaults.
- Bars start at zero; lines and points fit the data's range. Bars over dates
  use a category per date.
- Series colors come from a fixed palette of eight, read from CSS
  variables, assigned by first appearance in the data and never repeated.
  More than eight series are left out with a notice.
- The zoom range is kept while the x column stays the same.
- No aggregation in the frontend.

**Why:** Offering only choices that fit the column types means a chart can't
be set up wrongly. A sensible default shows something useful at once; the
automatic grouping prevents a line zigzagging between groups measured at
the same time. URL settings make charts shareable and are the basis for
saving dashboards. A zero baseline is required for bars because their
length encodes the value, while lines and points read position. Stable
colors per group and no repeated colors keep identity unambiguous; the
palette order was validated for color vision deficiencies, and slots below
3:1 contrast are backed by the legend, tooltips and the table view. Loading
ECharts on demand keeps the source list and table at about 110 kB gzipped
instead of about 300 kB. Aggregation belongs in the backend, next to
filtering, rather than being duplicated in the browser.

**Known limitations:** several y columns with different units share one
scale; separate charts – possible with dashboards – read better. The 8-series
cap is per chart.

## 017 – Commit scopes by feature area (2026-11-04)
**Decision:** From 0.7.0 on, the commit scope names the feature area –
`api`, `config`, `readers`, `catalog`, `ui`, `table`, `charts`,
`dashboards`, `types`, `ci`, `docker`, `deps` – instead of `backend` or
`frontend`. Earlier history is left as it is.

**Why:** The history becomes searchable by feature (`git log --grep
"(charts)"`), and the subject no longer has to repeat what the scope could
say.

## 018 – Theming before dashboards (2026-11-04)
**Decision:** The former 0.8.0 is split: theming and dark mode become 0.8.0,
dashboards 0.9.0.

**Why:** Dark mode is frontend-only and builds directly on the design
tokens, while dashboards introduce the first stored data – a database,
migrations and a new API. Two smaller releases are easier to test, and
dashboards are then built on a finished theme system.

## 019 – Theming and dark mode (2026-11-05)
**Decision:**
- Three choices: light, dark and system, with system as the default. The
  choice is stored in the browser's `localStorage`.
- The theme is applied as a `data-theme` attribute on `<html>`; the dark
  theme redefines the design tokens and sets `color-scheme`, so native
  controls follow.
- An inline script in `index.html` applies the stored theme before the app
  loads.
- Dark colors are chosen, not inverted. The chart palette keeps its eight
  hues in dark steps, validated against the dark surface.
- A test enforces WCAG AA contrast for text colors in both themes.
- Charts read their colors from the tokens again after a theme change; the
  theme is applied in a layout effect so it is in place before they read.

**Why:** Following the system respects the user's existing setting, while
an explicit choice is still possible. A preference is personal, so it does
not belong in shareable URLs, and without accounts there is nowhere else to
keep it; it can move to the server once users can sign in. Switching tokens
with one attribute means components never need to know about themes. The
inline script avoids the common flash of a light page before the dark theme
applies. Keeping hues across themes preserves series identity, and an
automated contrast check stops a later color change from quietly making
text hard to read.

**Known limitation:** the preference is per browser. The inline script
repeats a few lines of the theme logic, since it has to run before the app's
code; both places are marked to be kept in sync.
