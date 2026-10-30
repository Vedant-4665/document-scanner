import { CircleCheck, Info, TriangleAlert } from 'lucide-react'
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

type ToastKind   = 'success' | 'error' | 'info'
type ToastAction = { label: string; onClick: () => void }
type ToastOptions = { kind?: ToastKind; action?: ToastAction }
type ToastItem   = { id: number; message: string; kind: ToastKind; action?: ToastAction }

const DURATION_MS             = 3000
const DURATION_WITH_ACTION_MS = 6000

const ToastContext = createContext<(message: string, options?: ToastOptions) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id))
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
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4 sm:bottom-6">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex w-full max-w-sm animate-slide-down items-center gap-3 rounded-2xl border border-[#d4c9bb] bg-white px-4 py-3 text-sm text-[#1c1814] shadow-lg shadow-amber-900/10"
          >
            {toast.kind === 'success' && <CircleCheck className="size-5 shrink-0 text-green-700" />}
            {toast.kind === 'error'   && <TriangleAlert className="size-5 shrink-0 text-red-700" />}
            {toast.kind === 'info'    && <Info className="size-5 shrink-0 text-amber-700" />}
            <span className="flex-1 font-medium">{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                onClick={() => { toast.action?.onClick(); dismiss(toast.id) }}
                className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50 transition-colors"
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

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => useContext(ToastContext)
