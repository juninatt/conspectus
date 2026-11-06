# Roadmap

Work is planned as [Semantic Versioning](https://semver.org/) releases. Each
release is small enough to be tested and verified on its own. What has
actually shipped is recorded in [CHANGELOG.md](../CHANGELOG.md).

Before 1.0.0 the API may still change between minor versions.

| Version | Scope | Verified by |
|---------|-------|-------------|
| 0.1.0 ✅ | Backend skeleton: FastAPI, health check, test and quality tooling | Tests, lint and type checks |
| 0.2.0 ✅ | Dataset model (columns, types, rows) and JSON reader with column type detection | Unit tests against sample files |
| 0.3.0 ✅ | Source configuration: load and validate `sources.yaml`, with optional per-column type overrides | Tests for valid and invalid configuration |
| 0.4.0 ✅ | API: list sources, fetch a dataset by id | API tests, manual check via `/docs` |
| 0.5.0 ✅ | CI with GitHub Actions; SQLite reader behind the same reader interface | Existing API tests pass with a SQLite source |
| 0.6.0 ✅ | Frontend skeleton: dataset list and table view, frontend CI | Vitest, manual check in the browser |
| 0.7.0 ✅ | Charts (line, bar, scatter) with selectable axis columns and grouping | Vitest, manual check in the browser |
| 0.8.0 | Theming and dark mode: dark design tokens, a theme switch, following the system setting by default | Vitest, manual check in the browser |
| 0.9.0 | Dashboards: stored in the backend, with an API and a UI to save and show sets of charts and tables | API tests, Vitest, manual check in the browser |
| 1.0.0 | First complete release for local use | Full flow from source file to dashboard |

## Planned, not yet scheduled

- **CSV reader.** Parquet or similar only if data volumes require it.
- **PostgreSQL reader** (after 1.0.0, if still wanted): read a table or a
  query from a PostgreSQL database through a read-only database role, so
  producers that already store their data in Postgres need no export step.
- **Filtering and aggregation** in the API.
- **Docker** images for backend and frontend.
- **Cloud deployment** with Postgres and authentication.
