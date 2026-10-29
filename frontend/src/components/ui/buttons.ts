// Tailwind classes for every button and button-looking link, so they all match.
// Use like: <button className={buttonClass('primary')}>…</button>

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold whitespace-nowrap ' +
  'transition select-none active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 ' +
  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200'

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/25 hover:bg-indigo-700',
  secondary: 'border border-slate-200 bg-white text-slate-800 shadow-sm hover:bg-slate-50',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  danger: 'bg-red-600 text-white shadow-sm shadow-red-600/25 hover:bg-red-700',
}

export function buttonClass(variant: Variant = 'primary', size: Size = 'md') {
  return `${BASE} ${SIZES[size]} ${VARIANTS[variant]}`
}

// Round, icon-only button (always give it an aria-label).
export const iconButtonClass =
  'inline-flex size-10 items-center justify-center rounded-full border border-slate-200 bg-white ' +
  'text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-90 disabled:opacity-40 ' +
  'disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200'
