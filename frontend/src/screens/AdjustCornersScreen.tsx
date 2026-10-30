import { ArrowRight, CircleCheck, Crop, Maximize2, Undo2, X } from 'lucide-react'
import type { Corners } from '../api/client'
import { Alert } from '../components/Alert'
import { CornerEditor } from '../components/CornerEditor'
import { ActionBar } from '../components/ui/ActionBar'
import { buttonClass } from '../components/ui/buttons'
import { StepIndicator } from '../components/ui/StepIndicator'
import { wholeImageCorners } from '../lib/corners'
import type { PageDraft } from '../scanTypes'

type Props = {
  pageNumber: number; draft: PageDraft
  onCornersChange: (c: Corners) => void; onContinue: () => void; onCancel: () => void
}

export function AdjustCornersScreen({ pageNumber, draft, onCornersChange, onContinue, onCancel }: Props) {
  const { image, detection, detectionError, corners } = draft
  return (
    <section className="flex flex-col gap-5">
      <StepIndicator current={2} />

      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl text-[#1c1814]">Adjust the corners</h2>
          <p className="text-sm text-[#555047]">Page {pageNumber} · drag the handles to the page corners</p>
        </div>
        <button type="button" onClick={onCancel} className={buttonClass('ghost', 'sm')} aria-label="Cancel"><X className="size-3.5" /> Cancel</button>
      </div>

      {/* Detection status */}
      {detectionError
        ? <Alert kind="error">Detection failed: {detectionError} — drag the corners manually.</Alert>
        : detection.found
          ? (
            <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-800">
              <CircleCheck className="size-4 text-green-700 shrink-0" />
              Page edges detected automatically — check they look right.
            </div>
          )
          : <Alert kind="warning">Couldn't find edges automatically — drag the four corners onto the page.</Alert>
      }

      <CornerEditor imageUrl={image.image_url} imageWidth={image.width} imageHeight={image.height} corners={corners} onChange={onCornersChange} />

      <div className="flex flex-wrap justify-center gap-2">
        {detection.found && (
          <button type="button" onClick={() => onCornersChange(detection.corners)} className={buttonClass('secondary', 'sm')}><Undo2 className="size-3.5" /> Reset to detected</button>
        )}
        <button type="button" onClick={() => onCornersChange(wholeImageCorners(image.width, image.height))} className={buttonClass('secondary', 'sm')}><Maximize2 className="size-3.5" /> Use whole image</button>
      </div>

      <ActionBar>
        <button type="button" onClick={onCancel} className={buttonClass('secondary', 'lg')}>Cancel</button>
        <button type="button" onClick={onContinue} className={buttonClass('primary', 'lg')}><Crop className="size-4" /> Crop page <ArrowRight className="size-4" /></button>
      </ActionBar>
    </section>
  )
}
