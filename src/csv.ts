export type CsvDataset = {
  headers: string[]
  rows: string[][]
  delimiter: ',' | ';' | '\t'
}

export type ColumnProfile = {
  name: string
  type: 'number' | 'date' | 'boolean' | 'text' | 'empty'
  filled: number
  unique: number
}

export type CsvAnalysis = {
  rowCount: number
  columnCount: number
  emptyCellCount: number
  duplicateRowCount: number
  completeness: number
  columns: ColumnProfile[]
}

export type QualityIssue = {
  severity: 'warning' | 'info' | 'success'
  title: string
  detail: string
}

const delimiters = [',', ';', '\t'] as const

function countDelimiter(line: string, delimiter: string): number {
  let count = 0
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]
    if (character === '"') {
      if (inQuotes && line[index + 1] === '"') {
        index += 1
      } else {
        inQuotes = !inQuotes
      }
    } else if (character === delimiter && !inQuotes) {
      count += 1
    }
  }

  return count
}

export function detectDelimiter(input: string): CsvDataset['delimiter'] {
  const firstLogicalLine = input.replace(/^\uFEFF/, '').split(/\r?\n/, 1)[0] ?? ''
  return delimiters.reduce((best, candidate) =>
    countDelimiter(firstLogicalLine, candidate) > countDelimiter(firstLogicalLine, best)
      ? candidate
      : best,
  )
}

function readRows(input: string, delimiter: CsvDataset['delimiter']): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false
  let hasRecordSyntax = false
  const source = input.replace(/^\uFEFF/, '')

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]

    if (character === '"') {
      hasRecordSyntax = true
      if (inQuotes && source[index + 1] === '"') {
        cell += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
    } else if (character === delimiter && !inQuotes) {
      hasRecordSyntax = true
      row.push(cell.trim())
      cell = ''
    } else if ((character === '\n' || character === '\r') && !inQuotes) {
      if (character === '\r' && source[index + 1] === '\n') index += 1
      row.push(cell.trim())
      if (hasRecordSyntax || row.some((value) => value.length > 0)) rows.push(row)
      row = []
      cell = ''
      hasRecordSyntax = false
    } else {
      cell += character
    }
  }

  row.push(cell.trim())
  if (hasRecordSyntax || row.some((value) => value.length > 0)) rows.push(row)

  if (inQuotes) throw new Error('A quoted field is not closed.')
  return rows
}

function uniqueHeader(name: string, index: number, used: Set<string>): string {
  const base = name.trim() || `Column ${index + 1}`
  let next = base
  let suffix = 2
  while (used.has(next.toLowerCase())) {
    next = `${base} ${suffix}`
    suffix += 1
  }
  used.add(next.toLowerCase())
  return next
}

export function parseCsv(input: string): CsvDataset {
  if (!input.trim()) throw new Error('Add CSV text or choose a CSV file first.')

  const delimiter = detectDelimiter(input)
  const parsedRows = readRows(input, delimiter)
  if (parsedRows.length === 0) throw new Error('The CSV does not contain any rows.')

  const width = Math.max(...parsedRows.map((row) => row.length))
  const usedHeaders = new Set<string>()
  const headers = Array.from({ length: width }, (_, index) =>
    uniqueHeader(parsedRows[0]?.[index] ?? '', index, usedHeaders),
  )
  const rows = parsedRows
    .slice(1)
    .map((row) => Array.from({ length: width }, (_, index) => row[index] ?? ''))

  return { headers, rows, delimiter }
}

function inferType(values: string[]): ColumnProfile['type'] {
  const populated = values.filter(Boolean)
  if (populated.length === 0) return 'empty'
  if (populated.every((value) => Number.isFinite(Number(value)))) return 'number'
  if (populated.every((value) => /^(true|false|yes|no)$/i.test(value))) return 'boolean'
  if (
    populated.every(
      (value) => /^\d{4}-\d{2}-\d{2}(?:[T\s].*)?$/.test(value) && !Number.isNaN(Date.parse(value)),
    )
  ) {
    return 'date'
  }
  return 'text'
}

export function analyzeDataset(dataset: CsvDataset): CsvAnalysis {
  const totalCells = dataset.rows.length * dataset.headers.length
  const emptyCellCount = dataset.rows.reduce(
    (total, row) => total + row.filter((cell) => cell === '').length,
    0,
  )
  const seenRows = new Set<string>()
  let duplicateRowCount = 0

  dataset.rows.forEach((row) => {
    const key = JSON.stringify(row)
    if (seenRows.has(key)) duplicateRowCount += 1
    seenRows.add(key)
  })

  const columns = dataset.headers.map((name, index) => {
    const values = dataset.rows.map((row) => row[index] ?? '')
    const populated = values.filter(Boolean)
    return {
      name,
      type: inferType(values),
      filled: populated.length,
      unique: new Set(populated).size,
    }
  })

  return {
    rowCount: dataset.rows.length,
    columnCount: dataset.headers.length,
    emptyCellCount,
    duplicateRowCount,
    completeness: totalCells === 0 ? 100 : Math.round(((totalCells - emptyCellCount) / totalCells) * 100),
    columns,
  }
}

function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`
}

function summarizeColumns(names: string[]): string {
  if (names.length <= 3) return names.join(', ')
  return `${names.slice(0, 3).join(', ')} and ${names.length - 3} more`
}

function verb(count: number, singular: string, pluralForm: string): string {
  return count === 1 ? singular : pluralForm
}

/** Turns the numeric analysis into a short review checklist for the UI and reports. */
export function buildQualityIssues(analysis: CsvAnalysis): QualityIssue[] {
  const issues: QualityIssue[] = []

  if (analysis.rowCount === 0) {
    issues.push({
      severity: 'warning',
      title: 'No data rows',
      detail: 'The file only has headers, so there is no row data to inspect.',
    })
  }

  if (analysis.emptyCellCount > 0) {
    issues.push({
      severity: 'warning',
      title: 'Missing values',
      detail: `${plural(analysis.emptyCellCount, 'cell')} ${verb(
        analysis.emptyCellCount,
        'is',
        'are',
      )} blank across ${plural(
        analysis.columnCount,
        'column',
      )}.`,
    })
  }

  if (analysis.duplicateRowCount > 0) {
    issues.push({
      severity: 'warning',
      title: 'Duplicate rows',
      detail: `${plural(analysis.duplicateRowCount, 'row')} ${verb(
        analysis.duplicateRowCount,
        'repeats',
        'repeat',
      )} an earlier row exactly.`,
    })
  }

  const emptyColumns = analysis.columns
    .filter((column) => column.type === 'empty')
    .map((column) => column.name)
  if (emptyColumns.length > 0) {
    issues.push({
      severity: 'warning',
      title: 'Empty columns',
      detail: `${summarizeColumns(emptyColumns)} ${emptyColumns.length === 1 ? 'has' : 'have'} no values.`,
    })
  }

  const sparseColumns = analysis.columns
    .filter((column) => column.filled > 0 && analysis.rowCount > 0)
    .filter((column) => Math.round((column.filled / analysis.rowCount) * 100) < 80)
    .map((column) => column.name)
  if (sparseColumns.length > 0) {
    issues.push({
      severity: 'info',
      title: 'Sparse columns',
      detail: `${summarizeColumns(sparseColumns)} ${
        sparseColumns.length === 1 ? 'is' : 'are'
      } below 80% filled.`,
    })
  }

  if (issues.length === 0) {
    issues.push({
      severity: 'success',
      title: 'No obvious issues',
      detail: 'No missing values, duplicate rows or empty columns were found in this quick scan.',
    })
  }

  return issues
}
