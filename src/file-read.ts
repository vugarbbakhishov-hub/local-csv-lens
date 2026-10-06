/** Ignore reads superseded by a newer file or an explicit input change. */
export function createFileReadGuard() {
  let revision = 0
  return {
    cancel() { revision += 1 },
    async read(
      file: Pick<File, 'text'>,
      accept: (text: string) => void,
      reject: () => void,
    ) {
      const current = ++revision
      try {
        const text = await file.text()
        if (current === revision) accept(text)
      } catch {
        if (current === revision) reject()
      }
    },
  }
}
