import { Check } from 'lucide-react'

const STEPS = ['Capture', 'Corners', 'Enhance', 'Review']

// The progress bar at the top of the scanning flow: ① Capture ② Corners …
export function StepIndicator({ current }: { current: 1 | 2 | 3 | 4 }) {
  return (
    <ol className="flex items-center gap-1.5" aria-label={`Step ${current} of ${STEPS.length}`}>
      {STEPS.map((label, index) => {
        const number = index + 1
        const done = number < current
        const active = number === current
        return (
          <li key={label} className="flex flex-1 items-center gap-1.5">
            <span
              className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                done
                  ? 'bg-teal-500 text-gray-950'
                  : active
                    ? 'bg-teal-500 text-gray-950 ring-4 ring-teal-500/20'
                    : 'bg-gray-700/60 text-gray-500'
              }`}
              aria-current={active ? 'step' : undefined}
            >
              {done ? <Check className="size-3.5" strokeWidth={3} /> : number}
            </span>
            <span
              className={`hidden text-xs font-medium sm:inline ${active ? 'text-gray-200' : 'text-gray-500'}`}
            >
              {label}
            </span>
            {number < STEPS.length && (
              <span className={`h-0.5 flex-1 rounded-full ${done ? 'bg-teal-500' : 'bg-gray-700/60'}`} />
            )}
          </li>
        )
      })}
    </ol>
  )
}
