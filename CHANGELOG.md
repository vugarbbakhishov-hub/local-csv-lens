# Changelog

All notable changes to this project are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- A quality issue checklist that turns the numeric scan into direct review
  notes for missing values, duplicate rows, empty columns and sparse columns.
  The same issues are included in the downloadable CSV and JSON reports.

## [0.2.0] - 2026-09-15

### Added

- Download the analysis as a CSV or JSON report. The CSV holds a short summary
  block, a blank line and one row per column with type, filled cells, empty
  cells, unique values and fill rate. The JSON report carries the same numbers
  in a nested shape. Both are built in the open tab with a `Blob`, so the data
  still never leaves the browser.
- Tests for the report: the CSV summary block, per-column fill rates, quoting of
  header names that contain a comma or a quote, the JSON structure and the
  generated file name.

### Fixed

- The hidden file input was positioned without a positioned ancestor, so on
  narrow screens it sat past the viewport and added a horizontal scrollbar.

## [0.1.0] - 2026-09-15

### Added

- First release: delimiter detection, a quote-aware CSV parser, a quality
  snapshot (rows, columns, empty cells, duplicate rows, completeness), column
  type inference and a preview of the first ten rows.

[0.2.0]: https://github.com/vugarbbakhishov-hub/local-csv-lens/releases/tag/v0.2.0
[0.1.0]: https://github.com/vugarbbakhishov-hub/local-csv-lens/releases/tag/v0.1.0
