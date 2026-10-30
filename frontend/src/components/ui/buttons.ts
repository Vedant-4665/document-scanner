// Tailwind classes for every button and button-looking link, so they all match.
// Use like: <button className={buttonClass('primary')}>…</button>

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold whitespace-nowrap ' +
  'transition select-none active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 ' +
  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-500/30'

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-gradient-to-r from-teal-500 to-cyan-500 text-gray-950 shadow-lg shadow-teal-500/25 hover:from-teal-400 hover:to-cyan-400 hover:shadow-teal-500/40',
  secondary: 'border border-gray-700/80 bg-gray-800/60 text-gray-200 shadow-sm backdrop-blur-sm hover:bg-gray-700/60 hover:border-gray-600',
  ghost: 'text-gray-400 hover:bg-gray-800/60 hover:text-gray-200',
  danger: 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-600/25 hover:from-red-500 hover:to-rose-500',
}

export function buttonClass(variant: Variant = 'primary', size: Size = 'md') {
  return `${BASE} ${SIZES[size]} ${VARIANTS[variant]}`
}

// Round, icon-only button (always give it an aria-label).
export const iconButtonClass =
  'inline-flex size-10 items-center justify-center rounded-full border border-gray-700/80 bg-gray-800/60 ' +
  'text-gray-300 shadow-sm backdrop-blur-sm transition hover:bg-gray-700/60 hover:border-gray-600 hover:text-teal-400 active:scale-90 disabled:opacity-40 ' +
  'disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-500/30'
