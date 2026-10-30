import { RotateCw, WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getHealth } from '../api/client'

export function ServerStatusBanner() {
  const [error, setError] = useState<string | null>(null)
  const [checkCount, setCheckCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    getHealth()
      .then(() => { if (!cancelled) setError(null) })
      .catch((err: unknown) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Unknown error') })
    return () => { cancelled = true }
  }, [checkCount])

  if (!error) return null

  return (
    <div
      role="alert"
      className="mb-4 flex animate-fade-in-up items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-3.5 text-sm text-amber-900"
    >
      <WifiOff className="size-4 shrink-0 text-amber-700" />
      <p className="flex-1 text-[13px] font-medium">{error}</p>
      <button
        type="button"
        onClick={() => setCheckCount((n) => n + 1)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100"
      >
        <RotateCw className="size-3.5" /> Retry
      </button>
    </div>
  )
}
