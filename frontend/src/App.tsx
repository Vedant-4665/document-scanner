import { History, ScanLine } from 'lucide-react'
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

// The two tabs. Switching tabs keeps the scan in progress.
type Tab = 'scan' | 'history'

// The page currently being set up, and which of its two steps is showing.
type Editing = {
  draft: PageDraft
  index: number | null // position in `pages` when editing an existing page; null = new page
  step: 'corners' | 'result'
}

export default function App() {
  const showToast = useToast()
  const [tab, setTab] = useState<Tab>('scan')
  // The saved scan open in the History tab, if any.
  const [openScanId, setOpenScanId] = useState<string | null>(null)
  // The document being built, in page order. It lives only in this browser
  // tab until "Create and save PDF" saves it to history.
  const [pages, setPages] = useState<Page[]>([])
  const [editing, setEditing] = useState<Editing | null>(null)
  const [isReviewing, setIsReviewing] = useState(false)
  // True once the current pages have been saved as a PDF in history.
  const [isSaved, setIsSaved] = useState(false)
  // A photo being uploaded and analysed right now, and the switch that cancels it.
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const analysisAbort = useRef<AbortController | null>(null)
  // Why the last chosen photo couldn't be added (wrong file type, upload failed…).
  const [captureError, setCaptureError] = useState<string | null>(null)

  // Ask before closing or reloading the tab, which would lose the pages.
  const hasUnsavedWork = (pages.length > 0 && !isSaved) || editing !== null
  useEffect(() => {
    if (!hasUnsavedWork) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [hasUnsavedWork])

  // --- Adding a page: upload the photo, then look for the page edges ---

  async function handleFileChosen(file: File) {
    setCaptureError(null)
    const problem = validateImageFile(file)
    if (problem) {
      setCaptureError(problem)
      return
    }

    const controller = new AbortController()
    analysisAbort.current = controller
    const previewUrl = URL.createObjectURL(file) // shows the photo instantly
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
        // Detection failing is not the end: the user can still place corners by hand.
        const corners = wholeImageCorners(image.width, image.height)
        draft = {
          ...base,
          detection: { corners, found: false },
          detectionError: err instanceof Error ? err.message : 'Unknown error',
          corners,
        }
      }
      if (controller.signal.aborted) return // cancelled just now
      setEditing({ draft, index: null, step: 'corners' })
    } catch (err) {
      // Cancelling on purpose is not an error to show.
      if (!isCancelled(err)) setCaptureError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      // Whether it worked, failed or was cancelled: close the analysis screen.
      URL.revokeObjectURL(previewUrl)
      if (analysisAbort.current === controller) analysisAbort.current = null
      setAnalysis((current) => (current?.previewUrl === previewUrl ? null : current))
    }
  }

  // The wrong photo was chosen: stop the upload and go back to the page list.
  function cancelAnalysis() {
    analysisAbort.current?.abort()
    setAnalysis(null)
  }

  // --- Editing a page ---

  function updateDraft(changes: Partial<PageDraft>) {
    setEditing((current) => current && { ...current, draft: { ...current.draft, ...changes } })
  }

  // Leaving a page without saving it. An "Undo" button in the message brings it
  // back, so cancelling by accident costs nothing.
  function cancelEditing() {
    const discarded = editing
    setEditing(null)
    if (!discarded) return
    showToast(discarded.index === null ? 'Page discarded' : 'Changes discarded', {
      kind: 'info',
      action: { label: 'Undo', onClick: () => setEditing(discarded) },
    })
  }

  function savePage(page: Page, index: number | null) {
    setPages((current) =>
      index === null ? [...current, page] : current.map((p, i) => (i === index ? page : p)),
    )
    setEditing(null)
    showToast(index === null ? `Page ${pages.length + 1} added` : `Page ${index + 1} updated`)
  }

  function movePage(index: number, direction: -1 | 1) {
    setPages((current) => {
      const next = [...current]
      const [page] = next.splice(index, 1)
      next.splice(index + direction, 0, page)
      return next
    })
  }

  // Removing is instant, with an "Undo" button in the message instead of an
  // "Are you sure?" question: faster, and mistakes are easy to fix.
  function removePage(index: number) {
    const removed = pages[index]
    setPages((current) => current.filter((_, i) => i !== index))
    showToast(`Page ${index + 1} removed`, {
      kind: 'info',
      action: {
        label: 'Undo',
        onClick: () =>
          setPages((current) => [...current.slice(0, index), removed, ...current.slice(index)]),
      },
    })
  }

  function startNewScan() {
    setPages([])
    setEditing(null)
    setIsReviewing(false)
    setIsSaved(false)
  }

  // --- Moving around ---

  // The logo, and the Scan tab when you are already on it: back to the page
  // list (or the start screen), from wherever you are. Pages already added
  // are kept.
  function goHome() {
    window.scrollTo({ top: 0 })
    setTab('scan')
    if (analysis) cancelAnalysis()
    if (editing) cancelEditing()
    if (isSaved) startNewScan() // the document is already saved: start fresh
    else setIsReviewing(false)
  }

  function switchTab(next: Tab) {
    if (next === 'scan' && tab === 'scan') {
      goHome()
      return
    }
    setTab(next)
    if (next === 'history') setOpenScanId(null)
    window.scrollTo({ top: 0 })
  }

  // How many steps deep the app is. The browser's Back button needs this
  // (see useBackButton): 0 = a home screen, 1 = one step in, 2 = two steps in.
  const depth =
    tab === 'history'
      ? openScanId
        ? 1
        : 0
      : analysis
        ? 1
        : editing
          ? editing.step === 'result'
            ? 2
            : 1
          : isReviewing && pages.length > 0
            ? 1
            : 0

  // The browser's (or phone's) Back button: go back exactly one step.
  useBackButton(depth, () => {
    if (tab === 'history') setOpenScanId(null)
    else if (analysis) cancelAnalysis()
    else if (editing?.step === 'result') setEditing({ ...editing, step: 'corners' })
    else if (editing) cancelEditing()
    else if (isReviewing) {
      if (isSaved) startNewScan()
      else setIsReviewing(false)
    }
  })

  const pageNumber = editing ? (editing.index ?? pages.length) + 1 : 0

  // Work out which screen to show. `screenKey` changes with the screen, which
  // replays the fade-in animation.
  let screenKey: string
  let screen: ReactNode
  if (tab === 'history') {
    screenKey = openScanId ? `scan-${openScanId}` : 'history'
    screen = openScanId ? (
      <ScanDetailScreen
        scanId={openScanId}
        onBack={() => setOpenScanId(null)}
        onDeleted={() => setOpenScanId(null)}
      />
    ) : (
      <HistoryScreen onOpenScan={setOpenScanId} onStartScanning={() => switchTab('scan')} />
    )
  } else if (isReviewing && pages.length > 0) {
    screenKey = 'review'
    screen = (
      <ReviewScreen
        pages={pages}
        onBack={() => setIsReviewing(false)}
        onNewScan={startNewScan}
        onSaved={() => setIsSaved(true)}
        onViewHistory={() => {
          startNewScan()
          switchTab('history')
        }}
      />
    )
  } else if (!editing) {
    screenKey = analysis ? 'analysing' : 'scan'
    screen = (
      <ScanScreen
        pages={pages}
        analysis={analysis}
        error={captureError}
        onFileChosen={(file) => void handleFileChosen(file)}
        onCancelAnalysis={cancelAnalysis}
        onMovePage={movePage}
        onEditPage={(index) => setEditing({ draft: pages[index], index, step: 'corners' })}
        onRemovePage={removePage}
        onReview={() => setIsReviewing(true)}
      />
    )
  } else if (editing.step === 'corners') {
    screenKey = 'corners'
    screen = (
      <AdjustCornersScreen
        pageNumber={pageNumber}
        draft={editing.draft}
        onCornersChange={(corners) => updateDraft({ corners })}
        onContinue={() => setEditing({ ...editing, step: 'result' })}
        onCancel={cancelEditing}
      />
    )
  } else {
    screenKey = 'result'
    screen = (
      <PageResultScreen
        pageNumber={pageNumber}
        draft={editing.draft}
        onEnhancementChange={(enhancement) => updateDraft({ enhancement })}
        onRotationChange={(rotation) => updateDraft({ rotation })}
        onSave={(processed) => savePage({ ...editing.draft, processed }, editing.index)}
        onBack={() => setEditing({ ...editing, step: 'corners' })}
        onCancel={cancelEditing}
      />
    )
  }

  // While a page is being edited, the bottom tab bar is hidden so the
  // step's own buttons can sit at the bottom of the screen.
  const showBottomNav = !(tab === 'scan' && editing)
  // The Scan tab shows how many pages are waiting to be saved.
  const unsavedCount = isSaved ? 0 : pages.length

  return (
    <div className="min-h-dvh bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      <header className="sticky top-0 z-30 border-b border-gray-800/80 bg-gray-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-3 px-4">
          <button
            type="button"
            onClick={goHome}
            aria-label="DocScan home"
            className="flex items-center gap-2.5 rounded-xl"
          >
            <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 text-gray-950 shadow-lg shadow-teal-500/30">
              <ScanLine className="size-5" />
            </span>
            <span className="text-left leading-tight">
              <span className="block font-bold tracking-tight text-gray-100">DocScan</span>
              
            </span>
          </button>

          {/* Desktop tabs. Phones use the bottom bar instead. */}
          <nav className="hidden rounded-xl bg-gray-800/60 p-1 backdrop-blur-sm sm:flex" aria-label="Main">
            <TabButton active={tab === 'scan'} onClick={() => switchTab('scan')} icon={<ScanLine className="size-4" />}>
              Scan
              {unsavedCount > 0 && <CountBadge count={unsavedCount} />}
            </TabButton>
            <TabButton active={tab === 'history'} onClick={() => switchTab('history')} icon={<History className="size-4" />}>
              History
            </TabButton>
          </nav>
        </div>
      </header>

      <main className={`mx-auto flex max-w-3xl flex-col gap-4 px-4 pt-5 ${showBottomNav ? 'pb-28 sm:pb-12' : 'pb-6 sm:pb-12'}`}>
        <ServerStatusBanner />
        <div key={screenKey} className="animate-fade-in-up">
          {screen}
        </div>
      </main>

      {showBottomNav && (
        <nav
          aria-label="Main"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-800/80 bg-gray-950/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl sm:hidden"
        >
          <div className="grid grid-cols-2">
            <BottomTab active={tab === 'scan'} onClick={() => switchTab('scan')} label="Scan" badge={unsavedCount}>
              <ScanLine className="size-6" />
            </BottomTab>
            <BottomTab active={tab === 'history'} onClick={() => switchTab('history')} label="History">
              <History className="size-6" />
            </BottomTab>
          </div>
        </nav>
      )}
    </div>
  )
}

function TabButton(props: { active: boolean; onClick: () => void; icon: ReactNode; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      aria-current={props.active ? 'page' : undefined}
      className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
        props.active ? 'bg-gray-700/80 text-teal-400 shadow-sm shadow-teal-500/10' : 'text-gray-400 hover:text-gray-200'
      }`}
    >
      {props.icon}
      {props.children}
    </button>
  )
}

function BottomTab(props: { active: boolean; onClick: () => void; label: string; badge?: number; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      aria-current={props.active ? 'page' : undefined}
      className={`relative flex flex-col items-center gap-0.5 py-2.5 text-xs font-semibold transition active:scale-95 ${
        props.active ? 'text-teal-400' : 'text-gray-500'
      }`}
    >
      <span className="relative">
        {props.children}
        {!!props.badge && (
          <span className="absolute -top-1.5 -right-2.5">
            <CountBadge count={props.badge} />
          </span>
        )}
      </span>
      {props.label}
    </button>
  )
}

// Small round number, e.g. how many pages are waiting in the current scan.
function CountBadge({ count }: { count: number }) {
  return (
    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-teal-500 px-1.5 text-[11px] leading-5 font-bold text-gray-950">
      {count}
    </span>
  )
}
