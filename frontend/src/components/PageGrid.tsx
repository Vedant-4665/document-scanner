import { ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Page } from '../scanTypes'

type PageGridProps = {
  pages: Page[]; onMove: (i: number, d: -1 | 1) => void
  onEdit: (i: number) => void; onRemove: (i: number) => void; children?: ReactNode
}

export function PageGrid({ pages, onMove, onEdit, onRemove, children }: PageGridProps) {
  return (
    <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {pages.map((page, index) => (
        <li key={page.image.id} className="group flex animate-pop-in flex-col overflow-hidden rounded-2xl border border-[#e2d9cc] bg-white shadow-sm shadow-amber-900/5 transition-all duration-150 hover:border-[#c9bfb2] hover:shadow-md hover:shadow-amber-900/8">
          {/* Thumbnail */}
          <button type="button" onClick={() => onEdit(index)} className="relative aspect-[3/4] overflow-hidden bg-[#f8f4ee]" aria-label={`Edit page ${index + 1}`}>
            <img src={page.processed.image_url} alt="" className="size-full object-contain p-1.5 transition-transform duration-300 group-hover:scale-[1.03]" />
            <span className="absolute top-1.5 left-1.5 flex size-6 items-center justify-center rounded-full bg-[#1c1814]/70 text-[11px] font-bold text-white">{index + 1}</span>
            <span className="absolute top-1.5 right-1.5 rounded-md bg-[#1c1814]/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">{page.enhancement === 'black_white' ? 'B&W' : 'Color'}</span>
          </button>
          {/* Action strip */}
          <div className="flex items-center justify-between border-t border-[#e2d9cc] bg-[#faf8f4] px-1 py-0.5">
            <Btn label={`Move page ${index + 1} earlier`} disabled={index === 0}            onClick={() => onMove(index, -1)}><ChevronLeft className="size-3.5" /></Btn>
            <Btn label={`Edit page ${index + 1}`}                                          onClick={() => onEdit(index)}   ><Pencil      className="size-3.5" /></Btn>
            <Btn label={`Remove page ${index + 1}`} danger                                 onClick={() => onRemove(index)} ><Trash2      className="size-3.5" /></Btn>
            <Btn label={`Move page ${index + 1} later`}  disabled={index === pages.length - 1} onClick={() => onMove(index, 1)} ><ChevronRight className="size-3.5" /></Btn>
          </div>
        </li>
      ))}
      {children && <li>{children}</li>}
    </ol>
  )
}

function Btn({ label, onClick, disabled, danger, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled}
      className={`flex size-8 items-center justify-center rounded-lg transition-all active:scale-90 disabled:opacity-20 ${
        danger ? 'text-red-600 hover:bg-red-50' : 'text-[#555047] hover:bg-[#f0ebe3] hover:text-[#1c1814]'
      }`}
    >
      {children}
    </button>
  )
}
