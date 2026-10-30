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

type Props = {
  pages: Page[]; onBack: () => void; onNewScan: () => void
  onSaved: () => void; onViewHistory: () => void
}

const SECS_PER_PAGE = 2
function defaultTitle() {
  return `Scan ${new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`
}

export function ReviewScreen({ pages, onBack, onNewScan, onSaved, onViewHistory }: Props) {
  const showToast = useToast()
  const [title, setTitle]         = useState(defaultTitle)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [now, setNow]             = useState(() => Date.now())
  const [error, setError]         = useState<string | null>(null)
  const [scan, setScan]           = useState<ScanDetail | null>(null)
  const isCreating = startedAt !== null

  useEffect(() => {
    if (!isCreating) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [isCreating])

  async function handleCreate() {
    setError(null); setNow(Date.now()); setStartedAt(Date.now())
    try {
      const created = await createScan(title, pages.map((p) => p.processed.filename))
      setScan(created); onSaved(); showToast('PDF created and saved')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Creating the PDF failed.')
    } finally { setStartedAt(null) }
  }

  const pw = pages.length === 1 ? 'page' : 'pages'

  /* ── Success ── */
  if (scan) {
    return (
      <section className="flex flex-col gap-5">
        {/* success banner */}
        <div className="flex items-center gap-4 rounded-2xl border border-green-200 bg-green-50 p-5 shadow-sm shadow-green-900/5">
          <span className="flex size-12 shrink-0 animate-pop-in items-center justify-center rounded-xl bg-green-700 text-white shadow-md shadow-green-700/30">
            <CircleCheck className="size-6" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-green-900">{scan.title}</p>
            <p className="text-sm text-green-700">
              Saved · {scan.page_count} {scan.page_count === 1 ? 'page' : 'pages'} · searchable PDF
            </p>
          </div>
        </div>
        <ExportPanel scan={scan} />
        <TextViewer pages={scan.pages} />
        <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
          <button type="button" onClick={onViewHistory} className={buttonClass('secondary', 'lg')}><History className="size-4" /> History</button>
          <button type="button" onClick={onNewScan}     className={buttonClass('primary', 'lg')}><Plus className="size-4" /> New scan</button>
        </div>
      </section>
    )
  }

  /* ── Pre-create ── */
  const elapsed = startedAt ? Math.max(0, Math.round((now - startedAt) / 1000)) : 0
  return (
    <section className="flex flex-col gap-5">
      <StepIndicator current={4} />

      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl text-[#1c1814]">Review & save</h2>
          <p className="text-sm text-[#555047]">{pages.length} {pw} · text will be read and saved with the PDF</p>
        </div>
        <button type="button" onClick={onBack} disabled={isCreating} className={buttonClass('ghost', 'sm')}><ArrowLeft className="size-3.5" /> Pages</button>
      </div>

      {/* Page strip */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {pages.map((page, i) => (
          <figure key={page.image.id} className="relative shrink-0">
            <img src={page.processed.image_url} alt={`Page ${i + 1}`} className="h-32 w-24 rounded-xl border border-[#e2d9cc] bg-white object-contain p-1 shadow-sm" />
            <figcaption className="absolute bottom-1.5 left-1/2 -translate-x-1/2 rounded bg-[#1c1814]/65 px-1.5 text-[10px] font-bold text-white">{i + 1}</figcaption>
          </figure>
        ))}
      </div>

      {/* Title */}
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-widest text-[#555047]">Title</span>
        <div className="relative">
          <FileText className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#555047]" />
          <input
            type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            maxLength={100} disabled={isCreating}
            placeholder="e.g. Electricity bill October"
            className="h-11 w-full rounded-xl border border-[#d4c9bb] bg-white pl-9 pr-4 text-sm text-[#1c1814] placeholder-[#555047] shadow-sm transition-all focus:border-amber-500 focus:ring-3 focus:ring-amber-500/15 focus:outline-none disabled:bg-[#f8f4ee] disabled:text-[#555047]"
          />
        </div>
      </label>

      {error && <Alert kind="error">{error}</Alert>}

      {/* Creating progress */}
      {isCreating ? (
        <div className="flex items-center gap-4 rounded-2xl border border-[#e2d9cc] bg-amber-50 p-5" role="status">
          <span className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <ScanText className="size-5" />
            <span className="absolute inset-0 animate-ping rounded-xl bg-amber-200 opacity-50" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[#1c1814]">Reading text on {pages.length} {pw}…</p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-amber-200">
              <div className="h-full w-2/5 animate-indeterminate rounded-full bg-amber-700" />
            </div>
            <p className="mt-1 text-xs text-[#555047]">{elapsed}s · ~{pages.length * SECS_PER_PAGE}–{pages.length * SECS_PER_PAGE * 3}s total</p>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => void handleCreate()} disabled={!title.trim()} className={`${buttonClass('primary', 'lg')} w-full shadow-md shadow-amber-900/15 sm:w-auto sm:self-end`}>
          <Sparkles className="size-4" /> Create and save PDF
        </button>
      )}
    </section>
  )
}
