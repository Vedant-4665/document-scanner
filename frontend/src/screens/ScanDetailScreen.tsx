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

type ScanDetailScreenProps = {
  scanId: string
  onBack: () => void
  onDeleted: () => void
}

// One saved scan: its pages (tap to view full screen), downloads, text, and delete.
export function ScanDetailScreen({ scanId, onBack, onDeleted }: ScanDetailScreenProps) {
  const showToast = useToast()
  const [scan, setScan] = useState<ScanDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    let cancelled = false
    getScan(scanId)
      .then((result) => {
        if (!cancelled) setScan(result)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load this scan.')
      })
    return () => {
      cancelled = true
    }
  }, [scanId])

  async function handleDelete() {
    if (!scan) return
    setConfirmOpen(false)
    setIsDeleting(true)
    setError(null)
    try {
      await deleteScan(scan.id)
      showToast(`"${scan.title}" deleted`)
      onDeleted()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.')
      setIsDeleting(false)
    }
  }

  return (
    <section className="flex flex-col gap-5">
      <button type="button" onClick={onBack} className={`${buttonClass('ghost', 'sm')} -ml-2 self-start`}>
        <ArrowLeft className="size-4" /> History
      </button>

      {error && <Alert kind="error">{error}</Alert>}

      {!scan && !error && (
        <div className="flex flex-col gap-3" aria-label="Loading">
          <div className="skeleton h-7 w-2/3 rounded-lg" />
          <div className="skeleton h-4 w-1/3 rounded" />
          <div className="skeleton h-12 w-full rounded-xl" />
          <div className="flex gap-3">
            <div className="skeleton h-36 w-28 rounded-xl" />
            <div className="skeleton h-36 w-28 rounded-xl" />
          </div>
        </div>
      )}

      {scan && (
        <>
          <div>
            <h2 className="text-2xl font-bold tracking-tight break-words">{scan.title}</h2>
            <div className="mt-2 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 ring-1 ring-slate-200" title={formatDate(scan.created_at)}>
                <Calendar className="size-3.5" /> {formatRelative(scan.created_at)}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">
                <Files className="size-3.5" /> {scan.page_count} {scan.page_count === 1 ? 'page' : 'pages'}
              </span>
            </div>
          </div>

          <ExportPanel scan={scan} />

          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Pages · tap to enlarge</h3>
            <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
              {scan.pages.map((page, index) => (
                <button
                  key={page.number}
                  type="button"
                  onClick={() => setViewerIndex(index)}
                  className="group relative shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-4 focus-visible:ring-indigo-200 focus-visible:outline-none"
                  aria-label={`View page ${page.number}`}
                >
                  <img src={page.image_url} alt="" className="h-40 w-30 object-contain" />
                  <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-slate-900/80 px-2 text-xs font-semibold text-white">
                    {page.number}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <TextViewer pages={scan.pages} />

          <div className="flex items-center justify-between gap-3 rounded-2xl border border-red-100 bg-red-50/50 p-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">Delete this scan</p>
              <p className="text-xs text-slate-500">Removes the PDF, page images and text.</p>
            </div>
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              disabled={isDeleting}
              className={`${buttonClass('secondary', 'sm')} text-red-600`}
            >
              <Trash2 className="size-4" /> {isDeleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>

          <Lightbox
            images={scan.pages.map((page) => ({ src: page.image_url, originalSrc: page.original_url, label: `Page ${page.number}` }))}
            index={viewerIndex}
            onIndexChange={setViewerIndex}
          />
          <ConfirmDialog
            open={confirmOpen}
            title="Delete this scan?"
            message={`"${scan.title}" and its PDF will be permanently removed. This can't be undone.`}
            confirmLabel="Delete"
            onConfirm={() => void handleDelete()}
            onCancel={() => setConfirmOpen(false)}
          />
        </>
      )}
    </section>
  )
}
