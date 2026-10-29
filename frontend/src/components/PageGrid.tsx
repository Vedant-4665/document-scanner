import { ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Page } from '../scanTypes'

type PageGridProps = {
  pages: Page[]
  onMove: (index: number, direction: -1 | 1) => void
  onEdit: (index: number) => void
  onRemove: (index: number) => void
  children?: ReactNode // extra tile at the end, e.g. "Add page"
}

// The pages of the current document as a grid of thumbnails, in order.
// Arrow buttons reorder: easy to tap on a phone and usable with a keyboard,
// unlike drag-and-drop.
export function PageGrid({ pages, onMove, onEdit, onRemove, children }: PageGridProps) {
  return (
    <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {pages.map((page, index) => (
        <li
          key={page.image.id}
          className="group flex animate-pop-in flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <button
            type="button"
            onClick={() => onEdit(index)}
            className="relative aspect-[3/4] overflow-hidden bg-slate-100"
            aria-label={`Edit page ${index + 1}`}
          >
            <img
              src={page.processed.image_url}
              alt=""
              className="size-full object-contain p-1.5 transition group-hover:scale-[1.03]"
            />
            <span className="absolute top-2 left-2 flex size-7 items-center justify-center rounded-full bg-slate-900/80 text-xs font-bold text-white">
              {index + 1}
            </span>
            <span className="absolute top-2 right-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-slate-700 shadow-sm">
              {page.enhancement === 'black_white' ? 'B&W' : 'Color'}
            </span>
          </button>
          <div className="flex items-center justify-between border-t border-slate-100 px-1.5 py-1">
            <SmallIconButton label={`Move page ${index + 1} earlier`} disabled={index === 0} onClick={() => onMove(index, -1)}>
              <ChevronLeft className="size-4" />
            </SmallIconButton>
            <SmallIconButton label={`Edit page ${index + 1}`} onClick={() => onEdit(index)}>
              <Pencil className="size-4" />
            </SmallIconButton>
            <SmallIconButton label={`Remove page ${index + 1}`} onClick={() => onRemove(index)} danger>
              <Trash2 className="size-4" />
            </SmallIconButton>
            <SmallIconButton
              label={`Move page ${index + 1} later`}
              disabled={index === pages.length - 1}
              onClick={() => onMove(index, 1)}
            >
              <ChevronRight className="size-4" />
            </SmallIconButton>
          </div>
        </li>
      ))}
      {children && <li>{children}</li>}
    </ol>
  )
}

function SmallIconButton(props: {
  label: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={props.label}
      title={props.label}
      onClick={props.onClick}
      disabled={props.disabled}
      className={`flex size-9 items-center justify-center rounded-lg transition active:scale-90 disabled:opacity-25 ${
        props.danger ? 'text-red-600 hover:bg-red-50' : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      {props.children}
    </button>
  )
}
