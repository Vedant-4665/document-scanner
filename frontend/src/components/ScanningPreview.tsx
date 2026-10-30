import { Check, Loader2 } from 'lucide-react'

type ScanningPreviewProps = { src: string; stage: 'uploading' | 'detecting' }

export function ScanningPreview({ src, stage }: ScanningPreviewProps) {
  return (
    <div className="flex flex-col gap-5">
      {/* Photo + scan line */}
      <div className="relative mx-auto overflow-hidden rounded-2xl border border-[#d4c9bb] bg-[#f8f4ee] shadow-lg shadow-amber-900/10">
        <img src={src} alt="Chosen photo" className="max-h-[55dvh] w-auto" />
        {/* scanning line */}
        <div className="absolute inset-x-0 h-20 -translate-y-1/2 animate-scan-line bg-gradient-to-b from-transparent via-amber-500/25 to-transparent pointer-events-none">
          <div className="absolute inset-x-0 top-1/2 h-0.5 bg-amber-600 shadow-[0_0_12px_2px_rgba(180,90,20,0.4)]" />
        </div>
        {/* corner brackets */}
        {[
          'top-3 left-3 border-t-2 border-l-2',
          'top-3 right-3 border-t-2 border-r-2',
          'bottom-3 left-3 border-b-2 border-l-2',
          'bottom-3 right-3 border-b-2 border-r-2',
        ].map((cls, i) => (
          <span key={i} className={`absolute size-5 rounded-sm border-amber-600 ${cls}`} />
        ))}
      </div>

      {/* Checklist */}
      <ul className="mx-auto flex w-full max-w-xs flex-col gap-2.5 text-sm" role="status">
        <Row label="Uploading photo"       state={stage === 'uploading' ? 'active' : 'done'} />
        <Row label="Finding the page edges" state={stage === 'detecting' ? 'active' : 'waiting'} />
      </ul>
    </div>
  )
}

function Row({ label, state }: { label: string; state: 'waiting' | 'active' | 'done' }) {
  return (
    <li className={`flex items-center gap-3 transition-colors ${state === 'waiting' ? 'text-[#555047]' : 'text-[#1c1814]'}`}>
      <span className="flex size-6 shrink-0 items-center justify-center">
        {state === 'done'    && <span className="flex size-6 animate-pop-in items-center justify-center rounded-full bg-green-700 text-white"><Check className="size-3.5" strokeWidth={3} /></span>}
        {state === 'active'  && <Loader2 className="size-5 animate-spin text-amber-700" />}
        {state === 'waiting' && <span className="size-2 rounded-full bg-[#d4c9bb]" />}
      </span>
      <span className={state === 'active' ? 'font-semibold' : ''}>{label}</span>
    </li>
  )
}
