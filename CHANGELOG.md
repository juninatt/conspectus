# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.6.0] – 2026-11-02

### Added
- Web frontend: a list of all sources and a table view per dataset, with
  sorting, paging and clear messages for missing or unreadable sources.
- API types for the frontend generated from the backend's OpenAPI schema.
- Frontend CI: lint, formatting, type checks, tests and build, plus checks
  that the API types are current and the versions match.

## [0.5.0] – 2026-11-02

### Added
- Continuous integration: tests, lint, formatting and type checks run on
  GitHub Actions for every push to `main` and every pull request that
  touches the backend.
- SQLite sources: read a whole table or the result of a query. Databases
  are opened read-only.
- Declared SQLite column types for booleans, dates and date-times are used
  when the values fit them.
- A column explicitly typed `boolean` accepts 0 and 1.
- Example SQLite database with a table source and a query source.

### Changed
- Cached datasets are refreshed when any file their reader depends on
  changes, so updates to SQLite databases in WAL mode are picked up.

## [0.4.0] – 2026-11-02

### Added
- `GET /sources` lists all configured sources.
- `GET /datasets/{id}` returns the columns and rows of a source, with
  optional paging through `limit` and `offset`.
- Clear API errors: 404 for unknown sources, 422 for sources that cannot be
  read.
- Datasets are cached and re-read only when their file changes.

### Changed
- The source configuration is loaded at startup; the application does not
  start if it is missing or invalid.

## [0.3.0] – 2026-11-02

### Added
- Source configuration in `sources.yaml`, validated with clear errors per
  source and field. Source ids are derived from source names.
- Per-column type overrides; values that do not fit are reported by row.
- `CONSPECTUS_SOURCES` setting to load the configuration from another path.
- Example configuration with sample data.

## [0.2.0] – 2026-11-02

### Added
- Dataset model: typed, nullable columns and rows that are checked to match
  them.
- JSON reader for tabular JSON, with column type inference for strings,
  integers, numbers, booleans, ISO 8601 dates and date-times.
- Clear errors for unreadable files, malformed JSON and nested values.
- Changelog and versioned roadmap in `docs/roadmap.md`.
- README sections on supported data formats and development conventions.

### Changed
- The application version is read from the package metadata, so it is
  defined in one place only.

## [0.1.0] – 2026-10-28

### Added
- Backend service with a health check endpoint and interactive API docs.
- Tooling for tests, linting, formatting and strict type checking.
- README, decision log and MIT license.

[Unreleased]: https://github.com/juninatt/Conspectus/compare/v0.6.0...HEAD
[0.6.0]: https://github.com/juninatt/Conspectus/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/juninatt/Conspectus/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/juninatt/Conspectus/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/juninatt/Conspectus/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/juninatt/Conspectus/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/juninatt/Conspectus/releases/tag/v0.1.0
