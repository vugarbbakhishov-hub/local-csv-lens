import { describe, expect, it, vi } from 'vitest'
import { createFileReadGuard } from './file-read'

function pendingFile() {
  let resolve!: (text: string) => void
  let reject!: (error: Error) => void
  const promise = new Promise<string>((yes, no) => { resolve = yes; reject = no })
  return { text: () => promise, resolve, reject }
}

describe('file reading', () => {
  it('accepts the latest file when an older file finishes last', async () => {
    const guard = createFileReadGuard()
    const older = pendingFile()
    const newer = pendingFile()
    const accept = vi.fn()
    const reject = vi.fn()
    const first = guard.read(older, accept, reject)
    const second = guard.read(newer, accept, reject)
    newer.resolve('new data')
    await second
    older.resolve('old data')
    await first
    expect(accept.mock.calls).toEqual([['new data']])
    expect(reject).not.toHaveBeenCalled()
  })

  it('does not restore a file after the user changes or clears input', async () => {
    const guard = createFileReadGuard()
    const file = pendingFile()
    const accept = vi.fn()
    const reject = vi.fn()
    const read = guard.read(file, accept, reject)
    guard.cancel()
    file.resolve('obsolete data')
    await read
    expect(accept).not.toHaveBeenCalled()
    expect(reject).not.toHaveBeenCalled()
  })

  it('ignores an old failure while preserving the current error', async () => {
    const guard = createFileReadGuard()
    const old = pendingFile()
    const current = pendingFile()
    const rejectOld = vi.fn()
    const rejectCurrent = vi.fn()
    const first = guard.read(old, vi.fn(), rejectOld)
    const second = guard.read(current, vi.fn(), rejectCurrent)
    old.reject(new Error('old failure'))
    current.reject(new Error('current failure'))
    await Promise.all([first, second])
    expect(rejectOld).not.toHaveBeenCalled()
    expect(rejectCurrent).toHaveBeenCalledOnce()
  })

  it('accepts a new file after cancellation', async () => {
    const guard = createFileReadGuard()
    guard.cancel()
    const accept = vi.fn()
    await guard.read({ text: async () => 'retry' }, accept, vi.fn())
    expect(accept).toHaveBeenCalledWith('retry')
  })
})
