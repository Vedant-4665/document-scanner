import { CircleCheck, Info, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'

type AlertProps = { kind: 'error' | 'warning' | 'success' | 'info'; children: ReactNode }

const STYLES = {
  error:   { box: 'border-red-200    bg-red-50    text-red-900',    icon: TriangleAlert, ic: 'text-red-700',   bar: 'bg-red-700' },
  warning: { box: 'border-amber-200  bg-amber-50  text-amber-900',  icon: TriangleAlert, ic: 'text-amber-700', bar: 'bg-amber-700' },
  success: { box: 'border-green-200  bg-green-50  text-green-900',  icon: CircleCheck,   ic: 'text-green-700', bar: 'bg-green-700' },
  info:    { box: 'border-amber-200  bg-amber-50  text-amber-900',  icon: Info,           ic: 'text-amber-700', bar: 'bg-amber-700' },
}

export function Alert({ kind, children }: AlertProps) {
  const { box, icon: Icon, ic, bar } = STYLES[kind]
  return (
    <div
      role={kind === 'error' ? 'alert' : 'status'}
      className={`flex animate-fade-in-up items-start gap-3 overflow-hidden rounded-xl border text-sm ${box}`}
    >
      <div className={`w-1 self-stretch shrink-0 ${bar}`} />
      <Icon className={`mt-3.5 size-4 shrink-0 ${ic}`} />
      <div className="flex-1 py-3 pr-4">{children}</div>
    </div>
  )
}
