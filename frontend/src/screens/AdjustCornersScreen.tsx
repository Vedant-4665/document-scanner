import { ArrowRight, CircleCheck, Crop, Maximize2, Undo2, X } from 'lucide-react'
import type { Corners } from '../api/client'
import { Alert } from '../components/Alert'
import { CornerEditor } from '../components/CornerEditor'
import { ActionBar } from '../components/ui/ActionBar'
import { buttonClass } from '../components/ui/buttons'
import { StepIndicator } from '../components/ui/StepIndicator'
import { wholeImageCorners } from '../lib/corners'
import type { PageDraft } from '../scanTypes'

type AdjustCornersScreenProps = {
  pageNumber: number
  draft: PageDraft
  onCornersChange: (corners: Corners) => void
  onContinue: () => void
  onCancel: () => void
}

// Step 2 for a page: check the outline the computer found, and fix it by hand if needed.
export function AdjustCornersScreen({ pageNumber, draft, onCornersChange, onContinue, onCancel }: AdjustCornersScreenProps) {
  const { image, detection, detectionError, corners } = draft

  return (
    <section className="flex flex-col gap-4">
      <StepIndicator current={2} />

      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Adjust the corners</h2>
          <p className="text-sm text-slate-500">Page {pageNumber} · drag the white circles onto the page's corners</p>
        </div>
        <button type="button" onClick={onCancel} className={buttonClass('ghost', 'sm')} aria-label="Cancel this page">
          <X className="size-4" /> <span className="hidden sm:inline">Cancel</span>
        </button>
      </div>

      {/* Be honest about what automatic detection did. */}
      {detectionError ? (
        <Alert kind="error">
          Automatic edge detection failed: {detectionError} Drag the four corners onto the page by hand.
        </Alert>
      ) : detection.found ? (
        <p className="inline-flex items-center gap-2 self-start rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200">
          <CircleCheck className="size-4 text-emerald-600" /> Page edges detected. Check they look right.
        </p>
      ) : (
        <Alert kind="warning">
          We couldn't find the page edges automatically. Drag the four corners onto the corners of the page.
        </Alert>
      )}

      <CornerEditor
        imageUrl={image.image_url}
        imageWidth={image.width}
        imageHeight={image.height}
        corners={corners}
        onChange={onCornersChange}
      />

      <div className="flex flex-wrap justify-center gap-2">
        {detection.found && (
          <button type="button" onClick={() => onCornersChange(detection.corners)} className={buttonClass('secondary', 'sm')}>
            <Undo2 className="size-4" /> Reset to detected
          </button>
        )}
        <button
          type="button"
          onClick={() => onCornersChange(wholeImageCorners(image.width, image.height))}
          className={buttonClass('secondary', 'sm')}
        >
          <Maximize2 className="size-4" /> Use whole image
        </button>
      </div>

      <ActionBar>
        <button type="button" onClick={onContinue} className={buttonClass('primary', 'lg')}>
          <Crop className="size-5" /> Crop page <ArrowRight className="size-5" />
        </button>
      </ActionBar>
    </section>
  )
}
