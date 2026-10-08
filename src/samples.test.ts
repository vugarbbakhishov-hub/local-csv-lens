import { expect, it } from 'vitest'
import { analyzeDataset, parseCsv } from './csv'
import qualitySample from '../public/samples/quality-check.csv?raw'
import typeSample from '../public/samples/type-check.csv?raw'

it.each([
  ['quality-check.csv', 3, 2, 2, 1, 67, ['text', 'number']],
  ['type-check.csv', 2, 3, 0, 0, 100, ['text', 'text', 'number']],
] as const)('keeps downloadable %s consistent with the walkthrough', (name, rows, columns, empty, duplicates, completeness, types) => {
  const text = name === 'quality-check.csv' ? qualitySample : typeSample
  const result = analyzeDataset(parseCsv(text))
  expect(result).toMatchObject({ rowCount: rows, columnCount: columns, emptyCellCount: empty, duplicateRowCount: duplicates, completeness })
  expect(result.columns.map((column) => column.type)).toEqual(types)
})
