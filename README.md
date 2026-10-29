# Local CSV Lens

Local CSV Lens is a small React and TypeScript utility for checking a CSV before importing it into another tool. It reports rows, columns, empty cells, duplicate rows, completeness and simple column types, and it can save that result as a CSV or JSON report. All parsing happens in the browser; the selected data is not uploaded.

## Live demo

[Open Local CSV Lens](https://vugarbbakhishov-hub.github.io/local-csv-lens/)

Latest release: [v0.5.0](https://github.com/vugarbbakhishov-hub/local-csv-lens/releases/tag/v0.5.0)
— one-click examples, clearer malformed-CSV errors and precise sparse-column checks.

## Try it in two minutes

Choose **Try missing values** or **Try codes and dates** to analyze a fictional
CSV immediately, without downloading or selecting a file. The same CSVs are
also available as downloads beside the input. For exact expected results,
follow the [sample walkthrough](docs/try-it.md).

1. Open the demo and review the built-in sample: **5 rows, 5 columns, 1 empty cell, 1 duplicate row, 96% completeness**.
2. Download a JSON report and compare its summary with the screen.
3. Edit a value. Results and downloads stay hidden until you choose **Analyze data** again.
4. [Share your experience](https://github.com/vugarbbakhishov-hub/local-csv-lens/issues/new?template=usability_feedback.yml) or [report a problem](https://github.com/vugarbbakhishov-hub/local-csv-lens/issues/new?template=bug_report.yml). GitHub submissions are public; use fictional examples only. The app does not attach your input automatically.

## Features

- Try built-in examples for missing values, duplicates, leading-zero codes and invalid dates with one click
- Paste CSV text or choose a local `.csv` file
- See the selected file's reading status until results or a read error are ready
- Detect comma, semicolon and tab delimiters
- Parse quoted fields, escaped quotes and line breaks inside quoted cells
- Reject malformed quote boundaries with a character-position error; fix the input and analyze again to restore results. Spaces/tabs around quoted fields remain supported.
- Report missing cells, exact duplicate rows and completeness
- Highlight quality issues such as missing values, duplicate rows, empty columns and sparse columns
- Evaluate the sparse-column threshold before rounding: 159/200 filled cells (79.5%) is below 80%, even though the report's whole-number fill rate displays 80%.
- Infer number, date, boolean, text and empty columns
- Numeric inference accepts decimal and scientific notation. Leading-zero codes and hexadecimal/binary/octal literals remain text; profiling never converts stored cell values.
- Validate calendar dates, including leap years; a column with an impossible date is classified as text. Blank cells do not determine the type.
- Browse all data rows in pages of ten, with row numbers and previous/next controls
- Download the result as a CSV or JSON report, written in the browser
- Responsive interface with keyboard focus and status feedback

## Run locally

```bash
npm install
npm run dev
```

Then open the local URL printed by Vite.

The fictional examples live in `public/samples/`. The app and sample tests import
them through `/samples/*.csv?raw`, following Vite's
[public asset paths](https://vite.dev/guide/assets#the-public-directory).
`assetsInclude` in `vite.config.ts` registers CSV files as assets. Downloads
keep their existing filenames. Edit the CSV files there to update
both the one-click examples and downloads together.
The test configuration maps `/samples` to that same directory for Node-based
tests on Windows and other platforms.

## Validation

```bash
npm test
npm run lint
npm run build
```

The parser tests cover delimiter detection, quoted delimiters, escaped quotes, CRLF input, line breaks inside quoted fields, uneven rows, duplicate headers, malformed quotes, completeness, duplicates and type inference.

The report tests cover the CSV summary block, quality issue block, per-column fill rates, quoting of header names that contain a comma or a quote, the JSON structure and the generated file name.

React component tests run in jsdom and exercise deferred file reads through the
actual input controls: clearing, loading the sample, editing and analyzing text,
selecting a newer file, recovering from a read error, and hiding stale reports.
They complement parser tests; they do not replace real-browser checks of file dialogs.

## Browse the data preview

After analyzing input, use **Next rows** and **Previous rows** below the preview
heading to inspect the whole dataset, ten records at a time. The range shows
which rows are visible. A new analysis, sample or file starts at the first page.

**Data row** numbers count parsed records after the header. They are not source
file line numbers: blank lines are skipped and a quoted multiline cell still
belongs to one record. The row-number column is only a navigation aid; it is
not added to your CSV or the column profile. The summary and downloaded reports
always describe all analyzed rows, regardless of the current preview page.

## Privacy

The app has no backend, analytics or upload endpoint. File contents are read with the browser `File` API and stay in the current tab.

## Reports

CSV reports prefix formula-like text with an apostrophe and quote the cell,
including source names, column names and generated issue details. Leading
`=`, `+`, `-`, `@`, their full-width variants (also after whitespace), and leading
tabs/line breaks are covered. Numeric values are unchanged. Use JSON for exact
text without the added prefix. Spreadsheet import settings and saving/reopening
CSV can affect this mitigation; it is not a universal guarantee. See
[OWASP CSV Injection](https://community.owasp.org/attacks/CSV_Injection).

The CSV report holds a short summary block, a quality issue block, a blank line and then one row per column with type, filled cells, empty cells, unique values and fill rate. The JSON report carries the same numbers and issues in a nested structure and is easier to read from a script. Both are created with a `Blob` in the open tab and never leave the browser.

When you manually change the input, the source label and report source gain an
`(edited)` marker. The report then describes the current analyzed text, not an
unchanged copy of the selected file. Loading a file or the sample resets this
marker; the original file on your device is never modified.

## Scope

The app is intended for quick inspection rather than editing or validating against a formal CSV schema. Type inference is deliberately conservative.

For repeatable checks in a terminal or CI, use the companion
[csv-quality library and CLI](https://github.com/vugarbbakhishov-hub/csv-quality).
It supports completeness and duplicate-row gates that return a failing exit code
when an export does not meet your thresholds.

## Changelog

Release-by-release changes are listed in [CHANGELOG.md](CHANGELOG.md).

## Contributing

Bug reports and focused improvements are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## License

[MIT](LICENSE)
