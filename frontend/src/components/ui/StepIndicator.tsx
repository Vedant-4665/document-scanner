import { Check } from 'lucide-react'

const STEPS = ['Capture', 'Corners', 'Enhance', 'Review']

export function StepIndicator({ current }: { current: 1 | 2 | 3 | 4 }) {
  return (
    <div className="flex items-center gap-0" role="list" aria-label={`Step ${current} of ${STEPS.length}`}>
      {STEPS.map((label, index) => {
        const number = index + 1
        const done   = number < current
        const active = number === current
        return (
          <div key={label} className="flex flex-1 items-center" role="listitem">
            {/* Circle + label */}
            <div className="flex flex-col items-center gap-1">
              <div
                aria-current={active ? 'step' : undefined}
                className={`flex size-8 items-center justify-center rounded-full text-[13px] font-bold transition-all duration-200 ${
                  done
                    ? 'bg-amber-700 text-white'
                    : active
                      ? 'bg-amber-700 text-white ring-4 ring-amber-200'
                      : 'bg-[#f0ebe3] text-[#555047] ring-1 ring-[#d4c9bb]'
                }`}
              >
                {done ? <Check className="size-4" strokeWidth={3} /> : number}
              </div>
              <span
                className={`hidden text-[11px] font-medium sm:block ${
                  active ? 'text-amber-700' : done ? 'text-[#2e2118]' : 'text-[#555047]'
                }`}
              >
                {label}
              </span>
            </div>

            {/* Connector */}
            {number < STEPS.length && (
              <div className={`mx-1 h-px flex-1 transition-all duration-300 ${done ? 'bg-amber-700' : 'bg-[#d4c9bb]'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
