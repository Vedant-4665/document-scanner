import { ArrowRight, ScanText, X } from 'lucide-react'
import { Alert } from '../components/Alert'
import { CaptureOptions } from '../components/CaptureOptions'
import { PageGrid } from '../components/PageGrid'
import { ScanningPreview } from '../components/ScanningPreview'
import { buttonClass } from '../components/ui/buttons'
import { StepIndicator } from '../components/ui/StepIndicator'
import type { Analysis, Page } from '../scanTypes'

type ScanScreenProps = {
  pages: Page[]; analysis: Analysis | null; error: string | null
  onFileChosen: (file: File) => void; onCancelAnalysis: () => void
  onMovePage: (index: number, direction: -1 | 1) => void
  onEditPage: (index: number) => void; onRemovePage: (index: number) => void; onReview: () => void
}

export function ScanScreen({ pages, analysis, error, onFileChosen, onCancelAnalysis, onMovePage, onEditPage, onRemovePage, onReview }: ScanScreenProps) {

  /* Analysing */
  if (analysis) {
    return (
      <section className="flex flex-col gap-5">
        <StepIndicator current={1} />
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl text-[#1c1814]">Analysing page {pages.length + 1}…</h2>
          <button type="button" onClick={onCancelAnalysis} className={buttonClass('secondary', 'sm')}>
            <X className="size-3.5" /> Cancel
          </button>
        </div>
        <ScanningPreview src={analysis.previewUrl} stage={analysis.stage} />
      </section>
    )
  }

  /* Empty hero */
  if (pages.length === 0) {
    return (
      <section className="flex flex-col gap-8">
        {/* Hero card */}
        <div className="overflow-hidden rounded-2xl border border-[#e2d9cc] bg-white shadow-sm shadow-amber-900/5">
          {/* amber header band */}
          <div className="flex items-center gap-4 bg-amber-700 px-6 py-5">
            <span className="flex size-12 items-center justify-center rounded-xl bg-amber-600 shadow-inner">
              <ScanText className="size-6 text-amber-100" />
            </span>
            <div>
              <h1 className="font-display text-2xl text-white">Scan a document</h1>
              <p className="mt-0.5 text-[13px] text-amber-200">Camera or file upload · straighten · OCR · PDF</p>
            </div>
          </div>
          <div className="px-6 py-5">
            <p className="text-sm leading-relaxed text-[#2e2118]">
              Snap a photo of each page or upload an image. We'll automatically find the edges, clean
              it up, read the text and export a searchable PDF you can download or share.
            </p>
          </div>
        </div>

        {error && <Alert kind="error">{error}</Alert>}
        <CaptureOptions variant="hero" onFileChosen={onFileChosen} />
      </section>
    )
  }

  /* Has pages */
  const pw = pages.length === 1 ? 'page' : 'pages'
  return (
    <section className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl text-[#1c1814]">Your document</h2>
          <p className="text-sm text-[#555047]">{pages.length} {pw} · tap to edit</p>
        </div>
        <div className="hidden sm:block">
          <button type="button" onClick={onReview} className={buttonClass('primary')}>
            Review & save <ArrowRight className="size-4" />
          </button>
        </div>
      </div>

      {error && <Alert kind="error">{error}</Alert>}

      <PageGrid pages={pages} onMove={onMovePage} onEdit={onEditPage} onRemove={onRemovePage}>
        <CaptureOptions variant="tile" onFileChosen={onFileChosen} />
      </PageGrid>

      <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-20 sm:hidden">
        <button type="button" onClick={onReview} className={`${buttonClass('primary', 'lg')} w-full shadow-lg shadow-amber-900/15`}>
          Review & save {pages.length} {pw} <ArrowRight className="size-4" />
        </button>
      </div>
    </section>
  )
}
