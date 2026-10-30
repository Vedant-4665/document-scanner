import { ArrowLeft, Check, Contrast, Eye, Loader2, Palette, RotateCcw, RotateCw, X } from 'lucide-react'
import { useEffect, useState, type KeyboardEvent, type ReactNode } from 'react'
import { processImage, type Enhancement, type ProcessedImage, type Rotation } from '../api/client'
import { Alert } from '../components/Alert'
import { ActionBar } from '../components/ui/ActionBar'
import { buttonClass, iconButtonClass } from '../components/ui/buttons'
import { StepIndicator } from '../components/ui/StepIndicator'
import type { PageDraft } from '../scanTypes'

type Props = {
  pageNumber: number; draft: PageDraft
  onEnhancementChange: (e: Enhancement) => void; onRotationChange: (r: Rotation) => void
  onSave: (p: ProcessedImage) => void; onBack: () => void; onCancel: () => void
}

const LOOK_OPTIONS: { value: Enhancement; label: string; hint: string; icon: ReactNode }[] = [
  { value: 'original',    label: 'Colour',       hint: 'As photographed',        icon: <Palette  className="size-4" /> },
  { value: 'black_white', label: 'Black & white', hint: 'Crisp text, no shadow',  icon: <Contrast className="size-4" /> },
]

export function PageResultScreen({ pageNumber, draft, onEnhancementChange, onRotationChange, onSave, onBack, onCancel }: Props) {
  const { image, corners, enhancement, rotation } = draft
  const [result, setResult]       = useState<ProcessedImage | null>(null)
  const [isProcessing, setIsProcessing] = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [attempt, setAttempt]     = useState(0)
  const [showOriginal, setShowOriginal] = useState(false)

  useEffect(() => {
    let cancelled = false
    processImage({ filename: image.filename, corners, enhancement, rotation })
      .then((p) => { if (cancelled) return; setResult(p); setError(null) })
      .catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Processing failed.') })
      .finally(() => { if (!cancelled) setIsProcessing(false) })
    return () => { cancelled = true }
  }, [image.filename, corners, enhancement, rotation, attempt])

  function changeLook(v: Enhancement) { if (v === enhancement) return; setIsProcessing(true); onEnhancementChange(v) }
  function rotateBy(deg: 90 | -90)    { setIsProcessing(true); onRotationChange(((((rotation + deg) % 360) + 360) % 360) as Rotation) }

  const compare = {
    onPointerDown: () => setShowOriginal(true), onPointerUp: () => setShowOriginal(false),
    onPointerLeave: () => setShowOriginal(false), onPointerCancel: () => setShowOriginal(false),
    onKeyDown: (e: KeyboardEvent) => e.key === ' ' && setShowOriginal(true),
    onKeyUp: () => setShowOriginal(false),
  }

  return (
    <section className="flex flex-col gap-5">
      <StepIndicator current={3} />

      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl text-[#1c1814]">Enhance the page</h2>
          <p className="text-sm text-[#555047]">Page {pageNumber} · pick a look and fix the rotation</p>
        </div>
        <button type="button" onClick={onCancel} className={buttonClass('ghost', 'sm')} aria-label="Cancel"><X className="size-3.5" /> Cancel</button>
      </div>

      {error && (
        <Alert kind="error">
          {error}{' '}
          <button type="button" onClick={() => { setIsProcessing(true); setAttempt((n) => n + 1) }} className="font-semibold underline">Try again</button>
        </Alert>
      )}

      {/* Preview */}
      <div className="relative flex min-h-72 items-center justify-center overflow-hidden rounded-2xl border border-[#e2d9cc] bg-[#f4f0e8] px-3 pt-3 pb-14 sm:px-5 sm:pt-5">
        {result ? (
          <img
            src={showOriginal ? image.image_url : result.image_url}
            alt={showOriginal ? 'Original' : `Page ${pageNumber}`}
            className={`max-h-[44dvh] w-auto rounded-xl shadow-lg transition-all duration-300 sm:max-h-[55dvh] ${isProcessing ? 'opacity-50 blur-[1px]' : ''}`}
          />
        ) : (
          isProcessing && <div className="skeleton aspect-[3/4] h-[44dvh] max-w-full rounded-xl sm:h-[55dvh]" />
        )}

        {isProcessing && (
          <span className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full border border-[#d4c9bb] bg-white px-4 py-2 text-xs font-semibold text-[#1c1814] shadow-md" role="status">
            <Loader2 className="size-3.5 animate-spin text-amber-700" /> Processing…
          </span>
        )}
        {showOriginal && (
          <span className="absolute top-3 left-1/2 -translate-x-1/2 rounded-full border border-[#d4c9bb] bg-white px-3 py-1 text-[11px] font-semibold text-[#2e2118] shadow-sm">
            Original photo
          </span>
        )}

        {/* Rotate buttons */}
        <div className="absolute right-3 bottom-3 flex gap-1.5">
          <button type="button" onClick={() => rotateBy(-90)} className={iconButtonClass} aria-label="Rotate left"><RotateCcw className="size-4" /></button>
          <button type="button" onClick={() => rotateBy(90)}  className={iconButtonClass} aria-label="Rotate right"><RotateCw  className="size-4" /></button>
        </div>
        {result && (
          <button type="button" {...compare} className={`${iconButtonClass} absolute bottom-3 left-3 w-auto touch-none gap-1.5 px-3 text-xs font-medium select-none`}>
            <Eye className="size-3.5" /> Hold to compare
          </button>
        )}
      </div>

      {/* Look selector */}
      <fieldset>
        <legend className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#555047]">Look</legend>
        <div className="grid grid-cols-2 gap-2">
          {LOOK_OPTIONS.map((opt) => {
            const sel = enhancement === opt.value
            return (
              <label key={opt.value} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition-all duration-150 has-focus-visible:ring-2 has-focus-visible:ring-amber-500 ${sel ? 'border-amber-400 bg-amber-50 shadow-sm' : 'border-[#d4c9bb] bg-white hover:border-[#c0b4a3] hover:bg-[#f8f4ee]'}`}>
                <input type="radio" name="look" value={opt.value} checked={sel} onChange={() => changeLook(opt.value)} className="sr-only" />
                <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${sel ? 'bg-amber-700 text-white' : 'bg-[#f0ebe3] text-[#2e2118]'}`}>
                  {opt.icon}
                </span>
                <span>
                  <span className={`block text-sm font-semibold ${sel ? 'text-amber-900' : 'text-[#1c1814]'}`}>{opt.label}</span>
                  <span className="block text-[11px] text-[#555047]">{opt.hint}</span>
                </span>
              </label>
            )
          })}
        </div>
      </fieldset>

      <ActionBar>
        <button type="button" onClick={onBack}  className={buttonClass('secondary', 'lg')}><ArrowLeft className="size-4" /> Corners</button>
        <button type="button" onClick={() => result && onSave(result)} disabled={!result || isProcessing || error !== null} className={buttonClass('primary', 'lg')}><Check className="size-4" /> Save page</button>
      </ActionBar>
    </section>
  )
}
