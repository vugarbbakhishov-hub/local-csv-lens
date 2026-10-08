import { describe, expect, it } from 'vitest'
import { analyzeDataset, parseCsv } from './csv'
import {
  buildReportCsv,
  buildReportJson,
  escapeCsvValue,
  fillRate,
  reportFileName,
  reportMimeType,
  type ReportMeta,
} from './report'

const meta: ReportMeta = {
  fileName: 'people.csv',
  delimiter: ',',
  generatedAt: '2026-09-15T08:00:00.000Z',
}

const dataset = parseCsv(
  'name,score,active\nAda,10,true\nAda,10,true\nLinus,,false',
)
const analysis = analyzeDataset(dataset)

it('exports code-like column types consistently without numeric coercion', () => {
  const result = analyzeDataset(parseCsv('postal\n00123\n00456'))
  expect(JSON.parse(buildReportJson(result, meta)).columns[0].type).toBe('text')
  expect(buildReportCsv(result, meta)).toContain('postal,text,2,0,2,100')
})

describe('buildReportCsv', () => {
  it('keeps the summary, issues and column profile in readable blocks', () => {
    const lines = buildReportCsv(analysis, meta).split('\n')
    const blankLine = lines.indexOf('')

    expect(lines[0]).toBe('Local CSV Lens report')
    expect(lines.slice(1, blankLine)).toEqual([
      'Source,people.csv',
      'Generated,2026-09-15T08:00:00.000Z',
      'Delimiter,Comma',
      'Data rows,3',
      'Columns,3',
      'Empty cells,1',
      'Duplicate rows,1',
      'Completeness (%),89',
    ])
    expect(lines[blankLine + 1]).toBe('Issues')
    expect(lines).toContain('warning,Missing values,1 cell is blank across 3 columns.')
    expect(lines).toContain('warning,Duplicate rows,1 row repeats an earlier row exactly.')
    expect(lines).toContain('Column,Type,Filled,Empty,Unique,Fill rate (%)')
  })

  it('reports empty cells and fill rate per column', () => {
    const lines = buildReportCsv(analysis, meta).split('\n')

    expect(lines).toContain('name,text,3,0,2,100')
    expect(lines).toContain('score,number,2,1,1,67')
  })

  it('quotes header names that contain a delimiter or a quote', () => {
    const tricky = analyzeDataset(parseCsv('"score, total","he said ""hi"""\n10,yes'))

    expect(buildReportCsv(tricky, meta).split('\n')).toContain(
      '"score, total",number,1,0,1,100',
    )
    expect(escapeCsvValue('he said "hi"')).toBe('"he said ""hi"""')
  })
})

describe('buildReportJson', () => {
  it('describes the same numbers as valid JSON', () => {
    const report = JSON.parse(buildReportJson(analysis, meta))

    expect(report.source).toBe('people.csv')
    expect(report.generatedAt).toBe('2026-09-15T08:00:00.000Z')
    expect(report.summary).toEqual({
      rowCount: 3,
      columnCount: 3,
      emptyCellCount: 1,
      duplicateRowCount: 1,
      completenessPercent: 89,
    })
    expect(report.issues).toEqual([
      {
        severity: 'warning',
        title: 'Missing values',
        detail: '1 cell is blank across 3 columns.',
      },
      {
        severity: 'warning',
        title: 'Duplicate rows',
        detail: '1 row repeats an earlier row exactly.',
      },
      {
        severity: 'info',
        title: 'Sparse columns',
        detail: 'score is below 80% filled.',
      },
    ])
    expect(report.columns[1]).toEqual({
      name: 'score',
      type: 'number',
      filled: 2,
      empty: 1,
      unique: 1,
      fillRatePercent: 67,
    })
  })
})

describe('reportFileName', () => {
  it('reuses the source name and drops unsafe characters', () => {
    expect(reportFileName('people.csv', 'csv')).toBe('people-report.csv')
    expect(reportFileName('Q3 sales (final).csv', 'json')).toBe('Q3-sales-final-report.json')
    expect(reportFileName('Untitled CSV', 'csv')).toBe('Untitled-CSV-report.csv')
  })

  it('falls back when the name has nothing usable left', () => {
    expect(reportFileName('   ', 'json')).toBe('csv-report.json')
  })
})

describe('fillRate and reportMimeType', () => {
  it('stays at zero for an empty dataset instead of dividing by zero', () => {
    expect(fillRate(0, 0)).toBe(0)
    expect(fillRate(1, 3)).toBe(33)
  })

  it('labels each download with its own media type', () => {
    expect(reportMimeType('csv')).toBe('text/csv;charset=utf-8')
    expect(reportMimeType('json')).toBe('application/json;charset=utf-8')
  })
})
