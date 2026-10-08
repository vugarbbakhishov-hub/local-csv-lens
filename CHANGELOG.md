# Changelog

All notable changes to this project are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Added

- Feedback forms identify the sample tested and expected/actual differences;
  bug reports request reproduction steps, including file versus pasted input.

- Downloadable fictional CSV examples and a walkthrough with expected metrics,
  column types and error recovery steps. Tests verify the distributed sample data.

### Fixed

- Evaluate sparse columns using exact counts before rounding percentages, so
  79.5% filled still triggers the below-80% notice in the UI and exported reports.

- Reject quotes inside unquoted text and text after closing quotes instead of
  silently merging malformed fields. Show a character-position error and hide
  stale reports; corrected input restores analysis and downloads.

## [0.4.1] - 2026-10-08

### Fixed

- Explain CSV text prefixes next to the download buttons and offer JSON for exact text.

- Prefix and quote formula-like CSV text, including file/column names and issue
  details. Numeric cells and JSON values stay unchanged; document CSV limitations.

- Classify leading-zero codes and hexadecimal/binary/octal literals as text.
  Numeric inference accepts finite decimal and scientific notation without
  converting stored cell values; CSV and JSON profiles use the same type.

- Keep impossible calendar dates (including non-leap February 29 and April 31)
  as text rather than accepting JavaScript date normalization. Validate the
  written calendar date before parsing optional time and timezone information.

- Announce the selected file while it is being read instead of asking users to
  analyze the previous input. Clear that status after completion, failure or an
  input action, and ignore obsolete reads without hiding the newer file's status.

## [0.4.0] - 2026-10-07

### Added

- React component regression tests for asynchronous file selection and report
  visibility, run automatically alongside parser tests in CI.

- Direct problem-report and feedback links in the app, a structured usability
  feedback form, and a short sample-based walkthrough with expected results.
- Interface bugs can be reported without supplying a CSV sample.

### Fixed

- Mark manually changed input as `(edited)` in the source label and exported
  CSV/JSON report, so a modified table is not mistaken for the original file.

- Ignore late file reads after choosing another file, editing input, clearing,
  loading the sample or analyzing the current text. Allow selecting the same
  file again after clearing or a failed read.

- Detect separators correctly after leading blank lines and inside files with
  multiline quoted headers, without counting separators from data rows.

- Avoid a JavaScript argument-limit error when reading many short CSV records.
  A regression test covers 150,001 rows and a wider final row; input still
  needs to fit in browser memory.

- Hide outdated analysis and report downloads after editing or clearing input,
  or when parsing fails. Analyze the current input to restore reports.

- Keep records with explicitly empty cells in row counts, completeness,
  duplicate detection and exported reports. A row such as `,` is data;
  plain blank lines are still skipped. Empty headers receive generated names.

## [0.3.0] - 2026-09-21

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

[0.3.0]: https://github.com/vugarbbakhishov-hub/local-csv-lens/releases/tag/v0.3.0
[0.4.0]: https://github.com/vugarbbakhishov-hub/local-csv-lens/releases/tag/v0.4.0
[0.2.0]: https://github.com/vugarbbakhishov-hub/local-csv-lens/releases/tag/v0.2.0
[0.1.0]: https://github.com/vugarbbakhishov-hub/local-csv-lens/releases/tag/v0.1.0
