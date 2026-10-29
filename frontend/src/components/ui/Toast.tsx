import { CircleCheck, Info, TriangleAlert } from 'lucide-react'
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

type ToastKind = 'success' | 'error' | 'info'
type ToastAction = { label: string; onClick: () => void }
type ToastOptions = { kind?: ToastKind; action?: ToastAction }
type ToastItem = { id: number; message: string; kind: ToastKind; action?: ToastAction }

// How long a message stays on screen. Messages with an Undo button stay longer.
const DURATION_MS = 3000
const DURATION_WITH_ACTION_MS = 6000

const ToastContext = createContext<(message: string, options?: ToastOptions) => void>(() => {})

// Short messages that pop up at the top of the screen and disappear on their
// own ("Page added", "Scan deleted"). Wrap the app in <ToastProvider>, then
// call `const showToast = useToast()` in any component.
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback(
    (message: string, { kind = 'success', action }: ToastOptions = {}) => {
      const id = Date.now() + Math.random()
      setToasts((current) => [...current.slice(-2), { id, message, kind, action }])
      setTimeout(() => dismiss(id), action ? DURATION_WITH_ACTION_MS : DURATION_MS)
    },
    [dismiss],
  )

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {/* aria-live makes screen readers read new messages aloud. */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-3 z-50 flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex w-full max-w-sm animate-pop-in items-center gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-sm text-white shadow-xl"
          >
            {toast.kind === 'success' && <CircleCheck className="size-5 shrink-0 text-emerald-400" />}
            {toast.kind === 'error' && <TriangleAlert className="size-5 shrink-0 text-amber-400" />}
            {toast.kind === 'info' && <Info className="size-5 shrink-0 text-sky-400" />}
            <span className="flex-1">{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  toast.action?.onClick()
                  dismiss(toast.id)
                }}
                className="rounded-lg px-2 py-1 font-semibold text-indigo-300 hover:bg-white/10"
              >
                {toast.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components -- the hook belongs with its provider
export const useToast = () => useContext(ToastContext)
