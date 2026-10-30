import { ArrowLeft, CircleCheck, FileText, History, Plus, ScanText, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createScan, type ScanDetail } from '../api/client'
import { Alert } from '../components/Alert'
import { ExportPanel } from '../components/ExportPanel'
import { TextViewer } from '../components/TextViewer'
import { buttonClass } from '../components/ui/buttons'
import { StepIndicator } from '../components/ui/StepIndicator'
import { useToast } from '../components/ui/Toast'
import type { Page } from '../scanTypes'

type ReviewScreenProps = {
  pages: Page[]
  onBack: () => void
  onNewScan: () => void
  onSaved: () => void
  onViewHistory: () => void
}

// Rough OCR time per page, only used for the "about N seconds" hint.
const SECONDS_PER_PAGE = 2

// A default title like "Scan 28 Oct 2026".
function defaultTitle() {
  const date = new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
  return `Scan ${date}`
}

// Step 4: name the scan, create and save the searchable PDF, then download it
// and read the text that was recognised.
export function ReviewScreen({ pages, onBack, onNewScan, onSaved, onViewHistory }: ReviewScreenProps) {
  const showToast = useToast()
  const [title, setTitle] = useState(defaultTitle)
  const [startedAt, setStartedAt] = useState<number | null>(null) // set while creating
  const [now, setNow] = useState(() => Date.now())
  const [error, setError] = useState<string | null>(null)
  const [scan, setScan] = useState<ScanDetail | null>(null)
  const isCreating = startedAt !== null

  // Tick once a second while working, for the elapsed-time counter.
  useEffect(() => {
    if (!isCreating) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [isCreating])

  async function handleCreate() {
    setError(null)
    setNow(Date.now())
    setStartedAt(Date.now())
    try {
      const created = await createScan(title, pages.map((page) => page.processed.filename))
      setScan(created)
      onSaved()
      showToast('PDF created and saved to history')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Creating the PDF failed.')
    } finally {
      setStartedAt(null)
    }
  }

  const pageWord = pages.length === 1 ? 'page' : 'pages'

  // --- After: success, download and text ---
  if (scan) {
    return (
      <section className="flex flex-col gap-5">
        <div className="flex flex-col items-center gap-2 rounded-3xl border border-emerald-500/20 bg-gradient-to-b from-emerald-500/10 to-gray-900/50 p-6 text-center backdrop-blur-sm">
          <span className="flex size-14 animate-pop-in items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
            <CircleCheck className="size-8" />
          </span>
          <h2 className="text-xl font-bold tracking-tight text-gray-100 break-words">{scan.title}</h2>
          <p className="text-sm text-gray-400">
            Saved to history · {scan.page_count} {scan.page_count === 1 ? 'page' : 'pages'} · searchable PDF
          </p>
        </div>

        <ExportPanel scan={scan} />
        <TextViewer pages={scan.pages} />

        <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
          <button type="button" onClick={onViewHistory} className={buttonClass('secondary', 'lg')}>
            <History className="size-5" /> History
          </button>
          <button type="button" onClick={onNewScan} className={buttonClass('primary', 'lg')}>
            <Plus className="size-5" /> New scan
          </button>
        </div>
      </section>
    )
  }

  // --- Before: title, pages, create button (or progress while working) ---
  const elapsed = startedAt ? Math.max(0, Math.round((now - startedAt) / 1000)) : 0
  return (
    <section className="flex flex-col gap-5">
      <StepIndicator current={4} />

      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-gray-100">Review & save</h2>
          <p className="text-sm text-gray-400">
            {pages.length} {pageWord} ready · the text will be read and saved with the PDF
          </p>
        </div>
        <button type="button" onClick={onBack} disabled={isCreating} className={buttonClass('ghost', 'sm')}>
          <ArrowLeft className="size-4" /> Pages
        </button>
      </div>

      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
        {pages.map((page, index) => (
          <figure key={page.image.id} className="relative shrink-0">
            <img
              src={page.processed.image_url}
              alt={`Page ${index + 1}`}
              className="h-36 w-28 rounded-xl border border-gray-700/60 bg-gray-900/60 object-contain p-1 shadow-sm"
            />
            <figcaption className="absolute bottom-1.5 left-1/2 -translate-x-1/2 rounded-full bg-gray-950/80 px-2 text-xs font-semibold text-gray-300">
              {index + 1}
            </figcaption>
          </figure>
        ))}
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-gray-300">Title</span>
        <span className="relative">
          <FileText className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={100}
            disabled={isCreating}
            placeholder="e.g. Electricity bill October"
            className="h-12 w-full rounded-xl border border-gray-700/80 bg-gray-800/60 pr-3 pl-11 text-gray-100 placeholder-gray-500 shadow-sm backdrop-blur-sm transition focus:border-teal-500/60 focus:ring-4 focus:ring-teal-500/20 focus:outline-none disabled:bg-gray-900/40 disabled:text-gray-500"
          />
        </span>
      </label>

      {error && <Alert kind="error">{error}</Alert>}

      {isCreating ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-teal-500/20 bg-gray-800/40 p-6 text-center shadow-sm backdrop-blur-sm" role="status">
          <span className="relative flex size-14 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-400">
            <ScanText className="size-7" />
            <span className="absolute inset-0 animate-ping rounded-2xl bg-teal-500/20 opacity-40" />
          </span>
          <p className="font-semibold text-gray-200">
            Reading the text on {pages.length} {pageWord}…
          </p>
          <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-gray-700/60">
            <div className="h-full w-2/5 animate-indeterminate rounded-full bg-gradient-to-r from-teal-500 to-cyan-400" />
          </div>
          <p className="text-xs text-gray-500">
            {elapsed}s · usually about {pages.length * SECONDS_PER_PAGE}–{pages.length * SECONDS_PER_PAGE * 3} seconds
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => void handleCreate()}
          disabled={!title.trim()}
          className={`${buttonClass('primary', 'lg')} w-full sm:w-auto sm:self-end`}
        >
          <Sparkles className="size-5" /> Create and save PDF
        </button>
      )}
    </section>
  )
}
