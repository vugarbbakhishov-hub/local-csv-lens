import { describe, expect, it } from 'vitest'
import { analyzeDataset, buildQualityIssues, detectDelimiter, parseCsv } from './csv'

describe('detectDelimiter', () => {
  it.each([',', ';', '\t'] as const)('detects %s after leading blank lines and a multiline header', (delimiter) => {
    const input = '\uFEFF\r\n  \r\n"full\r\nname"' + delimiter + 'score\r\nAda' + delimiter + '10'
    expect(detectDelimiter(input)).toBe(delimiter)
    expect(parseCsv(input).rows).toEqual([['Ada', '10']])
  })

  it('does not count delimiters from later data rows', () => {
    expect(detectDelimiter('name\n"Ada;10;extra"')).toBe(',')
    expect(detectDelimiter('name;score\rAda,Extra;10')).toBe(';')
  })

  it('keeps tab-only headers and escaped quotes in the first record', () => {
    expect(detectDelimiter('\t\nAda\t10')).toBe('\t')
    expect(detectDelimiter('"say ""hello\nworld""";score\nAda;10')).toBe(';')
  })

  it('detects semicolon and tab separated input', () => {
    expect(detectDelimiter('name;score\nAda;10')).toBe(';')
    expect(detectDelimiter('name\tscore\nAda\t10')).toBe('\t')
  })
})

describe('parseCsv', () => {
  it.each(['ab"cd"', '"abc"tail', '"abc" "def"'])('rejects malformed field %s', (field) => {
    expect(() => parseCsv(`name\n${field}`)).toThrow(SyntaxError)
  })

  it.each([',', ';', '\t'] as const)('accepts spaces around quoted fields with %s separators', (delimiter) => {
    expect(parseCsv(`a${delimiter}b\n "one" ${delimiter}"two"\n"three"${delimiter}"four"`).rows).toEqual([['one', 'two'], ['three', 'four']])
  })

  it('reads many short rows while preserving a wider final row', () => {
    const dataset = parseCsv(`name,score\n${'Ada,10\n'.repeat(150_000)}Linus,11,extra`)
    expect(dataset.rows).toHaveLength(150_001)
    expect(dataset.headers).toEqual(['name', 'score', 'Column 3'])
    expect(dataset.rows[0]).toEqual(['Ada', '10', ''])
    expect(dataset.rows.at(-1)).toEqual(['Linus', '11', 'extra'])
  })

  it.each([',', ';', '\t'] as const)('preserves empty records separated by %s', (delimiter) => {
    const dataset = parseCsv(`name${delimiter}score\nAda${delimiter}10\n${delimiter}\n`)
    expect(dataset.rows).toEqual([['Ada', '10'], ['', '']])
    expect(analyzeDataset(dataset).completeness).toBe(50)
  })

  it('preserves quoted empty records at EOF while skipping blank lines', () => {
    expect(parseCsv('name\r\n\r\nAda\r\n""').rows).toEqual([['Ada'], ['']])
  })

  it('assigns names to empty headers without consuming data', () => {
    const dataset = parseCsv(',\nAda,10')
    expect(dataset.headers).toEqual(['Column 1', 'Column 2'])
    expect(dataset.rows).toEqual([['Ada', '10']])
  })

  it('handles quoted delimiters, escaped quotes and CRLF', () => {
    const dataset = parseCsv('name,note\r\nAda,"Hello, ""CSV"""\r\nLinus,Simple')

    expect(dataset.headers).toEqual(['name', 'note'])
    expect(dataset.rows).toEqual([
      ['Ada', 'Hello, "CSV"'],
      ['Linus', 'Simple'],
    ])
  })

  it('keeps line breaks inside quoted fields', () => {
    const dataset = parseCsv('name,note\nAda,"line one\nline two"')
    expect(dataset.rows[0]).toEqual(['Ada', 'line one\nline two'])
  })

  it('pads short rows and makes duplicate headers unique', () => {
    const dataset = parseCsv('name,name,\nAda,37')
    expect(dataset.headers).toEqual(['name', 'name 2', 'Column 3'])
    expect(dataset.rows[0]).toEqual(['Ada', '37', ''])
  })

  it('rejects an unclosed quoted field', () => {
    expect(() => parseCsv('name,note\nAda,"unfinished')).toThrow('not closed')
  })
})

describe('analyzeDataset', () => {
  it.each(['00123', '-00123', '+00123', '00.5', '0x10', '0b10', '0o10'])('classifies code-like value %s as text without changing it', (value) => {
    const dataset = parseCsv(`code\n${value}\n123\n""`)
    expect(analyzeDataset(dataset).columns[0].type).toBe('text')
    expect(dataset.rows[0][0]).toBe(value)
  })

  it('recognizes decimal and scientific notation while ignoring blank cells', () => {
    const dataset = parseCsv('value\n0\n-0\n+12\n0.5\n-.5\n12.\n1e3\n-2.5E-2\n""')
    expect(analyzeDataset(dataset).columns[0]).toMatchObject({ type: 'number', filled: 8 })
  })

  it.each(['2026-02-30', '2025-02-29', '1900-02-29', '2026-04-31', '2026-02-30T12:00:00Z'])('keeps impossible calendar date %s as text', (value) => {
    const result = analyzeDataset(parseCsv(`date\n2026-01-01\n${value}\n""`))
    expect(result.columns[0]).toMatchObject({ type: 'text', filled: 2 })
  })

  it.each(['2000-02-29', '2024-02-29', '2026-04-30', '2026-01-01T00:30:00+04:00', '2026-12-31T23:30:00-04:00'])('recognizes valid calendar date %s while ignoring blank cells', (value) => {
    expect(analyzeDataset(parseCsv(`date\n${value}\n""`)).columns[0]).toMatchObject({ type: 'date', filled: 1 })
  })

  it('reports completeness, duplicates and simple column types', () => {
    const dataset = parseCsv(
      'name,score,active,joined\nAda,10,true,2026-01-02\nAda,10,true,2026-01-02\nLinus,,false,2026-04-03',
    )
    const analysis = analyzeDataset(dataset)

    expect(analysis.rowCount).toBe(3)
    expect(analysis.columnCount).toBe(4)
    expect(analysis.emptyCellCount).toBe(1)
    expect(analysis.duplicateRowCount).toBe(1)
    expect(analysis.completeness).toBe(92)
    expect(analysis.columns.map((column) => column.type)).toEqual([
      'text',
      'number',
      'boolean',
      'date',
    ])
  })
})

describe('buildQualityIssues', () => {
  it('summarizes missing values, duplicate rows and empty columns', () => {
    const analysis = analyzeDataset(parseCsv('name,score,notes\nAda,10,\nAda,10,'))

    expect(buildQualityIssues(analysis)).toEqual([
      {
        severity: 'warning',
        title: 'Missing values',
        detail: '2 cells are blank across 3 columns.',
      },
      {
        severity: 'warning',
        title: 'Duplicate rows',
        detail: '1 row repeats an earlier row exactly.',
      },
      {
        severity: 'warning',
        title: 'Empty columns',
        detail: 'notes has no values.',
      },
    ])
  })

  it('returns a success issue when the quick scan finds no problems', () => {
    const analysis = analyzeDataset(parseCsv('name,score\nAda,10\nLinus,11'))

    expect(buildQualityIssues(analysis)).toEqual([
      {
        severity: 'success',
        title: 'No obvious issues',
        detail: 'No missing values, duplicate rows or empty columns were found in this quick scan.',
      },
    ])
  })
})
