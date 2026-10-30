import { Check, Loader2 } from 'lucide-react'

type ScanningPreviewProps = {
  src: string
  stage: 'uploading' | 'detecting'
}

// The chosen photo with a glowing line sweeping over it, plus a small
// checklist, while the photo uploads and OpenCV looks for the page edges.
export function ScanningPreview({ src, stage }: ScanningPreviewProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="relative mx-auto overflow-hidden rounded-3xl bg-gray-950 shadow-xl ring-1 ring-gray-800/80">
        <img src={src} alt="Chosen photo" className="max-h-[55dvh] w-auto opacity-80" />
        {/* The sweeping scan line. */}
        <div className="absolute inset-x-0 h-24 -translate-y-1/2 animate-scan-line bg-gradient-to-b from-transparent via-teal-400/40 to-transparent">
          <div className="absolute inset-x-0 top-1/2 h-0.5 bg-teal-300 shadow-[0_0_16px_4px_rgba(45,212,191,0.8)]" />
        </div>
      </div>

      <ul className="mx-auto flex w-full max-w-xs flex-col gap-2 text-sm" role="status">
        <StageRow label="Uploading photo" state={stage === 'uploading' ? 'active' : 'done'} />
        <StageRow label="Finding the page edges" state={stage === 'detecting' ? 'active' : 'waiting'} />
      </ul>
    </div>
  )
}

function StageRow({ label, state }: { label: string; state: 'waiting' | 'active' | 'done' }) {
  return (
    <li className={`flex items-center gap-3 ${state === 'waiting' ? 'text-gray-600' : 'text-gray-200'}`}>
      <span className="flex size-6 items-center justify-center">
        {state === 'done' && (
          <span className="flex size-6 animate-pop-in items-center justify-center rounded-full bg-emerald-500 text-white">
            <Check className="size-4" strokeWidth={3} />
          </span>
        )}
        {state === 'active' && <Loader2 className="size-5 animate-spin text-teal-400" />}
        {state === 'waiting' && <span className="size-2 rounded-full bg-gray-700" />}
      </span>
      <span className={state === 'active' ? 'font-semibold' : ''}>{label}</span>
    </li>
  )
}
