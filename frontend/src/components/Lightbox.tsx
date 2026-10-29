import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useEffect, useRef, useState, type PointerEvent } from 'react'

type LightboxImage = { src: string; originalSrc: string; label: string }

type LightboxProps = {
  images: LightboxImage[]
  index: number | null // which image is open; null = closed
  onIndexChange: (index: number | null) => void
}

// Full-screen page viewer. Swipe or use the arrow keys / buttons to move
// between pages; "Original" shows the photo the page came from.
export function Lightbox({ images, index, onIndexChange }: LightboxProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const swipeStartX = useRef<number | null>(null)
  const [showOriginal, setShowOriginal] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (index !== null && !dialog.open) dialog.showModal()
    if (index === null && dialog.open) dialog.close()
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
      onCancel={(event) => {
        event.preventDefault()
        onIndexChange(null)
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') go(-1)
        if (event.key === 'ArrowRight') go(1)
      }}
      className="m-0 h-dvh max-h-none w-screen max-w-none bg-slate-950 p-0 text-white backdrop:bg-black/60"
    >
      {image && (
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between gap-2 p-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
            <span className="text-sm font-semibold">
              {image.label} · {index! + 1} of {count}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowOriginal((value) => !value)}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${showOriginal ? 'bg-white text-slate-900' : 'bg-white/10 hover:bg-white/20'}`}
              >
                Original
              </button>
              <button
                type="button"
                onClick={() => onIndexChange(null)}
                aria-label="Close"
                className="flex size-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
              >
                <X className="size-5" />
              </button>
            </div>
          </div>

          <div
            className="relative flex min-h-0 flex-1 touch-pan-y items-center justify-center px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]"
            onPointerDown={(event) => (swipeStartX.current = event.clientX)}
            onPointerUp={handlePointerUp}
          >
            <img
              key={`${index}-${showOriginal}`}
              src={showOriginal ? image.originalSrc : image.src}
              alt={image.label}
              className="max-h-full max-w-full animate-pop-in rounded-lg object-contain shadow-2xl select-none"
              draggable={false}
            />
            {count > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  aria-label="Previous page"
                  className="absolute left-3 hidden size-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 sm:flex"
                >
                  <ChevronLeft className="size-6" />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label="Next page"
                  className="absolute right-3 hidden size-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 sm:flex"
                >
                  <ChevronRight className="size-6" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </dialog>
  )
}
