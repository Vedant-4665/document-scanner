import { ArrowRight, Contrast, Crop, Lightbulb, ScanText, Sun } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { detectCorners, uploadImage, type UploadedImage } from '../api/client'
import { Alert } from '../components/Alert'
import { CaptureOptions } from '../components/CaptureOptions'
import { PageGrid } from '../components/PageGrid'
import { ScanningPreview } from '../components/ScanningPreview'
import { buttonClass } from '../components/ui/buttons'
import { StepIndicator } from '../components/ui/StepIndicator'
import { wholeImageCorners } from '../lib/corners'
import { validateImageFile } from '../lib/validateImageFile'
import type { Page, PageDraft } from '../scanTypes'

type ScanScreenProps = {
  pages: Page[]
  onPageStarted: (draft: PageDraft) => void // a new photo is uploaded and ready to adjust
  onMovePage: (index: number, direction: -1 | 1) => void
  onEditPage: (index: number) => void
  onRemovePage: (index: number) => void
  onReview: () => void
}

// The home screen: the document's pages so far, and ways to add another.
export function ScanScreen({ pages, onPageStarted, onMovePage, onEditPage, onRemovePage, onReview }: ScanScreenProps) {
  // A temporary browser-only URL for the chosen file, so the preview appears
  // instantly, before the upload finishes.
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null)
  const [stage, setStage] = useState<'uploading' | 'detecting'>('uploading')
  const [error, setError] = useState<string | null>(null)

  // Free the memory used by a temporary preview URL when it is replaced.
  useEffect(() => {
    return () => {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl)
    }
  }, [localPreviewUrl])

  async function handleFileChosen(file: File) {
    setError(null)
    const problem = validateImageFile(file)
    if (problem) {
      setError(problem)
      return
    }

    setLocalPreviewUrl(URL.createObjectURL(file))
    setStage('uploading')
    let image: UploadedImage
    try {
      image = await uploadImage(file)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
      setLocalPreviewUrl(null)
      return
    }

    setStage('detecting')
    const draft = { image, enhancement: 'original', rotation: 0 } as const
    try {
      const detection = await detectCorners(image.filename)
      onPageStarted({ ...draft, detection, detectionError: null, corners: detection.corners })
    } catch (err) {
      // Detection failing is not the end: the user can still place corners by hand.
      const corners = wholeImageCorners(image.width, image.height)
      onPageStarted({
        ...draft,
        detection: { corners, found: false },
        detectionError: err instanceof Error ? err.message : 'Unknown error',
        corners,
      })
    }
  }

  // While uploading: the photo with the scanning animation.
  if (localPreviewUrl) {
    return (
      <section className="flex flex-col gap-5">
        <StepIndicator current={1} />
        <h2 className="text-center text-xl font-bold tracking-tight">Analysing page {pages.length + 1}…</h2>
        <ScanningPreview src={localPreviewUrl} stage={stage} />
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

        <CaptureOptions variant="hero" onFileChosen={(file) => void handleFileChosen(file)} />

        <div className="rounded-3xl border border-slate-200 bg-white/70 p-4 sm:p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Lightbulb className="size-4 text-amber-500" /> Tips for a great scan
          </h3>
          <ul className="grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
            <Tip icon={<Contrast className="size-4" />}>Put the page on a darker surface</Tip>
            <Tip icon={<Sun className="size-4" />}>Use even light, avoid hard shadows</Tip>
            <Tip icon={<Crop className="size-4" />}>Keep all four corners in the photo</Tip>
          </ul>
        </div>
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
        <CaptureOptions variant="tile" onFileChosen={(file) => void handleFileChosen(file)} />
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

function Tip({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-center gap-2.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
        {icon}
      </span>
      {children}
    </li>
  )
}
