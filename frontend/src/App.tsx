import { Clock, FileScan, History, ScanLine } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { detectCorners, isCancelled, uploadImage } from './api/client'
import { ServerStatusBanner } from './components/ServerStatusBanner'
import { useToast } from './components/ui/Toast'
import { wholeImageCorners } from './lib/corners'
import { useBackButton } from './lib/useBackButton'
import { validateImageFile } from './lib/validateImageFile'
import type { Analysis, Page, PageDraft } from './scanTypes'
import { AdjustCornersScreen } from './screens/AdjustCornersScreen'
import { HistoryScreen } from './screens/HistoryScreen'
import { PageResultScreen } from './screens/PageResultScreen'
import { ReviewScreen } from './screens/ReviewScreen'
import { ScanDetailScreen } from './screens/ScanDetailScreen'
import { ScanScreen } from './screens/ScanScreen'

type Tab     = 'scan' | 'history'
type Editing = { draft: PageDraft; index: number | null; step: 'corners' | 'result' }

export default function App() {
  const showToast = useToast()
  const [tab, setTab] = useState<Tab>('scan')
  const [openScanId, setOpenScanId] = useState<string | null>(null)
  const [pages, setPages] = useState<Page[]>([])
  const [editing, setEditing] = useState<Editing | null>(null)
  const [isReviewing, setIsReviewing] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const analysisAbort = useRef<AbortController | null>(null)
  const [captureError, setCaptureError] = useState<string | null>(null)

  const hasUnsavedWork = (pages.length > 0 && !isSaved) || editing !== null
  useEffect(() => {
    if (!hasUnsavedWork) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [hasUnsavedWork])

  async function handleFileChosen(file: File) {
    setCaptureError(null)
    const problem = validateImageFile(file)
    if (problem) { setCaptureError(problem); return }
    const controller = new AbortController()
    analysisAbort.current = controller
    const previewUrl = URL.createObjectURL(file)
    setAnalysis({ previewUrl, stage: 'uploading' })
    try {
      const image = await uploadImage(file, controller.signal)
      setAnalysis({ previewUrl, stage: 'detecting' })
      const base = { image, enhancement: 'original', rotation: 0 } as const
      let draft: PageDraft
      try {
        const detection = await detectCorners(image.filename, controller.signal)
        draft = { ...base, detection, detectionError: null, corners: detection.corners }
      } catch (err) {
        if (isCancelled(err)) throw err
        const corners = wholeImageCorners(image.width, image.height)
        draft = { ...base, detection: { corners, found: false }, detectionError: err instanceof Error ? err.message : 'Unknown error', corners }
      }
      if (controller.signal.aborted) return
      setEditing({ draft, index: null, step: 'corners' })
    } catch (err) {
      if (!isCancelled(err)) setCaptureError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      URL.revokeObjectURL(previewUrl)
      if (analysisAbort.current === controller) analysisAbort.current = null
      setAnalysis((c) => (c?.previewUrl === previewUrl ? null : c))
    }
  }

  function cancelAnalysis() { analysisAbort.current?.abort(); setAnalysis(null) }

  function updateDraft(changes: Partial<PageDraft>) {
    setEditing((c) => c && { ...c, draft: { ...c.draft, ...changes } })
  }

  function cancelEditing() {
    const discarded = editing; setEditing(null)
    if (!discarded) return
    showToast(discarded.index === null ? 'Page discarded' : 'Changes discarded', {
      kind: 'info', action: { label: 'Undo', onClick: () => setEditing(discarded) },
    })
  }

  function savePage(page: Page, index: number | null) {
    setPages((c) => index === null ? [...c, page] : c.map((p, i) => i === index ? page : p))
    setEditing(null)
    showToast(index === null ? `Page ${pages.length + 1} added` : `Page ${index + 1} updated`)
  }

  function movePage(index: number, direction: -1 | 1) {
    setPages((c) => { const n = [...c]; const [p] = n.splice(index, 1); n.splice(index + direction, 0, p); return n })
  }

  function removePage(index: number) {
    const removed = pages[index]
    setPages((c) => c.filter((_, i) => i !== index))
    showToast(`Page ${index + 1} removed`, {
      kind: 'info', action: { label: 'Undo', onClick: () => setPages((c) => [...c.slice(0, index), removed, ...c.slice(index)]) },
    })
  }

  function startNewScan() { setPages([]); setEditing(null); setIsReviewing(false); setIsSaved(false) }

  function goHome() {
    window.scrollTo({ top: 0 }); setTab('scan')
    if (analysis) cancelAnalysis()
    if (editing) cancelEditing()
    if (isSaved) startNewScan(); else setIsReviewing(false)
  }

  function switchTab(next: Tab) {
    if (next === 'scan' && tab === 'scan') { goHome(); return }
    setTab(next)
    if (next === 'history') setOpenScanId(null)
    window.scrollTo({ top: 0 })
  }

  const depth =
    tab === 'history' ? (openScanId ? 1 : 0)
    : analysis ? 1
    : editing ? (editing.step === 'result' ? 2 : 1)
    : (isReviewing && pages.length > 0) ? 1
    : 0

  useBackButton(depth, () => {
    if (tab === 'history') setOpenScanId(null)
    else if (analysis) cancelAnalysis()
    else if (editing?.step === 'result') setEditing({ ...editing, step: 'corners' })
    else if (editing) cancelEditing()
    else if (isReviewing) { if (isSaved) startNewScan(); else setIsReviewing(false) }
  })

  const pageNumber = editing ? (editing.index ?? pages.length) + 1 : 0

  let screenKey: string; let screen: ReactNode
  if (tab === 'history') {
    screenKey = openScanId ? `scan-${openScanId}` : 'history'
    screen = openScanId
      ? <ScanDetailScreen scanId={openScanId} onBack={() => setOpenScanId(null)} onDeleted={() => setOpenScanId(null)} />
      : <HistoryScreen onOpenScan={setOpenScanId} onStartScanning={() => switchTab('scan')} />
  } else if (isReviewing && pages.length > 0) {
    screenKey = 'review'
    screen = <ReviewScreen pages={pages} onBack={() => setIsReviewing(false)} onNewScan={startNewScan} onSaved={() => setIsSaved(true)} onViewHistory={() => { startNewScan(); switchTab('history') }} />
  } else if (!editing) {
    screenKey = analysis ? 'analysing' : 'scan'
    screen = <ScanScreen pages={pages} analysis={analysis} error={captureError} onFileChosen={(f) => void handleFileChosen(f)} onCancelAnalysis={cancelAnalysis} onMovePage={movePage} onEditPage={(i) => setEditing({ draft: pages[i], index: i, step: 'corners' })} onRemovePage={removePage} onReview={() => setIsReviewing(true)} />
  } else if (editing.step === 'corners') {
    screenKey = 'corners'
    screen = <AdjustCornersScreen pageNumber={pageNumber} draft={editing.draft} onCornersChange={(c) => updateDraft({ corners: c })} onContinue={() => setEditing({ ...editing, step: 'result' })} onCancel={cancelEditing} />
  } else {
    screenKey = 'result'
    screen = <PageResultScreen pageNumber={pageNumber} draft={editing.draft} onEnhancementChange={(e) => updateDraft({ enhancement: e })} onRotationChange={(r) => updateDraft({ rotation: r })} onSave={(p) => savePage({ ...editing.draft, processed: p }, editing.index)} onBack={() => setEditing({ ...editing, step: 'corners' })} onCancel={cancelEditing} />
  }

  const showBottomNav = !(tab === 'scan' && editing)
  const unsavedCount  = isSaved ? 0 : pages.length

  return (
    <div className="flex min-h-dvh flex-col bg-[#faf8f4]">

      {/* ── Top header bar ── */}
      <header className="sticky top-0 z-30 border-b border-[#e2d9cc] bg-[#faf8f4]">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-3 px-4">

          {/* Wordmark */}
          <button type="button" onClick={goHome} aria-label="DocScan home" className="flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">
            <span className="flex size-8 items-center justify-center rounded-lg bg-amber-700 text-white shadow-sm">
              <FileScan className="size-[18px]" />
            </span>
            <span className="font-display text-[18px] font-normal tracking-tight text-[#1c1814]">DocScan</span>
          </button>

          <div className="flex-1" />

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 sm:flex" aria-label="Main navigation">
            <DesktopTab active={tab === 'scan'} onClick={() => switchTab('scan')} icon={<ScanLine className="size-[15px]" />} badge={unsavedCount}>
              Scan
            </DesktopTab>
            <DesktopTab active={tab === 'history'} onClick={() => switchTab('history')} icon={<Clock className="size-[15px]" />}>
              History
            </DesktopTab>
          </nav>
        </div>
      </header>

      {/* ── Page content ── */}
      <main className={`mx-auto w-full max-w-2xl flex-1 px-4 pt-6 ${showBottomNav ? 'pb-28 sm:pb-10' : 'pb-6 sm:pb-10'}`}>
        <ServerStatusBanner />
        <div key={screenKey} className="animate-fade-in-up">
          {screen}
        </div>
      </main>

      {/* ── Mobile tab bar ── */}
      {showBottomNav && (
        <nav
          aria-label="Main navigation"
          className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-2 border-t border-[#e2d9cc] bg-[#faf8f4] pb-[env(safe-area-inset-bottom)] sm:hidden"
        >
          <MobileTab active={tab === 'scan'} onClick={() => switchTab('scan')} icon={<ScanLine className="size-5" />} label="Scan" badge={unsavedCount} />
          <MobileTab active={tab === 'history'} onClick={() => switchTab('history')} icon={<History className="size-5" />} label="History" />
        </nav>
      )}
    </div>
  )
}

/* ── Subcomponents ── */

function DesktopTab({ active, onClick, icon, children, badge }: {
  active: boolean; onClick: () => void; icon: ReactNode; children: ReactNode; badge?: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150 ${
        active
          ? 'bg-amber-50 text-amber-800 font-semibold'
          : 'text-[#2e2118] hover:bg-[#f0ebe3] hover:text-[#1c1814]'
      }`}
    >
      {icon}{children}
      {!!badge && <Badge count={badge} />}
    </button>
  )
}

function MobileTab({ active, onClick, icon, label, badge }: {
  active: boolean; onClick: () => void; icon: ReactNode; label: string; badge?: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`relative flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium transition-all active:scale-95 ${
        active ? 'text-amber-700' : 'text-[#555047]'
      }`}
    >
      <span className="relative">
        {icon}
        {!!badge && (
          <span className="absolute -top-1.5 -right-2"><Badge count={badge} /></span>
        )}
      </span>
      {label}
      {active && <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-full bg-amber-700" />}
    </button>
  )
}

function Badge({ count }: { count: number }) {
  return (
    <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-amber-700 px-1 text-[10px] leading-[18px] font-bold text-white">
      {count}
    </span>
  )
}
