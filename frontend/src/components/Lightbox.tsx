import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useEffect, useRef, useState, type PointerEvent } from 'react'

type LightboxImage = { src: string; originalSrc: string; label: string }

type LightboxProps = {
  images: LightboxImage[]
  index: number | null
  onIndexChange: (index: number | null) => void
}

// Full-screen page viewer. Swipe or use the arrow keys / buttons to move
// between pages; "Original" shows the photo the page came from.
export function Lightbox({ images, index, onIndexChange }: LightboxProps) {
  const dialogRef   = useRef<HTMLDialogElement>(null)
  const swipeStartX = useRef<number | null>(null)
  const [showOriginal, setShowOriginal] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (index !== null && !dialog.open) dialog.showModal()
    if (index === null  &&  dialog.open) dialog.close()
  }, [index])

  const count = images.length
  function go(step: -1 | 1) {
    if (index === null) return
    setShowOriginal(false)
    onIndexChange((index + step + count) % count)
  }

  function handlePointerUp(event: PointerEvent) {
    if (swipeStartX.current === null) return
    const distance = event.clientX - swipeStartX.current
    swipeStartX.current = null
    if (Math.abs(distance) > 50) go(distance < 0 ? 1 : -1)
  }

  const image = index !== null ? images[index] : null

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => { event.preventDefault(); onIndexChange(null) }}
      onKeyDown={(event) => { if (event.key === 'ArrowLeft') go(-1); if (event.key === 'ArrowRight') go(1) }}
      className="m-0 h-dvh max-h-none w-screen max-w-none bg-black/95 p-0 text-white backdrop:bg-black/80 backdrop:backdrop-blur-md"
    >
      {image && (
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] backdrop-blur-sm">
            <span className="text-sm font-medium text-slate-400">
              {image.label} <span className="text-slate-600">·</span> {(index ?? 0) + 1} of {count}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowOriginal((v) => !v)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                  showOriginal
                    ? 'bg-white text-slate-900'
                    : 'border border-white/10 bg-white/[0.06] text-slate-300 hover:bg-white/10'
                }`}
              >
                Original
              </button>
              <button
                type="button"
                onClick={() => onIndexChange(null)}
                aria-label="Close"
                className="flex size-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-slate-300 transition-all hover:bg-white/10"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Image */}
          <div
            className="relative flex min-h-0 flex-1 touch-pan-y items-center justify-center px-4 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]"
            onPointerDown={(event) => (swipeStartX.current = event.clientX)}
            onPointerUp={handlePointerUp}
          >
            <img
              key={`${index ?? 0}-${showOriginal}`}
              src={showOriginal ? image.originalSrc : image.src}
              alt={image.label}
              className="max-h-full max-w-full animate-pop-in rounded-2xl object-contain shadow-2xl select-none"
              draggable={false}
            />

            {count > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  aria-label="Previous page"
                  className="absolute left-4 hidden size-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white transition-all hover:bg-white/10 sm:flex"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label="Next page"
                  className="absolute right-4 hidden size-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white transition-all hover:bg-white/10 sm:flex"
                >
                  <ChevronRight className="size-5" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </dialog>
  )
}
