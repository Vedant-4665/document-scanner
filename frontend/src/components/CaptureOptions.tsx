import { Camera, ImageUp, Plus } from 'lucide-react'
import { useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from 'react'
import { ACCEPTED_IMAGE_TYPES, MAX_UPLOAD_MB } from '../config'

type CaptureOptionsProps = {
  onFileChosen: (file: File) => void
  // "hero": two big cards on the empty start screen.
  // "tile": one compact "Add page" tile at the end of the page grid.
  variant: 'hero' | 'tile'
}

// Phones and tablets have a touch screen as their main pointer ("coarse").
// Desktop browsers ignore the camera hint and would just open a file chooser,
// so the camera option is only shown on touch devices.
const isTouchDevice = window.matchMedia('(pointer: coarse)').matches

// Two ways to add a page:
//  - Camera: a file input with capture="environment", which asks the phone to
//    open its back camera. Some browsers ignore this hint and show the usual
//    chooser instead; the user can still take or pick a photo there.
//  - Upload: a normal file chooser. On desktop you can also drag an image in.
export function CaptureOptions({ onFileChosen, variant }: CaptureOptionsProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = '' // so choosing the same file again still counts
    if (file) onFileChosen(file)
  }

  // Drag-and-drop handlers, spread onto the drop area below.
  const dropHandlers = {
    onDragOver: (event: DragEvent) => {
      event.preventDefault()
      setIsDragging(true)
    },
    onDragLeave: () => setIsDragging(false),
    onDrop: (event: DragEvent) => {
      event.preventDefault() // stop the browser from opening the dropped file
      setIsDragging(false)
      const file = event.dataTransfer.files[0]
      if (file) onFileChosen(file)
    },
  }

  const inputs = (
    <>
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleInputChange}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        className="hidden"
        onChange={handleInputChange}
      />
    </>
  )

  if (variant === 'tile') {
    return (
      <div
        {...dropHandlers}
        className={`flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-3 transition ${
          isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 bg-white/60'
        }`}
      >
        <Plus className="size-6 text-slate-400" />
        <span className="text-sm font-semibold text-slate-700">Add page</span>
        <div className="flex gap-2">
          {isTouchDevice && (
            <TileButton label="Take photo" onClick={() => cameraInputRef.current?.click()}>
              <Camera className="size-5" />
            </TileButton>
          )}
          <TileButton label="Upload image" onClick={() => fileInputRef.current?.click()}>
            <ImageUp className="size-5" />
          </TileButton>
        </div>
        {inputs}
      </div>
    )
  }

  return (
    <div {...dropHandlers} className="relative">
      <div className={`grid gap-3 ${isTouchDevice ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {isTouchDevice && (
          <BigOption
            onClick={() => cameraInputRef.current?.click()}
            icon={<Camera className="size-7" />}
            title="Take photo"
            subtitle="Use the camera"
            primary
          />
        )}
        <BigOption
          onClick={() => fileInputRef.current?.click()}
          icon={<ImageUp className="size-7" />}
          title={isTouchDevice ? 'Upload' : 'Upload an image'}
          subtitle={isTouchDevice ? 'From your gallery' : `or drag and drop · JPG, PNG, WebP up to ${MAX_UPLOAD_MB} MB`}
          primary={!isTouchDevice}
          tall={!isTouchDevice}
        />
      </div>

      {/* Shown over the cards while a file is dragged over them. */}
      {isDragging && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-3xl border-2 border-dashed border-indigo-500 bg-indigo-50/90 text-lg font-semibold text-indigo-700">
          Drop the image here
        </div>
      )}
      {inputs}
    </div>
  )
}

function BigOption(props: {
  onClick: () => void
  icon: ReactNode
  title: string
  subtitle: string
  primary?: boolean
  tall?: boolean
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`group flex flex-col items-center justify-center gap-3 rounded-3xl p-5 text-center transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 ${
        props.tall ? 'min-h-56 border-2 border-dashed border-indigo-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/40' : 'min-h-40'
      } ${
        props.primary && !props.tall
          ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30'
          : !props.tall
            ? 'border border-slate-200 bg-white text-slate-800 shadow-sm'
            : ''
      }`}
    >
      <span
        className={`flex size-14 items-center justify-center rounded-2xl transition group-hover:scale-105 ${
          props.primary && !props.tall ? 'bg-white/20' : 'bg-indigo-50 text-indigo-600'
        }`}
      >
        {props.icon}
      </span>
      <span>
        <span className="block text-base font-semibold">{props.title}</span>
        <span className={`block text-xs ${props.primary && !props.tall ? 'text-indigo-100' : 'text-slate-500'}`}>
          {props.subtitle}
        </span>
      </span>
    </button>
  )
}

function TileButton(props: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      aria-label={props.label}
      title={props.label}
      className="flex size-11 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm transition hover:bg-indigo-700 active:scale-90"
    >
      {props.children}
    </button>
  )
}
