# Local CSV Lens

Local CSV Lens is a small React and TypeScript utility for checking a CSV before importing it into another tool. It reports rows, columns, empty cells, duplicate rows, completeness and simple column types. All parsing happens in the browser; the selected data is not uploaded.

## Live demo

[Open Local CSV Lens](https://vugarbbakhishov-hub.github.io/local-csv-lens/)

## Features

- Paste CSV text or choose a local `.csv` file
- Detect comma, semicolon and tab delimiters
- Parse quoted fields, escaped quotes and line breaks inside quoted cells
- Report missing cells, exact duplicate rows and completeness
- Infer number, date, boolean, text and empty columns
- Preview the first ten data rows
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

## Privacy

The app has no backend, analytics or upload endpoint. File contents are read with the browser `File` API and stay in the current tab.

## Scope

This first version is intended for quick inspection rather than editing or validating against a formal CSV schema. Type inference is deliberately conservative.

## Contributing

Bug reports and focused improvements are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## License

[MIT](LICENSE)
