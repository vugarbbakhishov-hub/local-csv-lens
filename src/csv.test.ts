import { describe, expect, it } from 'vitest'
import { analyzeDataset, buildQualityIssues, detectDelimiter, parseCsv } from './csv'

describe('detectDelimiter', () => {
  it('detects semicolon and tab separated input', () => {
    expect(detectDelimiter('name;score\nAda;10')).toBe(';')
    expect(detectDelimiter('name\tscore\nAda\t10')).toBe('\t')
  })
})

describe('parseCsv', () => {
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
