import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import type { Corners, Point } from '../api/client'

type CornerEditorProps = {
  imageUrl: string
  imageWidth: number // the image's real size in pixels
  imageHeight: number
  corners: Corners // in the image's real pixels
  onChange: (corners: Corners) => void
}

const CORNER_NAMES = ['Top-left', 'Top-right', 'Bottom-right', 'Bottom-left']

// The picture is drawn at most this share of the screen height, so the
// buttons below it stay reachable on a phone.
const MAX_HEIGHT_SHARE = 0.58

// The magnifier shown while dragging: its size on screen and how much it enlarges.
const LOUPE_SIZE = 120
const LOUPE_ZOOM = 2.5

// Shows the photo with the page outline and four round handles. Drag a handle
// (mouse or finger) or focus it and use the arrow keys to move that corner.
// Everything outside the outline is dimmed, so you can see what will be kept.
export function CornerEditor({ imageUrl, imageWidth, imageHeight, corners, onChange }: CornerEditorProps) {
  const outerRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const [availableWidth, setAvailableWidth] = useState(0)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  // Full-size phone photos can take a few seconds to arrive on mobile data.
  const [imageLoaded, setImageLoaded] = useState(false)

  // Measure how much width we have, and again whenever it changes (rotating
  // the phone, resizing the window).
  useEffect(() => {
    const outer = outerRef.current
    if (!outer) return
    const observer = new ResizeObserver(([entry]) => setAvailableWidth(entry.contentRect.width))
    observer.observe(outer)
    return () => observer.disconnect()
  }, [])

  // Work out the on-screen size that fits both the width and the height limit.
  const scale = Math.min(
    availableWidth / imageWidth,
    (window.innerHeight * MAX_HEIGHT_SHARE) / imageHeight,
    1, // never enlarge beyond real size
  )
  const displayWidth = imageWidth * scale
  const displayHeight = imageHeight * scale

  function moveCorner(index: number, point: Point) {
    const next = [...corners] as Corners
    // Keep the corner inside the image.
    next[index] = {
      x: Math.min(Math.max(point.x, 0), imageWidth - 1),
      y: Math.min(Math.max(point.y, 0), imageHeight - 1),
    }
    onChange(next)
  }

  // Convert a finger/mouse position on screen into image pixels.
  function pointerToImagePoint(event: PointerEvent): Point {
    const rect = frameRef.current!.getBoundingClientRect()
    return {
      x: ((event.clientX - rect.left) / rect.width) * imageWidth,
      y: ((event.clientY - rect.top) / rect.height) * imageHeight,
    }
  }

  function handleKeyDown(index: number, event: KeyboardEvent) {
    const step = (event.shiftKey ? 10 : 1) * Math.max(1, imageWidth / 200)
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }
    const move = moves[event.key]
    if (!move) return
    event.preventDefault() // don't scroll the page
    moveCorner(index, { x: corners[index].x + move[0], y: corners[index].y + move[1] })
  }

  const outline = corners.map((c) => `${c.x},${c.y}`).join(' ')
  // A rectangle covering the whole photo with the page shape cut out of it
  // ("evenodd" fill), used to dim everything outside the page.
  const dimmedArea =
    `M0,0 H${imageWidth} V${imageHeight} H0 Z ` +
    `M${corners.map((c) => `${c.x},${c.y}`).join(' L')} Z`

  return (
    // The padding leaves room so handles on the very edge can still be grabbed.
    <div ref={outerRef} className="rounded-3xl bg-slate-900 p-6 shadow-xl sm:p-8">
      {availableWidth > 0 && (
        <div ref={frameRef} className="relative mx-auto" style={{ width: displayWidth, height: displayHeight }}>
          <img
            src={imageUrl}
            alt="Uploaded photo with adjustable page outline"
            draggable={false}
            onLoad={() => setImageLoaded(true)}
            className="block size-full rounded-sm select-none"
          />
          {!imageLoaded && <div className="skeleton absolute inset-0 rounded-sm opacity-20" />}

          {/* Drawn in the image's own pixel coordinates, stretched to the displayed size. */}
          <svg
            viewBox={`0 0 ${imageWidth} ${imageHeight}`}
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 size-full"
          >
            <path d={dimmedArea} fill="rgb(15 23 42 / 0.55)" fillRule="evenodd" />
            <polygon points={outline} fill="none" stroke="white" strokeOpacity={0.6} strokeWidth={5} vectorEffect="non-scaling-stroke" />
            <polygon points={outline} fill="rgb(99 102 241 / 0.08)" stroke="#818cf8" strokeWidth={2.5} vectorEffect="non-scaling-stroke" />
          </svg>

          {corners.map((corner, index) => {
            const active = draggingIndex === index
            return (
              <button
                key={CORNER_NAMES[index]}
                type="button"
                aria-label={`${CORNER_NAMES[index]} corner. Drag, or use arrow keys to move.`}
                style={{ left: `${(corner.x / imageWidth) * 100}%`, top: `${(corner.y / imageHeight) * 100}%` }}
                // touch-none stops the page from scrolling while dragging a handle.
                className={`group absolute flex size-12 -translate-x-1/2 -translate-y-1/2 touch-none items-center justify-center rounded-full focus:outline-none ${
                  active ? 'cursor-grabbing' : 'cursor-grab'
                }`}
                onPointerDown={(event) => {
                  // Keep receiving moves even if the finger slides off the handle.
                  event.currentTarget.setPointerCapture(event.pointerId)
                  setDraggingIndex(index)
                }}
                onPointerMove={(event) => {
                  if (active) moveCorner(index, pointerToImagePoint(event))
                }}
                onPointerUp={() => setDraggingIndex(null)}
                onPointerCancel={() => setDraggingIndex(null)}
                onKeyDown={(event) => handleKeyDown(index, event)}
              >
                {/* The visible handle: a ring with a dot at the exact corner. */}
                <span
                  className={`flex size-7 items-center justify-center rounded-full border-[3px] border-white bg-indigo-500/40 shadow-lg ring-indigo-400/50 transition group-focus-visible:ring-4 group-focus-visible:ring-yellow-300 ${
                    active ? 'scale-125 bg-indigo-500/70 ring-8' : 'group-hover:scale-110'
                  }`}
                >
                  <span className="size-1.5 rounded-full bg-white" />
                </span>
              </button>
            )
          })}

          {draggingIndex !== null && (
            <Magnifier
              imageUrl={imageUrl}
              outline={outline}
              imageWidth={imageWidth}
              imageHeight={imageHeight}
              displayWidth={displayWidth}
              displayHeight={displayHeight}
              point={corners[draggingIndex]}
              scale={scale}
            />
          )}
        </div>
      )}
    </div>
  )
}

