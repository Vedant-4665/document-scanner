import { ArrowLeft, Calendar, Files, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { deleteScan, getScan, type ScanDetail } from '../api/client'
import { Alert } from '../components/Alert'
import { Lightbox } from '../components/Lightbox'
import { ExportPanel } from '../components/ExportPanel'
import { TextViewer } from '../components/TextViewer'
import { buttonClass } from '../components/ui/buttons'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useToast } from '../components/ui/Toast'
import { formatDate, formatRelative } from '../lib/time'

type Props = { scanId: string; onBack: () => void; onDeleted: () => void }

export function ScanDetailScreen({ scanId, onBack, onDeleted }: Props) {
  const showToast = useToast()
  const [scan, setScan]           = useState<ScanDetail | null>(null)
  const [error, setError]         = useState<string | null>(null)
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    let cancelled = false
    getScan(scanId)
      .then((r) => { if (!cancelled) setScan(r) })
      .catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load.') })
    return () => { cancelled = true }
  }, [scanId])

  async function handleDelete() {
    if (!scan) return
    setConfirmOpen(false); setIsDeleting(true); setError(null)
    try {
      await deleteScan(scan.id); showToast(`"${scan.title}" deleted`); onDeleted()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed.'); setIsDeleting(false)
    }
  }

  return (
    <section className="flex flex-col gap-5">
      <button type="button" onClick={onBack} className={`${buttonClass('ghost', 'sm')} -ml-1.5 self-start`}>
        <ArrowLeft className="size-3.5" /> History
      </button>

      {error && <Alert kind="error">{error}</Alert>}

      {/* Skeleton */}
      {!scan && !error && (
        <div className="flex flex-col gap-3">
          <div className="skeleton h-7 w-2/3 rounded-xl" />
          <div className="skeleton h-4 w-1/3 rounded-lg" />
          <div className="skeleton h-12 w-full rounded-xl" />
          <div className="flex gap-2">
            <div className="skeleton h-32 w-24 rounded-xl" />
            <div className="skeleton h-32 w-24 rounded-xl" />
          </div>
        </div>
      )}

      {scan && (
        <>
          {/* Title + meta */}
          <div>
            <h2 className="font-display text-2xl leading-tight text-[#1c1814] break-words">{scan.title}</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#d4c9bb] bg-[#f8f4ee] px-2.5 py-1 text-xs font-medium text-[#2e2118]" title={formatDate(scan.created_at)}>
                <Calendar className="size-3.5" /> {formatRelative(scan.created_at)}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#d4c9bb] bg-[#f8f4ee] px-2.5 py-1 text-xs font-medium text-[#2e2118]">
                <Files className="size-3.5" /> {scan.page_count} {scan.page_count === 1 ? 'page' : 'pages'}
              </span>
            </div>
          </div>

          <ExportPanel scan={scan} />

          {/* Pages strip */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#555047]">Pages · tap to enlarge</p>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
              {scan.pages.map((page, i) => (
                <button key={page.number} type="button" onClick={() => setViewerIndex(i)} className="group relative shrink-0 overflow-hidden rounded-xl border border-[#e2d9cc] bg-white p-1 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-amber-400 hover:shadow-md hover:shadow-amber-900/10 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none" aria-label={`View page ${page.number}`}>
                  <img src={page.image_url} alt="" className="h-36 w-[5.5rem] object-contain" />
                  <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded bg-[#1c1814]/65 px-1.5 text-[10px] font-bold text-white">{page.number}</span>
                </button>
              ))}
            </div>
          </div>

          <TextViewer pages={scan.pages} />

          {/* Delete zone */}
          <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
            <div>
              <p className="text-sm font-semibold text-red-900">Delete this scan</p>
              <p className="mt-0.5 text-xs text-red-700/80">Permanently removes the PDF, images and text.</p>
            </div>
            <button type="button" onClick={() => setConfirmOpen(true)} disabled={isDeleting} className={`${buttonClass('secondary', 'sm')} border-red-300 text-red-700 hover:bg-red-100`}>
              <Trash2 className="size-3.5" /> {isDeleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>

          <Lightbox images={scan.pages.map((p) => ({ src: p.image_url, originalSrc: p.original_url, label: `Page ${p.number}` }))} index={viewerIndex} onIndexChange={setViewerIndex} />
          <ConfirmDialog open={confirmOpen} title="Delete this scan?" message={`"${scan.title}" and its PDF will be permanently removed. This can't be undone.`} confirmLabel="Delete" onConfirm={() => void handleDelete()} onCancel={() => setConfirmOpen(false)} />
        </>
      )}
    </section>
  )
}
