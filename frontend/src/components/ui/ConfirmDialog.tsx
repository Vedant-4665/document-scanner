import { TriangleAlert } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { buttonClass } from './buttons'

type ConfirmDialogProps = {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

// A "Are you sure?" pop-up for actions that can't be undone, such as deleting.
// Uses the browser's built-in <dialog>, which handles focus and the Esc key.
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
      onCancel={(event) => {
        event.preventDefault() // Esc key: let React decide, via onCancel
        onCancel()
      }}
      // Clicking the dark area outside the box closes it.
      onClick={(event) => event.target === dialogRef.current && onCancel()}
      className="m-auto w-[min(92vw,24rem)] rounded-3xl bg-white p-0 shadow-2xl backdrop:bg-slate-900/50 backdrop:backdrop-blur-sm open:animate-pop-in"
    >
      <div className="flex flex-col items-center gap-3 p-6 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-red-50 text-red-600">
          <TriangleAlert className="size-6" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-600">{message}</p>
        <div className="mt-2 grid w-full grid-cols-2 gap-2">
          <button type="button" onClick={onCancel} className={buttonClass('secondary')}>
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className={buttonClass('danger')}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  )
}
