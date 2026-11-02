# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Continuous integration: tests, lint, formatting and type checks run on
  GitHub Actions for every push to `main` and every pull request that
  touches the backend.

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

[Unreleased]: https://github.com/juninatt/Conspectus/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/juninatt/Conspectus/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/juninatt/Conspectus/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/juninatt/Conspectus/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/juninatt/Conspectus/releases/tag/v0.1.0
