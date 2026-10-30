import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import type { Corners, Point } from '../api/client'

type CornerEditorProps = {
  imageUrl: string
  imageWidth: number
  imageHeight: number
  corners: Corners
  onChange: (corners: Corners) => void
}

const CORNER_NAMES = ['Top-left', 'Top-right', 'Bottom-right', 'Bottom-left']
const MAX_HEIGHT_SHARE = 0.58
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
  const [imageLoaded, setImageLoaded] = useState(false)

  useEffect(() => {
    const outer = outerRef.current
    if (!outer) return
    const observer = new ResizeObserver(([entry]) => setAvailableWidth(entry.contentRect.width))
    observer.observe(outer)
    return () => observer.disconnect()
  }, [])

  const scale = Math.min(
    availableWidth / imageWidth,
    (window.innerHeight * MAX_HEIGHT_SHARE) / imageHeight,
    1,
  )
  const displayWidth  = imageWidth  * scale
  const displayHeight = imageHeight * scale

  function moveCorner(index: number, point: Point) {
    const next = [...corners] as Corners
    next[index] = {
      x: Math.min(Math.max(point.x, 0), imageWidth  - 1),
      y: Math.min(Math.max(point.y, 0), imageHeight - 1),
    }
    onChange(next)
  }

  function pointerToImagePoint(event: PointerEvent): Point {
    const rect = frameRef.current!.getBoundingClientRect()
    return {
      x: ((event.clientX - rect.left)  / rect.width)  * imageWidth,
      y: ((event.clientY - rect.top)   / rect.height) * imageHeight,
    }
  }

  function handleKeyDown(index: number, event: KeyboardEvent) {
    const step = (event.shiftKey ? 10 : 1) * Math.max(1, imageWidth / 200)
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0], ArrowRight: [step, 0],
      ArrowUp:   [0, -step], ArrowDown:  [0, step],
    }
    const move = moves[event.key]
    if (!move) return
    event.preventDefault()
    moveCorner(index, { x: corners[index].x + move[0], y: corners[index].y + move[1] })
  }

  const outline    = corners.map((c) => `${c.x},${c.y}`).join(' ')
  const dimmedArea =
    `M0,0 H${imageWidth} V${imageHeight} H0 Z ` +
    `M${corners.map((c) => `${c.x},${c.y}`).join(' L')} Z`

  return (
    <div ref={outerRef} className="overflow-hidden rounded-3xl border border-white/[0.06] bg-black/60 p-6 shadow-2xl backdrop-blur-sm sm:p-8">
      {availableWidth > 0 && (
        <div ref={frameRef} className="relative mx-auto" style={{ width: displayWidth, height: displayHeight }}>
          <img
            src={imageUrl}
            alt="Uploaded photo with adjustable page outline"
            draggable={false}
            onLoad={() => setImageLoaded(true)}
            className="block size-full rounded-sm select-none"
          />
          {!imageLoaded && <div className="skeleton absolute inset-0 rounded-sm opacity-30" />}

          {/* SVG overlay */}
          <svg
            viewBox={`0 0 ${imageWidth} ${imageHeight}`}
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 size-full"
          >
            {/* Dim outside the outline */}
            <path d={dimmedArea} fill="rgba(0,0,0,0.6)" fillRule="evenodd" />
            {/* Outer edge (contrast) */}
            <polygon points={outline} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={4} vectorEffect="non-scaling-stroke" />
            {/* Inner edge (violet) */}
            <polygon points={outline} fill="rgba(139,92,246,0.06)" stroke="#8b5cf6" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeDasharray="8 4" />
          </svg>

          {/* Corner handles */}
          {corners.map((corner, index) => {
            const active = draggingIndex === index
            return (
              <button
                key={CORNER_NAMES[index]}
                type="button"
                aria-label={`${CORNER_NAMES[index]} corner. Drag, or use arrow keys to move.`}
                style={{ left: `${(corner.x / imageWidth) * 100}%`, top: `${(corner.y / imageHeight) * 100}%` }}
                className={`group absolute flex size-12 -translate-x-1/2 -translate-y-1/2 touch-none items-center justify-center rounded-full focus:outline-none ${active ? 'cursor-grabbing' : 'cursor-grab'}`}
                onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setDraggingIndex(index) }}
                onPointerMove={(e) => { if (active) moveCorner(index, pointerToImagePoint(e)) }}
                onPointerUp={() => setDraggingIndex(null)}
                onPointerCancel={() => setDraggingIndex(null)}
                onKeyDown={(e) => handleKeyDown(index, e)}
              >
                <span
                  className={`flex size-7 items-center justify-center rounded-full border-2 transition-all group-focus-visible:ring-4 group-focus-visible:ring-yellow-300 ${
                    active
                      ? 'scale-125 border-white bg-violet-500/80 shadow-xl shadow-violet-500/50 ring-4 ring-violet-500/30'
                      : 'border-white bg-violet-600/60 shadow-lg shadow-violet-500/30 group-hover:scale-110'
                  }`}
                >
                  <span className="size-1.5 rounded-full bg-white" />
                </span>
              </button>
            )
          })}

          {/* Magnifier */}
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

function Magnifier(props: {
  imageUrl: string; outline: string; imageWidth: number; imageHeight: number;
  displayWidth: number; displayHeight: number; point: Point; scale: number
}) {
  const x = props.point.x * props.scale
  const y = props.point.y * props.scale
  const onLeftHalf = x < props.displayWidth / 2
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute top-2 animate-pop-in overflow-hidden rounded-full border-2 border-violet-500/60 bg-black shadow-2xl shadow-violet-500/20"
      style={{ width: LOUPE_SIZE, height: LOUPE_SIZE, ...(onLeftHalf ? { right: 8 } : { left: 8 }) }}
    >
      <div
        className="absolute"
        style={{
          width:  props.displayWidth  * LOUPE_ZOOM,
          height: props.displayHeight * LOUPE_ZOOM,
          left:   LOUPE_SIZE / 2 - x * LOUPE_ZOOM - 4,
          top:    LOUPE_SIZE / 2 - y * LOUPE_ZOOM - 4,
        }}
      >
        <img src={props.imageUrl} alt="" className="size-full max-w-none" />
        <svg viewBox={`0 0 ${props.imageWidth} ${props.imageHeight}`} preserveAspectRatio="none" className="absolute inset-0 size-full">
          <polygon points={props.outline} fill="none" stroke="#8b5cf6" strokeWidth={2} vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      {/* Crosshair */}
      <span className="absolute top-1/2 left-1/2 h-px w-6 -translate-x-1/2 bg-violet-400/80 shadow" />
      <span className="absolute top-1/2 left-1/2 h-6  w-px -translate-y-1/2 bg-violet-400/80 shadow" />
    </div>
  )
}
