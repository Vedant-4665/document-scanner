import { Download, FileSearch, FolderOpen, Loader2, RotateCw, ScanLine, Search, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { listScans, pdfDownloadUrl, type ScanSummary } from '../api/client'
import { Alert } from '../components/Alert'
import { Highlight } from '../components/Highlight'
import { buttonClass } from '../components/ui/buttons'
import { formatDate, formatRelative } from '../lib/time'

type HistoryScreenProps = {
  onOpenScan: (id: string) => void
  onStartScanning: () => void
}

// Wait this long after the last key press before searching, so we don't
// send a request for every single letter.
const SEARCH_DELAY_MS = 300

// All saved scans, newest first, with a search box (title and text).
export function HistoryScreen({ onOpenScan, onStartScanning }: HistoryScreenProps) {
  const [search, setSearch] = useState('')
  const [scans, setScans] = useState<ScanSummary[] | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Increasing this number repeats the request ("Try again" button).
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    // If the search changes before the answer arrives, ignore the old answer.
    let cancelled = false
    const timer = setTimeout(() => {
      listScans(search.trim())
        .then((result) => {
          if (cancelled) return
          setScans(result)
          setError(null)
        })
        .catch((err: unknown) => {
          if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load history.')
        })
        .finally(() => {
          if (!cancelled) setIsSearching(false)
        })
    }, SEARCH_DELAY_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [search, attempt])

  function changeSearch(value: string) {
    setSearch(value)
    setIsSearching(true)
  }

  const query = search.trim()

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-gray-100">History</h2>
        <p className="text-sm text-gray-400">
          {scans && !query ? `${scans.length} saved ${scans.length === 1 ? 'scan' : 'scans'}` : 'Search by title or by any word in the text'}
        </p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-gray-500" />
        <input
          type="search"
          value={search}
          onChange={(event) => changeSearch(event.target.value)}
          placeholder="Search titles and text…"
          aria-label="Search scans"
          maxLength={100}
          className="h-12 w-full rounded-xl border border-gray-700/80 bg-gray-800/60 pr-11 pl-11 text-gray-100 placeholder-gray-500 shadow-sm backdrop-blur-sm transition focus:border-teal-500/60 focus:ring-4 focus:ring-teal-500/20 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        <span className="absolute top-1/2 right-2 -translate-y-1/2">
          {isSearching ? (
            <Loader2 className="m-2 size-4 animate-spin text-gray-500" />
          ) : (
            search && (
              <button
                type="button"
                onClick={() => changeSearch('')}
                aria-label="Clear search"
                className="flex size-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-700/60 hover:text-gray-300"
              >
                <X className="size-4" />
              </button>
            )
          )}
        </span>
      </div>

      {error && (
        <Alert kind="error">
          <p>{error}</p>
          <button type="button" onClick={() => setAttempt((count) => count + 1)} className="mt-1 inline-flex items-center gap-1 font-semibold underline">
            <RotateCw className="size-3.5" /> Try again
          </button>
        </Alert>
      )}

      {/* First load: grey placeholder cards. */}
      {scans === null && !error && (
        <ul className="grid gap-3 sm:grid-cols-2" aria-label="Loading">
          {[0, 1, 2, 3].map((n) => (
            <li key={n} className="flex gap-3 rounded-2xl border border-gray-800/80 bg-gray-800/40 p-3">
              <div className="skeleton h-24 w-18 rounded-lg" />
              <div className="flex flex-1 flex-col gap-2 py-1">
                <div className="skeleton h-4 w-3/4 rounded" />
                <div className="skeleton h-3 w-1/2 rounded" />
              </div>
            </li>
          ))}
        </ul>
      )}

      {scans?.length === 0 &&
        (query ? (
          <EmptyState icon={<FileSearch className="size-8" />} title="No matches" text={`Nothing found for "${query}". Try another word.`} />
        ) : (
          <EmptyState
            icon={<FolderOpen className="size-8" />}
            title="No saved scans yet"
            text="Scans you save appear here, ready to search and download."
            action={
              <button type="button" onClick={onStartScanning} className={buttonClass('primary')}>
                <ScanLine className="size-4" /> Start scanning
              </button>
            }
          />
        ))}

      {scans && scans.length > 0 && (
        <ul className={`grid gap-3 transition-opacity sm:grid-cols-2 ${isSearching ? 'opacity-60' : ''}`}>
          {scans.map((scan) => (
            <li
              key={scan.id}
              className="group relative flex animate-fade-in-up gap-3 rounded-2xl border border-gray-800/80 bg-gray-800/40 p-3 shadow-sm backdrop-blur-sm transition hover:border-teal-500/30 hover:shadow-lg hover:shadow-teal-500/5"
            >
              {/* The whole card opens the scan; the download button sits on top. */}
              <button
                type="button"
                onClick={() => onOpenScan(scan.id)}
                className="flex min-w-0 flex-1 gap-3 text-left focus:outline-none"
              >
                <span className="absolute inset-0 rounded-2xl group-has-focus-visible:ring-4 group-has-focus-visible:ring-teal-500/30" />
                <span className="relative h-24 w-18 shrink-0 overflow-hidden rounded-lg border border-gray-700/60 bg-gray-900/60">
                  {scan.thumbnail_url && <img src={scan.thumbnail_url} alt="" className="size-full object-cover object-top" />}
                  <span className="absolute right-1 bottom-1 rounded-md bg-gray-950/80 px-1.5 text-[11px] font-bold text-gray-300">
                    {scan.page_count}p
                  </span>
                </span>
                <span className="flex min-w-0 flex-col gap-1 py-0.5 pr-10">
                  <span className="truncate font-semibold text-gray-100">
                    <Highlight text={scan.title} query={query} />
                  </span>
                  <span className="text-xs text-gray-500" title={formatDate(scan.created_at)}>
                    {formatRelative(scan.created_at)} · {scan.page_count} {scan.page_count === 1 ? 'page' : 'pages'}
                  </span>
                  {scan.snippet && (
                    <span className="line-clamp-2 text-xs leading-relaxed text-gray-400">
                      <Highlight text={scan.snippet} query={query} />
                    </span>
                  )}
                </span>
              </button>
              <a
                href={pdfDownloadUrl(scan)}
                download={`${scan.title}.pdf`}
                aria-label={`Download ${scan.title} as PDF`}
                title="Download PDF"
                className="absolute top-3 right-3 flex size-9 items-center justify-center rounded-full text-gray-500 transition hover:bg-teal-500/10 hover:text-teal-400 active:scale-90"
              >
                <Download className="size-4" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function EmptyState(props: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-gray-700/60 bg-gray-800/30 px-6 py-12 text-center backdrop-blur-sm">
      <span className="flex size-16 items-center justify-center rounded-3xl bg-teal-500/10 text-teal-400">{props.icon}</span>
      <h3 className="font-semibold text-gray-200">{props.title}</h3>
      <p className="max-w-xs text-sm text-gray-500">{props.text}</p>
      {props.action}
    </div>
  )
}
