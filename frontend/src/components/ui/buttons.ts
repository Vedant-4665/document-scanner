// ============================================================
//  BUTTON CLASS SYSTEM  —  Warm editorial design
// ============================================================
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size    = 'sm' | 'md' | 'lg'

// Shared base
const BASE =
  'inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap select-none ' +
  'rounded-xl transition-all duration-150 ease-out ' +
  'active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#faf8f4]'

const SIZES: Record<Size, string> = {
  sm: 'h-8  px-3   text-[13px] rounded-lg',
  md: 'h-10 px-4   text-sm',
  lg: 'h-11 px-5   text-[15px]',
}

const VARIANTS: Record<Variant, string> = {
  // Warm amber — the main call-to-action
  primary:
    'bg-amber-700 text-white font-semibold ' +
    'shadow-[0_1px_2px_rgba(0,0,0,0.15),0_0_0_1px_rgba(180,90,20,0.5)] ' +
    'hover:bg-amber-600 hover:shadow-[0_2px_6px_rgba(180,90,20,0.35)]',

  // Outlined warm neutral
  secondary:
    'border border-[#d4c9bb] bg-white text-[#3d3028] font-medium ' +
    'shadow-sm hover:bg-[#f8f4ee] hover:border-[#c0b4a3]',

  // Text-only
  ghost:
    'text-[#2e2118] hover:bg-[#f0ebe3] hover:text-[#1c1814]',

  // Destructive
  danger:
    'bg-red-700 text-white font-semibold ' +
    'shadow-[0_1px_2px_rgba(0,0,0,0.15)] ' +
    'hover:bg-red-600',
}

export function buttonClass(variant: Variant = 'primary', size: Size = 'md') {
  return `${BASE} ${SIZES[size]} ${VARIANTS[variant]}`
}

// Round icon-only button
export const iconButtonClass =
  'inline-flex size-9 items-center justify-center rounded-xl ' +
  'border border-[#d4c9bb] bg-white text-[#2e2118] ' +
  'shadow-sm transition-all duration-150 ' +
  'hover:bg-[#f8f4ee] hover:border-[#c0b4a3] hover:text-amber-700 ' +
  'active:scale-90 disabled:opacity-40 disabled:pointer-events-none ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70'
