import { ArrowRight, ScanText, X } from 'lucide-react'
import { Alert } from '../components/Alert'
import { CaptureOptions } from '../components/CaptureOptions'
import { PageGrid } from '../components/PageGrid'
import { ScanningPreview } from '../components/ScanningPreview'
import { buttonClass } from '../components/ui/buttons'
import { StepIndicator } from '../components/ui/StepIndicator'
import type { Analysis, Page } from '../scanTypes'

type ScanScreenProps = {
  pages: Page[]
  analysis: Analysis | null // set while a chosen photo is being uploaded and analysed
  error: string | null // why the last photo couldn't be added
  onFileChosen: (file: File) => void
  onCancelAnalysis: () => void
  onMovePage: (index: number, direction: -1 | 1) => void
  onEditPage: (index: number) => void
  onRemovePage: (index: number) => void
  onReview: () => void
}

// The home screen: the document's pages so far, and ways to add another.
export function ScanScreen({
  pages,
  analysis,
  error,
  onFileChosen,
  onCancelAnalysis,
  onMovePage,
  onEditPage,
  onRemovePage,
  onReview,
}: ScanScreenProps) {
  // While a photo is being analysed: the photo with the scanning animation,
  // and a Cancel button for when the wrong photo was chosen.
  if (analysis) {
    return (
      <section className="flex flex-col gap-5">
        <StepIndicator current={1} />
        {/* Cancel sits next to the title, so it is visible without scrolling on a phone. */}
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold tracking-tight">Analysing page {pages.length + 1}…</h2>
          <button type="button" onClick={onCancelAnalysis} className={buttonClass('secondary', 'sm')}>
            <X className="size-4" /> Cancel
          </button>
        </div>
        <ScanningPreview src={analysis.previewUrl} stage={analysis.stage} />
      </section>
    )
  }

  // No pages yet: welcome screen with big capture buttons and tips.
  if (pages.length === 0) {
    return (
      <section className="flex flex-col gap-6">
        <div className="pt-2 text-center">
          <span className="mx-auto mb-4 flex size-16 items-center justify-center rounded-3xl bg-white text-indigo-600 shadow-lg shadow-indigo-500/10 ring-1 ring-slate-200">
            <ScanText className="size-8" />
          </span>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Scan a document</h2>
          <p className="mx-auto mt-2 max-w-md text-slate-600">
            Snap a photo of each page. We'll straighten it, clean it up, read the text and turn it
            into a searchable PDF.
          </p>
        </div>

        {error && <Alert kind="error">{error}</Alert>}

        <CaptureOptions variant="hero" onFileChosen={onFileChosen} />

       
      </section>
    )
  }

  // Pages exist: grid of pages, "Add page" tile, and the button to continue.
  const pageWord = pages.length === 1 ? 'page' : 'pages'
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Your document</h2>
          <p className="text-sm text-slate-500">
            {pages.length} {pageWord} · tap a page to edit it
          </p>
        </div>
        {/* Desktop only; phones get the big sticky button at the bottom instead. */}
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

      {/* On phones, the main button sits just above the bottom tab bar. */}
      <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-20 sm:hidden">
        <button type="button" onClick={onReview} className={`${buttonClass('primary', 'lg')} w-full shadow-lg`}>
          Review & save {pages.length} {pageWord} <ArrowRight className="size-5" />
        </button>
      </div>
    </section>
  )
}


