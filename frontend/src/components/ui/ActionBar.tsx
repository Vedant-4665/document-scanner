import type { ReactNode } from 'react'

// The row of main buttons at the end of a step. On phones it sticks to the
// bottom of the screen so "Save" is always within thumb reach; on bigger
// screens it is a normal row.
export function ActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-20 -mx-4 mt-2 flex gap-2 border-t border-slate-200 bg-white/90 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur sm:static sm:mx-0 sm:justify-end sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none [&>*]:flex-1 sm:[&>*]:flex-none">
      {children}
    </div>
  )
}
