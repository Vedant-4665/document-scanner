import { CircleCheck, Info, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'

type AlertProps = {
  kind: 'error' | 'warning' | 'success' | 'info'
  children: ReactNode
}

const STYLES = {
  error: { box: 'border-red-500/30 bg-red-500/10 text-red-300', icon: TriangleAlert, iconColor: 'text-red-400' },
  warning: { box: 'border-amber-500/30 bg-amber-500/10 text-amber-300', icon: TriangleAlert, iconColor: 'text-amber-400' },
  success: { box: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300', icon: CircleCheck, iconColor: 'text-emerald-400' },
  info: { box: 'border-sky-500/30 bg-sky-500/10 text-sky-300', icon: Info, iconColor: 'text-sky-400' },
}

// A coloured message box with an icon. role="alert" makes screen readers
// announce errors straight away.
export function Alert({ kind, children }: AlertProps) {
  const { box, icon: Icon, iconColor } = STYLES[kind]
  return (
    <div
      role={kind === 'error' ? 'alert' : 'status'}
      className={`flex animate-fade-in-up gap-3 rounded-2xl border p-3.5 text-sm backdrop-blur-sm ${box}`}
    >
      <Icon className={`mt-0.5 size-5 shrink-0 ${iconColor}`} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
