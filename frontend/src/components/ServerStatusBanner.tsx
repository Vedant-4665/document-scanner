import { RotateCw, WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getHealth } from '../api/client'

// Checks the backend once when the app opens. Shows nothing when all is
// well, and a warning with a retry button when the backend can't be reached.
export function ServerStatusBanner() {
  const [error, setError] = useState<string | null>(null)
  // Increasing this number re-runs the check ("Try again" button).
  const [checkCount, setCheckCount] = useState(0)

  useEffect(() => {
    // If the component goes away before the answer arrives, ignore the answer.
    let cancelled = false
    getHealth()
      .then(() => {
        if (!cancelled) setError(null)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unknown error')
      })
    return () => {
      cancelled = true
    }
  }, [checkCount])

  if (!error) return null

  return (
    <div
      role="alert"
      className="flex animate-fade-in-up items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-900"
    >
      <WifiOff className="size-5 shrink-0 text-amber-500" />
      <p className="flex-1">{error}</p>
      <button
        type="button"
        onClick={() => setCheckCount((count) => count + 1)}
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-semibold hover:bg-amber-100"
      >
        <RotateCw className="size-4" /> Retry
      </button>
    </div>
  )
}
