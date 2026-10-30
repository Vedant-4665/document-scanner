import { ArrowLeft, Check, Contrast, Eye, Loader2, Palette, RotateCcw, RotateCw, X } from 'lucide-react'
import { useEffect, useState, type KeyboardEvent, type ReactNode } from 'react'
import { processImage, type Enhancement, type ProcessedImage, type Rotation } from '../api/client'
import { Alert } from '../components/Alert'
import { ActionBar } from '../components/ui/ActionBar'
import { buttonClass, iconButtonClass } from '../components/ui/buttons'
import { StepIndicator } from '../components/ui/StepIndicator'
import type { PageDraft } from '../scanTypes'

type PageResultScreenProps = {
  pageNumber: number
  draft: PageDraft
  onEnhancementChange: (enhancement: Enhancement) => void
  onRotationChange: (rotation: Rotation) => void
  onSave: (processed: ProcessedImage) => void
  onBack: () => void
  onCancel: () => void
}

const LOOK_OPTIONS: { value: Enhancement; label: string; hint: string; icon: ReactNode }[] = [
  { value: 'original', label: 'Color', hint: 'As photographed', icon: <Palette className="size-5" /> },
  { value: 'black_white', label: 'Black & white', hint: 'Crisp text, no shadows', icon: <Contrast className="size-5" /> },
]

// Step 3 for a page: the flattened result, a choice of look, and rotation.
export function PageResultScreen({
  pageNumber,
  draft,
  onEnhancementChange,
  onRotationChange,
  onSave,
  onBack,
  onCancel,
}: PageResultScreenProps) {
  const { image, corners, enhancement, rotation } = draft
  const [result, setResult] = useState<ProcessedImage | null>(null)
  const [isProcessing, setIsProcessing] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Increasing this number repeats the request ("Try again" button).
  const [attempt, setAttempt] = useState(0)
  // True while the "Hold to compare" button is pressed: show the original photo.
  const [showOriginal, setShowOriginal] = useState(false)

  // Ask the backend for a new version whenever a setting changes.
  useEffect(() => {
    // If settings change again before the answer arrives, ignore the old answer.
    let cancelled = false
    processImage({ filename: image.filename, corners, enhancement, rotation })
      .then((processed) => {
        if (cancelled) return
        setResult(processed)
        setError(null)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Processing failed.')
      })
      .finally(() => {
        if (!cancelled) setIsProcessing(false)
      })
    return () => {
      cancelled = true
    }
  }, [image.filename, corners, enhancement, rotation, attempt])

  // Settings change from button clicks, so mark "processing" right there.
  function changeLook(value: Enhancement) {
    if (value === enhancement) return
    setIsProcessing(true)
    onEnhancementChange(value)
  }
  function rotateBy(degrees: 90 | -90) {
    setIsProcessing(true)
    onRotationChange(((((rotation + degrees) % 360) + 360) % 360) as Rotation)
  }

  const compareHandlers = {
    onPointerDown: () => setShowOriginal(true),
    onPointerUp: () => setShowOriginal(false),
    onPointerLeave: () => setShowOriginal(false),
    onPointerCancel: () => setShowOriginal(false),
    onKeyDown: (event: KeyboardEvent) => event.key === ' ' && setShowOriginal(true),
    onKeyUp: () => setShowOriginal(false),
  }

  return (
    <section className="flex flex-col gap-4">
      <StepIndicator current={3} />

      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Enhance the page</h2>
          <p className="text-sm text-slate-500">Page {pageNumber} · pick a look and fix the rotation</p>
        </div>
        <button type="button" onClick={onCancel} className={buttonClass('ghost', 'sm')} aria-label="Cancel this page">
          <X className="size-4" /> Cancel
        </button>
      </div>

      {error && (
        <Alert kind="error">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => {
              setIsProcessing(true)
              setAttempt((count) => count + 1)
            }}
            className="mt-1 font-semibold underline"
          >
            Try again
          </button>
        </Alert>
      )}

      {/* The page preview, with rotate buttons floating on top. */}
      <div className="relative flex min-h-72 items-center justify-center overflow-hidden rounded-3xl bg-slate-200/70 px-3 pt-3 pb-16 shadow-inner sm:px-5 sm:pt-5">
        {result ? (
          <img
            src={showOriginal ? image.image_url : result.image_url}
            alt={showOriginal ? 'Original photo' : `Processed page ${pageNumber}`}
            className={`max-h-[44dvh] w-auto rounded-lg bg-white shadow-xl transition sm:max-h-[55dvh] ${isProcessing ? 'opacity-50 blur-[1px]' : ''}`}
          />
        ) : (
          isProcessing && <div className="skeleton aspect-[3/4] h-[44dvh] max-w-full rounded-lg sm:h-[55dvh]" />
        )}

        {isProcessing && (
          <span className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold shadow-lg" role="status">
            <Loader2 className="size-4 animate-spin text-indigo-600" /> Processing…
          </span>
        )}
        {showOriginal && (
          <span className="absolute top-3 left-1/2 -translate-x-1/2 rounded-full bg-slate-900/80 px-3 py-1 text-xs font-semibold text-white">
            Original photo
          </span>
        )}

        <div className="absolute right-3 bottom-3 flex gap-2">
          <button type="button" onClick={() => rotateBy(-90)} className={iconButtonClass} aria-label="Rotate left" title="Rotate left">
            <RotateCcw className="size-5" />
          </button>
          <button type="button" onClick={() => rotateBy(90)} className={iconButtonClass} aria-label="Rotate right" title="Rotate right">
            <RotateCw className="size-5" />
          </button>
        </div>
        {result && (
          <button
            type="button"
            {...compareHandlers}
            className={`${iconButtonClass} absolute bottom-3 left-3 w-auto touch-none gap-1.5 px-3 text-sm font-semibold select-none`}
          >
            <Eye className="size-4" /> Hold to compare
          </button>
        )}
      </div>

      {/* Look choice: two big radio cards. */}
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-slate-700">Look</legend>
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5">
          {LOOK_OPTIONS.map((option) => {
            const selected = enhancement === option.value
            return (
              <label
                key={option.value}
                className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-xl p-3 text-center transition has-focus-visible:ring-4 has-focus-visible:ring-indigo-200 sm:flex-row sm:gap-3 sm:text-left ${
                  selected ? 'bg-white shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:bg-white/60'
                }`}
              >
                <input
                  type="radio"
                  name="look"
                  value={option.value}
                  checked={selected}
                  onChange={() => changeLook(option.value)}
                  className="sr-only"
                />
                <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${selected ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500'}`}>
                  {option.icon}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-900">{option.label}</span>
                  <span className="block text-xs text-slate-500">{option.hint}</span>
                </span>
              </label>
            )
          })}
        </div>
      </fieldset>

      <ActionBar>
        <button type="button" onClick={onBack} className={buttonClass('secondary', 'lg')}>
          <ArrowLeft className="size-5" /> Corners
        </button>
        <button
          type="button"
          onClick={() => result && onSave(result)}
          disabled={!result || isProcessing || error !== null}
          className={buttonClass('primary', 'lg')}
        >
          <Check className="size-5" /> Save page
        </button>
      </ActionBar>
    </section>
  )
}
