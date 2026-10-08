// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function pendingFile(name = 'pending.csv') {
  let resolve!: (value: string) => void
  let reject!: (reason: Error) => void
  const promise = new Promise<string>((yes, no) => { resolve = yes; reject = no })
  const file = new File([], name, { type: 'text/csv' })
  Object.defineProperty(file, 'text', { value: () => promise })
  return { file, resolve, reject }
}

function select(file: File) {
  fireEvent.change(screen.getByLabelText(/Choose a CSV file/), { target: { files: [file] } })
}

function input() { return screen.getByRole('textbox') as HTMLTextAreaElement }
function download() { return screen.queryByRole('button', { name: 'Download JSON report' }) }

function captureDownloads() {
  const blobs: Blob[] = []
  const filenames: string[] = []
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn((blob: Blob) => { blobs.push(blob); return 'blob:test-report' }),
    revokeObjectURL: vi.fn(),
  })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    filenames.push(this.download)
  })
  return { blobs, filenames }
}

function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(blob)
  })
}

describe('CSV input and report lifecycle', () => {
  it('shows quote-boundary errors and restores reports after correction', () => {
    render(<App />)
    fireEvent.change(input(), { target: { value: 'name\n"abc"tail' } })
    fireEvent.click(screen.getByRole('button', { name: 'Analyze data' }))
    expect(screen.getByRole('alert').textContent).toContain('after closing quote')
    expect(download()).toBeNull()
    expect(screen.queryByRole('table')).toBeNull()
    fireEvent.change(input(), { target: { value: 'name\n"abc"' } })
    fireEvent.click(screen.getByRole('button', { name: 'Analyze data' }))
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByRole('cell', { name: 'abc' })).toBeTruthy()
    expect(download()).not.toBeNull()
  })

  it('announces the current file until it finishes, ignoring obsolete read failures', async () => {
    render(<App />)
    const older = pendingFile('older.csv')
    const newer = pendingFile('newer.csv')
    select(older.file)
    expect(screen.getByRole('status').textContent).toContain('Reading older.csv')
    select(newer.file)
    await act(async () => { older.reject(new Error('obsolete')) })
    expect(screen.getByRole('status').textContent).toContain('Reading newer.csv')
    expect(screen.queryByText('Analyze your current data')).toBeNull()
    await act(async () => { newer.resolve('name\nReady') })
    expect(screen.queryByRole('status')).toBeNull()
    expect(download()).not.toBeNull()
  })

  it.each(['Clear', 'Load sample', 'Analyze data', 'edit'])('clears pending file status after %s', async (action) => {
    render(<App />)
    const pending = pendingFile()
    select(pending.file)
    expect(screen.getByRole('status')).toBeTruthy()
    if (action === 'edit') fireEvent.change(input(), { target: { value: 'name\nEdited' } })
    else fireEvent.click(screen.getByRole('button', { name: action }))
    expect(screen.queryByRole('status')).toBeNull()
    await act(async () => { pending.resolve('name\nObsolete') })
    expect(screen.queryByRole('status')).toBeNull()
    expect(input().value).not.toContain('Obsolete')
  })

  it('removes the reading status when the current file fails', async () => {
    render(<App />)
    const pending = pendingFile()
    select(pending.file)
    expect(screen.getByRole('status')).toBeTruthy()
    await act(async () => { pending.reject(new Error('unreadable')) })
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.getByRole('alert')).toBeTruthy()
  })

  it('exports the selected file summary and marks edited reports in both formats', async () => {
    const saved = captureDownloads()
    render(<App />)
    const file = pendingFile('people.csv')
    select(file.file)
    await act(async () => { file.resolve('name,score\nAda,10\n,') })
    fireEvent.click(screen.getByRole('button', { name: 'Download JSON report' }))
    const original = JSON.parse(await readBlob(saved.blobs[0]))
    expect(original.source).toBe('people.csv')
    expect(original.summary).toMatchObject({ rowCount: 2, columnCount: 2, emptyCellCount: 2, completenessPercent: 50 })

    fireEvent.change(input(), { target: { value: 'name,score\nAda,10' } })
    expect(screen.getByText('people.csv (edited)')).toBeTruthy()
    expect(download()).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Analyze data' }))
    fireEvent.click(screen.getByRole('button', { name: 'Download JSON report' }))
    fireEvent.click(screen.getByRole('button', { name: 'Download CSV report' }))
    const edited = JSON.parse(await readBlob(saved.blobs[1]))
    expect(edited.source).toBe('people.csv (edited)')
    expect(edited.summary).toMatchObject({ rowCount: 1, emptyCellCount: 0, completenessPercent: 100 })
    const csv = await readBlob(saved.blobs[2])
    expect(csv).toContain('Source,people.csv (edited)')
    expect(csv).toContain('Data rows,1')
    expect(csv).toContain('Completeness (%),100')
    expect(saved.filenames).toEqual(['people-report.json', 'people-report.json', 'people-report.csv'])
  })

  it('resets the edited source label when loading the sample or a new file', async () => {
    render(<App />)
    fireEvent.change(input(), { target: { value: 'name\nChanged' } })
    expect(screen.getByText('sample.csv (edited)')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Load sample' }))
    expect(screen.getByText('sample.csv')).toBeTruthy()
    fireEvent.change(input(), { target: { value: 'name\nChanged again' } })
    const file = pendingFile('fresh.csv')
    select(file.file)
    await act(async () => { file.resolve('name\nFresh') })
    expect(screen.getByText('fresh.csv')).toBeTruthy()
    expect(screen.queryByText(/\(edited\)/)).toBeNull()
  })

  it('keeps Clear authoritative when an earlier file finishes reading', async () => {
    render(<App />)
    const pending = pendingFile()
    select(pending.file)
    expect(download()).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
    await act(async () => { pending.resolve('name\nOld file') })
    expect(input().value).toBe('')
    expect(screen.getByText('Untitled CSV')).toBeTruthy()
    expect(download()).toBeNull()
  })

  it('keeps the sample after an obsolete file fails', async () => {
    render(<App />)
    const sample = input().value
    const pending = pendingFile()
    select(pending.file)
    fireEvent.click(screen.getByRole('button', { name: 'Load sample' }))
    await act(async () => { pending.reject(new Error('unreadable')) })
    expect(input().value).toBe(sample)
    expect(screen.queryByRole('alert')).toBeNull()
    expect(download()).not.toBeNull()
  })

  it('keeps edited and reanalyzed text when an old read completes', async () => {
    render(<App />)
    const pending = pendingFile()
    select(pending.file)
    fireEvent.change(input(), { target: { value: 'name\nCurrent text' } })
    expect(download()).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Analyze data' }))
    await act(async () => { pending.resolve('name\nOld file') })
    expect(input().value).toBe('name\nCurrent text')
    expect(screen.getByRole('cell', { name: 'Current text' })).toBeTruthy()
    expect(download()).not.toBeNull()
  })

  it('uses the most recently selected file even if it completes first', async () => {
    render(<App />)
    const older = pendingFile('older.csv')
    const newer = pendingFile('newer.csv')
    select(older.file)
    select(newer.file)
    await act(async () => { newer.resolve('name\nNew data') })
    await act(async () => { older.resolve('name\nOld data') })
    expect(input().value).toBe('name\nNew data')
    expect(screen.getByText('newer.csv')).toBeTruthy()
    expect(screen.queryByText('older.csv')).toBeNull()
  })

  it('shows current read errors and restores results on retry', async () => {
    render(<App />)
    const failed = pendingFile()
    select(failed.file)
    await act(async () => { failed.reject(new Error('unreadable')) })
    expect(screen.getByRole('alert').textContent).toContain('Could not read this file')
    expect(download()).toBeNull()
    const retry = pendingFile()
    select(retry.file)
    await act(async () => { retry.resolve('name\nRecovered') })
    expect(screen.queryByRole('alert')).toBeNull()
    expect(download()).not.toBeNull()
  })

  it('hides stale reports after editing, including when parsing fails', () => {
    render(<App />)
    expect(download()).not.toBeNull()
    fireEvent.change(input(), { target: { value: 'name\n"unfinished' } })
    expect(download()).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Analyze data' }))
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(download()).toBeNull()
    expect(screen.queryByRole('table')).toBeNull()
  })
})
