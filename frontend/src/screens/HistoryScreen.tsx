import { Download, FileSearch, FolderOpen, Loader2, RotateCw, ScanLine, Search, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { listScans, pdfDownloadUrl, type ScanSummary } from '../api/client'
import { Alert } from '../components/Alert'
import { Highlight } from '../components/Highlight'
import { buttonClass } from '../components/ui/buttons'
import { formatDate, formatRelative } from '../lib/time'

type HistoryScreenProps = { onOpenScan: (id: string) => void; onStartScanning: () => void }

const SEARCH_DELAY_MS = 300

export function HistoryScreen({ onOpenScan, onStartScanning }: HistoryScreenProps) {
  const [search, setSearch] = useState('')
  const [scans, setScans] = useState<ScanSummary[] | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(() => {
      listScans(search.trim())
        .then((r) => { if (cancelled) return; setScans(r); setError(null) })
        .catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load history.') })
        .finally(() => { if (!cancelled) setIsSearching(false) })
    }, SEARCH_DELAY_MS)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [search, attempt])

  function changeSearch(v: string) { setSearch(v); setIsSearching(true) }
  const query = search.trim()

  return (
    <section className="flex flex-col gap-5">
      {/* Page title row */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl text-[#1c1814]">History</h2>
          <p className="text-sm text-[#555047]">
            {scans && !query ? `${scans.length} saved ${scans.length === 1 ? 'scan' : 'scans'}` : 'All your saved scans'}
          </p>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#555047]" />
        <input
          type="search"
          value={search}
          onChange={(e) => changeSearch(e.target.value)}
          placeholder="Search titles and text…"
          aria-label="Search scans"
          maxLength={100}
          className="h-11 w-full rounded-xl border border-[#d4c9bb] bg-white pl-9 pr-9 text-sm text-[#1c1814] placeholder-[#555047] shadow-sm transition-all focus:border-amber-500 focus:ring-3 focus:ring-amber-500/15 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        <span className="absolute top-1/2 right-2 -translate-y-1/2">
          {isSearching
            ? <Loader2 className="m-2 size-4 animate-spin text-[#555047]" />
            : search
              ? <button type="button" onClick={() => changeSearch('')} aria-label="Clear" className="flex size-7 items-center justify-center rounded-full text-[#555047] hover:bg-[#f0ebe3] hover:text-[#1c1814] transition-colors"><X className="size-3.5" /></button>
              : null}
        </span>
      </div>

      {error && (
        <Alert kind="error">
          {error}{' '}
          <button type="button" onClick={() => setAttempt((n) => n + 1)} className="inline-flex items-center gap-1 font-semibold underline">
            <RotateCw className="size-3.5" /> Try again
          </button>
        </Alert>
      )}

      {/* Skeleton */}
      {scans === null && !error && (
        <ul className="flex flex-col gap-2" aria-label="Loading">
          {[0,1,2,3].map((n) => (
            <li key={n} className="flex gap-3 rounded-xl border border-[#e2d9cc] bg-white p-3 shadow-sm">
              <div className="skeleton h-20 w-16 shrink-0 rounded-lg" />
              <div className="flex flex-1 flex-col gap-2 py-0.5">
                <div className="skeleton h-4 w-2/3 rounded-lg" />
                <div className="skeleton h-3 w-1/3 rounded-lg" />
                <div className="skeleton h-3 w-4/5 rounded-lg" />
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Empty states */}
      {scans?.length === 0 && (
        query
          ? <EmptyState icon={<FileSearch className="size-6" />} title="No results" text={`Nothing matched "${query}". Try a different word.`} />
          : <EmptyState icon={<FolderOpen className="size-6" />} title="No scans yet" text="Scans you create and save will appear here." action={<button type="button" onClick={onStartScanning} className={buttonClass('primary', 'sm')}><ScanLine className="size-4" />Start scanning</button>} />
      )}

      {/* Scan list */}
      {scans && scans.length > 0 && (
        <ul className={`flex flex-col gap-2 transition-opacity duration-200 ${isSearching ? 'opacity-60' : ''}`}>
          {scans.map((scan) => (
            <li key={scan.id} className="group relative flex animate-fade-in-up gap-3 rounded-xl border border-[#e2d9cc] bg-white p-3 shadow-sm shadow-amber-900/5 transition-all duration-150 hover:border-[#c9bfb2] hover:shadow-md hover:shadow-amber-900/8">
              <button type="button" onClick={() => onOpenScan(scan.id)} className="flex min-w-0 flex-1 gap-3 text-left focus:outline-none">
                <span className="absolute inset-0 rounded-xl group-has-focus-visible:ring-2 group-has-focus-visible:ring-amber-500" />
                <span className="relative h-20 w-16 shrink-0 overflow-hidden rounded-lg border border-[#e2d9cc] bg-[#f8f4ee]">
                  {scan.thumbnail_url && <img src={scan.thumbnail_url} alt="" className="size-full object-cover object-top" />}
                  <span className="absolute right-1 bottom-1 rounded bg-[#1c1814]/70 px-1 text-[10px] font-bold text-white">{scan.page_count}p</span>
                </span>
                <span className="flex min-w-0 flex-col gap-0.5 py-0.5 pr-9">
                  <span className="truncate text-sm font-semibold text-[#1c1814]"><Highlight text={scan.title} query={query} /></span>
                  <span className="text-xs text-[#555047]" title={formatDate(scan.created_at)}>
                    {formatRelative(scan.created_at)} · {scan.page_count} {scan.page_count === 1 ? 'page' : 'pages'}
                  </span>
                  {scan.snippet && (
                    <span className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-[#2e2118]"><Highlight text={scan.snippet} query={query} /></span>
                  )}
                </span>
              </button>
              <a href={pdfDownloadUrl(scan)} download={`${scan.title}.pdf`} aria-label={`Download ${scan.title} as PDF`} title="Download PDF"
                className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-lg text-[#555047] transition-all hover:bg-amber-50 hover:text-amber-700 active:scale-90">
                <Download className="size-4" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#d4c9bb] bg-[#f8f4ee] px-6 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700">{icon}</span>
      <div>
        <h3 className="font-semibold text-[#1c1814]">{title}</h3>
        <p className="mt-1 max-w-xs text-sm text-[#555047]">{text}</p>
      </div>
      {action}
    </div>
  )
}
