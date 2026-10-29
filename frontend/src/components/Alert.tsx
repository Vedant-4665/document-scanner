import { CircleCheck, Info, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'

type AlertProps = {
  kind: 'error' | 'warning' | 'success' | 'info'
  children: ReactNode
}

const STYLES = {
  error: { box: 'border-red-200 bg-red-50 text-red-800', icon: TriangleAlert, iconColor: 'text-red-500' },
  warning: { box: 'border-amber-200 bg-amber-50 text-amber-900', icon: TriangleAlert, iconColor: 'text-amber-500' },
  success: { box: 'border-emerald-200 bg-emerald-50 text-emerald-900', icon: CircleCheck, iconColor: 'text-emerald-500' },
  info: { box: 'border-sky-200 bg-sky-50 text-sky-900', icon: Info, iconColor: 'text-sky-500' },
}

// A coloured message box with an icon. role="alert" makes screen readers
// announce errors straight away.
export function Alert({ kind, children }: AlertProps) {
  const { box, icon: Icon, iconColor } = STYLES[kind]
  return (
    <div
      role={kind === 'error' ? 'alert' : 'status'}
      className={`flex animate-fade-in-up gap-3 rounded-2xl border p-3.5 text-sm ${box}`}
    >
      <Icon className={`mt-0.5 size-5 shrink-0 ${iconColor}`} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
