import type { ReactNode } from 'react'

// Sticky action bar at the bottom of each editing step.
export function ActionBar({ children }: { children: ReactNode }) {
  return (
    <div
      className={
        'sticky bottom-0 z-20 -mx-4 mt-3 flex gap-2 ' +
        'border-t border-[#e2d9cc] bg-[#faf8f4]/95 px-4 pt-3 backdrop-blur-sm ' +
        'pb-[calc(env(safe-area-inset-bottom)+0.75rem)] ' +
        'sm:static sm:mx-0 sm:justify-end sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none ' +
        '[&>*]:flex-1 sm:[&>*]:flex-none'
      }
    >
      {children}
    </div>
  )
}
