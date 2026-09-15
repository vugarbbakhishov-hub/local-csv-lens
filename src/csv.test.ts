import { describe, expect, it } from 'vitest'
import { analyzeDataset, detectDelimiter, parseCsv } from './csv'

describe('detectDelimiter', () => {
  it('detects semicolon and tab separated input', () => {
    expect(detectDelimiter('name;score\nAda;10')).toBe(';')
    expect(detectDelimiter('name\tscore\nAda\t10')).toBe('\t')
  })
})

describe('parseCsv', () => {
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
