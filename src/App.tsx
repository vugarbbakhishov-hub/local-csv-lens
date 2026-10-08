import { useMemo, useState, type ChangeEvent } from 'react'
import { createFileReadGuard } from './file-read'
import { analyzeDataset, buildQualityIssues, parseCsv, type CsvDataset } from './csv'
import {
  buildReportCsv,
  buildReportJson,
  reportFileName,
  reportMimeType,
  type ReportFormat,
} from './report'

const sampleCsv = `name,team,score,active,joined
Ada Lovelace,Analytics,98,true,2026-01-12
Grace Hopper,Platform,96,true,2026-02-03
Linus Torvalds,Platform,,true,2026-02-18
Margaret Hamilton,Research,99,true,2026-03-01
Grace Hopper,Platform,96,true,2026-02-03`

const delimiterLabel = { ',': 'Comma', ';': 'Semicolon', '\t': 'Tab' }

function App() {
  const [fileRead] = useState(createFileReadGuard)
  const [csvText, setCsvText] = useState(sampleCsv)
  const [fileName, setFileName] = useState('sample.csv')
  const [edited, setEdited] = useState(false)
  const sourceName = edited ? `${fileName} (edited)` : fileName
  const [dataset, setDataset] = useState<CsvDataset>(() => parseCsv(sampleCsv))
  const [error, setError] = useState('')
  const [readingFile, setReadingFile] = useState<string | null>(null)
  const [analyzedText, setAnalyzedText] = useState<string | null>(sampleCsv)
  const resultsCurrent = analyzedText === csvText && !error
  const analysis = useMemo(() => analyzeDataset(dataset), [dataset])
  const qualityIssues = useMemo(() => buildQualityIssues(analysis), [analysis])

  const cancelFileRead = () => {
    fileRead.cancel()
    setReadingFile(null)
  }

  const inspect = (text = csvText) => {
    try {
      setDataset(parseCsv(text))
      setAnalyzedText(text)
      setError('')
    } catch (nextError) {
      setAnalyzedText(null)
      setError(nextError instanceof Error ? nextError.message : 'Could not read this CSV.')
    }
  }

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setAnalyzedText(null)
    setError('')
    setReadingFile(file.name)
    await fileRead.read(file, (text) => {
      setReadingFile(null)
      setCsvText(text)
      setFileName(file.name)
      setEdited(false)
      inspect(text)
    }, () => {
      setReadingFile(null)
      setError('Could not read this file. Choose it again or paste CSV text.')
    })
  }

  const loadSample = () => {
    cancelFileRead()
    setCsvText(sampleCsv)
    setFileName('sample.csv')
    setEdited(false)
    inspect(sampleCsv)
  }

  const clear = () => {
    cancelFileRead()
    setAnalyzedText(null)
    setCsvText('')
    setFileName('Untitled CSV')
    setEdited(false)
    setError('')
  }

  const downloadReport = (format: ReportFormat) => {
    if (!resultsCurrent) return
    const meta = {
      fileName: sourceName,
      delimiter: dataset.delimiter,
      generatedAt: new Date().toISOString(),
    }
    const content =
      format === 'csv' ? buildReportCsv(analysis, meta) : buildReportJson(analysis, meta)
    const url = URL.createObjectURL(new Blob([content], { type: reportMimeType(format) }))
    const link = document.createElement('a')

    link.href = url
    link.download = reportFileName(fileName, format)
    document.body.append(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Local CSV Lens home">
          <span className="brand-mark" aria-hidden="true">L</span>
          <span>Local CSV Lens</span>
        </a>
        <span className="privacy-pill"><span aria-hidden="true">●</span> Browser only</span>
      </header>

      <section className="hero" id="top">
        <div>
          <p className="eyebrow">Private by design</p>
          <h1>Understand a CSV<br />before you trust it.</h1>
          <p className="hero-copy">
            Inspect structure, missing values, duplicate rows and column types. Your data stays in
            this browser tab.
          </p>
        </div>
        <div className="hero-note" aria-label="How it works">
          <span>01</span>
          <p>Choose a file or paste CSV text.</p>
          <span>02</span>
          <p>Review the instant quality summary.</p>
        </div>
      </section>

      <section className="workspace" aria-labelledby="workspace-title">
        <div className="panel input-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Input</p>
              <h2 id="workspace-title">Inspect your data</h2>
            </div>
            <span className="file-name" title={sourceName}>{sourceName}</span>
          </div>

          <label className="file-drop">
            <input type="file" accept=".csv,text/csv" onChange={onFileChange} />
            <span className="upload-icon" aria-hidden="true">↑</span>
            <span><strong>Choose a CSV file</strong><small>Nothing is uploaded</small></span>
          </label>

          <label className="textarea-label" htmlFor="csv-input">Or paste CSV text</label>
          <p className="report-note">
            No file handy? Download fictional examples and open them above:{' '}
            <a href="./samples/quality-check.csv" download>Missing values and duplicates</a>
            {' · '}<a href="./samples/type-check.csv" download>Codes and dates</a>.
            {' '}<a href="https://github.com/vugarbbakhishov-hub/local-csv-lens/blob/main/docs/try-it.md">See expected results</a>.
          </p>
          <textarea
            id="csv-input"
            value={csvText}
            onChange={(event) => {
              cancelFileRead()
              setCsvText(event.target.value)
              setEdited(true)
              setError('')
            }}
            spellCheck={false}
          />
          {error && <p className="error" role="alert">{error}</p>}
          <div className="actions">
            <button className="primary" type="button" onClick={() => {
              cancelFileRead()
              inspect()
            }}>Analyze data</button>
            <button type="button" onClick={loadSample}>Load sample</button>
            <button type="button" onClick={clear}>Clear</button>
          </div>
        </div>

        <div className="panel results-panel" aria-live="polite">
          {!resultsCurrent ? (
            <>
              <p className="eyebrow">Overview</p>
              {readingFile !== null ? (
                <>
                  <h2>Reading your file</h2>
                  <p role="status">Reading {readingFile}… Results will appear when the file is ready.</p>
                </>
              ) : (
                <>
                  <h2>Analyze your current data</h2>
                  <p>Run Analyze data to see results and download a report for the current input.</p>
                </>
              )}
            </>
          ) : (
            <>
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Overview</p>
              <h2>Quality snapshot</h2>
            </div>
            <span className="delimiter">{delimiterLabel[dataset.delimiter]} separated</span>
          </div>

          <div className="metric-grid">
            <article><strong>{analysis.rowCount}</strong><span>Data rows</span></article>
            <article><strong>{analysis.columnCount}</strong><span>Columns</span></article>
            <article><strong>{analysis.emptyCellCount}</strong><span>Empty cells</span></article>
            <article><strong>{analysis.duplicateRowCount}</strong><span>Duplicate rows</span></article>
          </div>

          <div className="completeness">
            <div><span>Completeness</span><strong>{analysis.completeness}%</strong></div>
            <progress max="100" value={analysis.completeness}>{analysis.completeness}%</progress>
          </div>

          <div className="issue-list">
            <h3>Quality issues</h3>
            {qualityIssues.map((issue) => (
              <article className={`issue issue-${issue.severity}`} key={`${issue.title}-${issue.detail}`}>
                <span>{issue.severity}</span>
                <div>
                  <strong>{issue.title}</strong>
                  <p>{issue.detail}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="column-list">
            <h3>Column profile</h3>
            {analysis.columns.map((column) => (
              <article key={column.name}>
                <div><strong>{column.name}</strong><span>{column.filled} filled · {column.unique} unique</span></div>
                <span className={`type type-${column.type}`}>{column.type}</span>
              </article>
            ))}
          </div>

          <div className="report">
            <div className="actions">
              <button type="button" onClick={() => downloadReport('csv')}>
                Download CSV report
              </button>
              <button type="button" onClick={() => downloadReport('json')}>
                Download JSON report
              </button>
            </div>
            <p className="report-note">
              The report is written in this tab and saved straight to your device.
              {' '}CSV adds an apostrophe to formula-like text. Choose JSON for exact names and text.
            </p>
          </div>
            </>
          )}
        </div>
      </section>

      {resultsCurrent && <section className="preview-section" aria-labelledby="preview-title">
        <div className="panel-heading">
          <div><p className="eyebrow">Preview</p><h2 id="preview-title">First 10 rows</h2></div>
          <span>{Math.min(dataset.rows.length, 10)} of {dataset.rows.length}</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr>{dataset.headers.map((header) => <th key={header} scope="col">{header}</th>)}</tr></thead>
            <tbody>
              {dataset.rows.slice(0, 10).map((row, rowIndex) => (
                <tr key={`${rowIndex}-${row.join('|')}`}>
                  {row.map((cell, cellIndex) => (
                    <td className={cell === '' ? 'empty-cell' : ''} key={`${cellIndex}-${cell}`}>
                      {cell || 'Empty'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>}

      <footer>
        <p>Built for quick, local data checks. No analytics. No uploads.</p>
        <p>
          <a href="https://github.com/vugarbbakhishov-hub/local-csv-lens/issues/new?template=bug_report.yml">Report a problem</a>
          {' · '}
          <a href="https://github.com/vugarbbakhishov-hub/local-csv-lens/issues/new?template=usability_feedback.yml">Share feedback</a>
        </p>
        <p>Feedback opens GitHub. Only text you submit is shared; your CSV is not attached.</p>
      </footer>
    </main>
  )
}

export default App
