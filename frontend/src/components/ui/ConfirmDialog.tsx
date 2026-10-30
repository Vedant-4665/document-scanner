import { TriangleAlert } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { buttonClass } from './buttons'

type ConfirmDialogProps = {
  open: boolean; title: string; message: string
  confirmLabel: string; onConfirm: () => void; onCancel: () => void
}

export function ConfirmDialog({ open, title, message, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => { e.preventDefault(); onCancel() }}
      onClick={(e) => e.target === dialogRef.current && onCancel()}
      className="m-auto w-[min(92vw,22rem)] rounded-2xl bg-white p-0 shadow-2xl shadow-amber-900/15 backdrop:bg-[#1c1814]/40 backdrop:backdrop-blur-sm open:animate-pop-in"
    >
      {/* top accent stripe */}
      <div className="h-1 w-full rounded-t-2xl bg-amber-700" />
      <div className="flex flex-col gap-4 p-6">
        {/* icon */}
        <div className="flex size-12 items-center justify-center rounded-full bg-red-50 ring-1 ring-red-200">
          <TriangleAlert className="size-6 text-red-700" />
        </div>
        <div>
          <h2 className="text-[17px] font-semibold text-[#1c1814]">{title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-[#2e2118]">{message}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button type="button" onClick={onCancel}  className={buttonClass('secondary')}>Cancel</button>
          <button type="button" onClick={onConfirm} className={buttonClass('danger')}>{confirmLabel}</button>
        </div>
      </div>
    </dialog>
  )
}
