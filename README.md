# Local CSV Lens

Local CSV Lens is a small React and TypeScript utility for checking a CSV before importing it into another tool. It reports rows, columns, empty cells, duplicate rows, completeness and simple column types, and it can save that result as a CSV or JSON report. All parsing happens in the browser; the selected data is not uploaded.

## Live demo

[Open Local CSV Lens](https://vugarbbakhishov-hub.github.io/local-csv-lens/)

Latest release: [v0.4.0](https://github.com/vugarbbakhishov-hub/local-csv-lens/releases/tag/v0.4.0)
— reliable file switching, corrected CSV edge cases and reports that identify edited input.

## Try it in two minutes

1. Open the demo and review the built-in sample: **5 rows, 5 columns, 1 empty cell, 1 duplicate row, 96% completeness**.
2. Download a JSON report and compare its summary with the screen.
3. Edit a value. Results and downloads stay hidden until you choose **Analyze data** again.
4. [Share your experience](https://github.com/vugarbbakhishov-hub/local-csv-lens/issues/new?template=usability_feedback.yml) or [report a problem](https://github.com/vugarbbakhishov-hub/local-csv-lens/issues/new?template=bug_report.yml). GitHub submissions are public; use fictional examples only. The app does not attach your input automatically.

## Features

- Paste CSV text or choose a local `.csv` file
- See the selected file's reading status until results or a read error are ready
- Detect comma, semicolon and tab delimiters
- Parse quoted fields, escaped quotes and line breaks inside quoted cells
- Report missing cells, exact duplicate rows and completeness
- Highlight quality issues such as missing values, duplicate rows, empty columns and sparse columns
- Infer number, date, boolean, text and empty columns
- Validate calendar dates, including leap years; a column with an impossible date is classified as text. Blank cells do not determine the type.
- Preview the first ten data rows
- Download the result as a CSV or JSON report, written in the browser
- Responsive interface with keyboard focus and status feedback

## Run locally

```bash
npm install
npm run dev
```

Then open the local URL printed by Vite.

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

## Privacy

The app has no backend, analytics or upload endpoint. File contents are read with the browser `File` API and stay in the current tab.

## Reports

The CSV report holds a short summary block, a quality issue block, a blank line and then one row per column with type, filled cells, empty cells, unique values and fill rate. The JSON report carries the same numbers and issues in a nested structure and is easier to read from a script. Both are created with a `Blob` in the open tab and never leave the browser.

When you manually change the input, the source label and report source gain an
`(edited)` marker. The report then describes the current analyzed text, not an
unchanged copy of the selected file. Loading a file or the sample resets this
marker; the original file on your device is never modified.

## Scope

The app is intended for quick inspection rather than editing or validating against a formal CSV schema. Type inference is deliberately conservative.

## Changelog

Release-by-release changes are listed in [CHANGELOG.md](CHANGELOG.md).

## Contributing

Bug reports and focused improvements are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## License

[MIT](LICENSE)