// A round, zoomed-in view of the area under the corner being dragged, so the
// finger doesn't hide what you're aiming at. It appears in the top corner on
// the opposite side from the finger.
function Magnifier(props: {
  imageUrl: string
  outline: string
  imageWidth: number
  imageHeight: number
  displayWidth: number
  displayHeight: number
  point: Point
  scale: number
}) {
  const x = props.point.x * props.scale // corner position on screen
  const y = props.point.y * props.scale
  const onLeftHalf = x < props.displayWidth / 2
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute top-2 animate-pop-in overflow-hidden rounded-full border-4 border-white bg-slate-900 shadow-2xl"
      style={{
        width: LOUPE_SIZE,
        height: LOUPE_SIZE,
        ...(onLeftHalf ? { right: 8 } : { left: 8 }),
      }}
    >
      {/* The enlarged photo and outline, shifted so the corner sits in the centre. */}
      <div
        className="absolute"
        style={{
          width: props.displayWidth * LOUPE_ZOOM,
          height: props.displayHeight * LOUPE_ZOOM,
          left: LOUPE_SIZE / 2 - x * LOUPE_ZOOM - 4,
          top: LOUPE_SIZE / 2 - y * LOUPE_ZOOM - 4,
        }}
      >
        <img src={props.imageUrl} alt="" className="size-full max-w-none" />
        <svg
          viewBox={`0 0 ${props.imageWidth} ${props.imageHeight}`}
          preserveAspectRatio="none"
          className="absolute inset-0 size-full"
        >
          <polygon points={props.outline} fill="none" stroke="#818cf8" strokeWidth={2} vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      {/* Crosshair marking the exact corner. */}
      <span className="absolute top-1/2 left-1/2 h-px w-6 -translate-x-1/2 bg-white shadow" />
      <span className="absolute top-1/2 left-1/2 h-6 w-px -translate-y-1/2 bg-white shadow" />
    </div>
  )
}
