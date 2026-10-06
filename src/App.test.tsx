// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'

afterEach(cleanup)

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

describe('CSV input and report lifecycle', () => {
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
