import { buildQualityIssues, type CsvAnalysis, type CsvDataset } from './csv'

export type ReportMeta = {
  fileName: string
  delimiter: CsvDataset['delimiter']
  generatedAt: string
}

export type ReportFormat = 'csv' | 'json'

const delimiterNames: Record<CsvDataset['delimiter'], string> = {
  ',': 'Comma',
  ';': 'Semicolon',
  '\t': 'Tab',
}

export function escapeCsvValue(value: string | number): string {
  const text = String(value)
  return /["\r\n,]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function toCsvRow(values: Array<string | number>): string {
  return values.map(escapeCsvValue).join(',')
}

export function fillRate(filled: number, rowCount: number): number {
  if (rowCount === 0) return 0
  return Math.round((filled / rowCount) * 100)
}

/** Report rows are built once so the CSV and the JSON never drift apart. */
function describeColumns(analysis: CsvAnalysis) {
  return analysis.columns.map((column) => ({
    name: column.name,
    type: column.type,
    filled: column.filled,
    empty: analysis.rowCount - column.filled,
    unique: column.unique,
    fillRatePercent: fillRate(column.filled, analysis.rowCount),
  }))
}

export function buildReportCsv(analysis: CsvAnalysis, meta: ReportMeta): string {
  const summary: Array<Array<string | number>> = [
    ['Local CSV Lens report'],
    ['Source', meta.fileName],
    ['Generated', meta.generatedAt],
    ['Delimiter', delimiterNames[meta.delimiter]],
    ['Data rows', analysis.rowCount],
    ['Columns', analysis.columnCount],
    ['Empty cells', analysis.emptyCellCount],
    ['Duplicate rows', analysis.duplicateRowCount],
    ['Completeness (%)', analysis.completeness],
  ]

  const profile: Array<Array<string | number>> = [
    ['Column', 'Type', 'Filled', 'Empty', 'Unique', 'Fill rate (%)'],
    ...describeColumns(analysis).map((column) => [
      column.name,
      column.type,
      column.filled,
      column.empty,
      column.unique,
      column.fillRatePercent,
    ]),
  ]
  const issues: Array<Array<string | number>> = [
    ['Severity', 'Issue', 'Detail'],
    ...buildQualityIssues(analysis).map((issue) => [
      issue.severity,
      issue.title,
      issue.detail,
    ]),
  ]

  return [
    ...summary.map(toCsvRow),
    '',
    'Issues',
    ...issues.map(toCsvRow),
    '',
    ...profile.map(toCsvRow),
  ].join('\n')
}

export function buildReportJson(analysis: CsvAnalysis, meta: ReportMeta): string {
  return `${JSON.stringify(
    {
      tool: 'local-csv-lens',
      source: meta.fileName,
      generatedAt: meta.generatedAt,
      delimiter: delimiterNames[meta.delimiter],
      summary: {
        rowCount: analysis.rowCount,
        columnCount: analysis.columnCount,
        emptyCellCount: analysis.emptyCellCount,
        duplicateRowCount: analysis.duplicateRowCount,
        completenessPercent: analysis.completeness,
      },
      issues: buildQualityIssues(analysis),
      columns: describeColumns(analysis),
    },
    null,
    2,
  )}\n`
}

export function reportFileName(sourceName: string, format: ReportFormat): string {
  const withoutExtension = sourceName.replace(/\.[^./\\]+$/, '')
  const safe = withoutExtension
    .replace(/[^\w.-]+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
  return `${safe || 'csv'}-report.${format}`
}

export function reportMimeType(format: ReportFormat): string {
  return format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json;charset=utf-8'
}
