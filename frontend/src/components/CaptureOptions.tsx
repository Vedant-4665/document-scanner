import { Camera, ImageUp, Plus } from 'lucide-react'
import { useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from 'react'
import { ACCEPTED_IMAGE_TYPES, MAX_UPLOAD_MB } from '../config'

type CaptureOptionsProps = { onFileChosen: (file: File) => void; variant: 'hero' | 'tile' }

const isTouchDevice = window.matchMedia('(pointer: coarse)').matches

export function CaptureOptions({ onFileChosen, variant }: CaptureOptionsProps) {
  const cameraRef = useRef<HTMLInputElement>(null)
  const fileRef   = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; e.target.value = ''; if (file) onFileChosen(file)
  }

  const drop = {
    onDragOver:  (e: DragEvent) => { e.preventDefault(); setIsDragging(true) },
    onDragLeave: () => setIsDragging(false),
    onDrop:      (e: DragEvent) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) onFileChosen(f) },
  }

  const inputs = (
    <>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleChange} />
      <input ref={fileRef}   type="file" accept={ACCEPTED_IMAGE_TYPES.join(',')} className="hidden" onChange={handleChange} />
    </>
  )

  /* Tile */
  if (variant === 'tile') {
    return (
      <div {...drop} className={`flex aspect-[3/4] flex-col items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed p-3 text-center transition-all duration-150 ${isDragging ? 'border-amber-500 bg-amber-50' : 'border-[#d4c9bb] bg-[#f8f4ee] hover:border-[#c0b4a3] hover:bg-[#f4f0e8]'}`}>
        <span className="flex size-8 items-center justify-center rounded-lg bg-white shadow-sm text-[#555047] border border-[#d4c9bb]"><Plus className="size-4" /></span>
        <span className="text-xs font-semibold text-[#2e2118]">Add page</span>
        <div className="flex gap-1.5">
          {isTouchDevice && <TileBtn label="Take photo" onClick={() => cameraRef.current?.click()}><Camera className="size-3.5" /></TileBtn>}
          <TileBtn label="Upload image" onClick={() => fileRef.current?.click()}><ImageUp className="size-3.5" /></TileBtn>
        </div>
        {inputs}
      </div>
    )
  }

  /* Hero */
  return (
    <div {...drop} className="relative">
      <div className={`grid gap-3 ${isTouchDevice ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {isTouchDevice && (
          <HeroCard onClick={() => cameraRef.current?.click()} icon={<Camera className="size-6" />} title="Take a photo" hint="Use the camera" primary />
        )}
        <HeroCard onClick={() => fileRef.current?.click()} icon={<ImageUp className="size-6" />} title={isTouchDevice ? 'Upload image' : 'Upload an image'} hint={isTouchDevice ? 'From your library' : `Or drag and drop · JPG, PNG, WebP · up to ${MAX_UPLOAD_MB} MB`} primary={!isTouchDevice} tall={!isTouchDevice} />
      </div>
      {isDragging && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl border-2 border-dashed border-amber-500 bg-amber-50/80 backdrop-blur-sm">
          <span className="rounded-xl border border-amber-300 bg-white px-6 py-3 text-sm font-semibold text-amber-800 shadow-md">Drop image here</span>
        </div>
      )}
      {inputs}
    </div>
  )
}

function HeroCard({ onClick, icon, title, hint, primary, tall }: { onClick: () => void; icon: ReactNode; title: string; hint: string; primary?: boolean; tall?: boolean }) {
  const base = 'group flex flex-col items-center justify-center gap-4 rounded-2xl border p-6 text-center transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500'
  const tall_cls    = 'min-h-52 border-2 border-dashed border-[#d4c9bb] bg-white hover:border-amber-400 hover:bg-amber-50/40'
  const primary_cls = 'min-h-40 border-amber-700 bg-amber-700 text-white shadow-md shadow-amber-900/20 hover:bg-amber-600 hover:border-amber-600'
  const regular_cls = 'min-h-40 border-[#d4c9bb] bg-white text-[#1c1814] shadow-sm hover:border-amber-400 hover:bg-amber-50/30 hover:shadow-md'
  return (
    <button type="button" onClick={onClick} className={`${base} ${tall ? tall_cls : primary && !tall ? primary_cls : regular_cls}`}>
      <span className={`flex size-14 items-center justify-center rounded-2xl transition-transform duration-150 group-hover:scale-105 ${primary && !tall ? 'bg-amber-600' : 'bg-amber-100 text-amber-700'}`}>
        {icon}
      </span>
      <span>
        <span className="block text-base font-semibold">{title}</span>
        <span className={`mt-0.5 block text-xs leading-relaxed ${primary && !tall ? 'text-amber-200' : 'text-[#555047]'}`}>{hint}</span>
      </span>
    </button>
  )
}

function TileBtn({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className="flex size-8 items-center justify-center rounded-lg bg-amber-700 text-white shadow-sm transition-all hover:bg-amber-600 active:scale-90">
      {children}
    </button>
  )
}
