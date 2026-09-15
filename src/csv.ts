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
  const source = input.replace(/^\uFEFF/, '')

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]

    if (character === '"') {
      if (inQuotes && source[index + 1] === '"') {
        cell += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
    } else if (character === delimiter && !inQuotes) {
      row.push(cell.trim())
      cell = ''
    } else if ((character === '\n' || character === '\r') && !inQuotes) {
      if (character === '\r' && source[index + 1] === '\n') index += 1
      row.push(cell.trim())
      if (row.some((value) => value.length > 0)) rows.push(row)
      row = []
      cell = ''
    } else {
      cell += character
    }
  }

  row.push(cell.trim())
  if (row.some((value) => value.length > 0)) rows.push(row)

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
