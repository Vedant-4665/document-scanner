import { Check, ChevronDown, Copy, Info, ScanText } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { copyText } from '../lib/copyText'
import { countWords, paragraphsToText, tidyOcrText } from '../lib/tidyText'
import { useToast } from './ui/Toast'
import { buttonClass } from './ui/buttons'

type TextViewerProps = {
  pages: { number: number; text: string }[]
}

// The text Tesseract read. Collapsed by default so the screen stays focused
// on the PDF; tap to open it. Shown tidied up, one tab per page, with copy
// buttons and an honest note that OCR can be wrong.
export function TextViewer({ pages }: TextViewerProps) {
  const showToast = useToast()
  const panelId = useId()
  const [isOpen, setIsOpen] = useState(false)
  const [selected, setSelected] = useState(0)
  // Which button just copied ("page" or "all"), to show a tick for a moment.
  const [justCopied, setJustCopied] = useState<'page' | 'all' | null>(null)

  // Tidy every page once (not on every re-render).
  const tidyPages = useMemo(
    () => pages.map((page) => ({ number: page.number, paragraphs: tidyOcrText(page.text) })),
    [pages],
  )
  const totalWords = tidyPages.reduce((sum, page) => sum + countWords(page.paragraphs), 0)
  const page = tidyPages[Math.min(selected, tidyPages.length - 1)]

  async function handleCopy(which: 'page' | 'all') {
    const text =
      which === 'page'
        ? paragraphsToText(page.paragraphs)
        : tidyPages.map((p) => `Page ${p.number}\n\n${paragraphsToText(p.paragraphs)}`).join('\n\n\n')
    if (await copyText(text)) {
      setJustCopied(which)
      setTimeout(() => setJustCopied(null), 1800)
    } else {
      showToast('Copying is not allowed here. Select the text and copy it by hand.', { kind: 'error' })
    }
  }

  const pageWord = tidyPages.length === 1 ? 'page' : 'pages'

  return (
    <div className="overflow-hidden rounded-3xl border border-gray-700/60 bg-gray-800/40 shadow-sm backdrop-blur-sm">
      {/* The always-visible row; tapping it opens or closes the text. */}
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-gray-700/30 focus-visible:bg-gray-700/30 focus-visible:outline-none"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400">
          <ScanText className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-gray-200">Recognised text</span>
          <span className="block text-sm text-gray-500">
            {totalWords > 0 ? `${totalWords} words on ${tidyPages.length} ${pageWord}` : 'No text was found'}
          </span>
        </span>
        <span className="flex items-center gap-1 text-sm font-semibold text-teal-400">
          {isOpen ? 'Hide' : 'Show'}
          <ChevronDown className={`size-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {isOpen && (
        <div id={panelId} className="animate-fade-in-up border-t border-gray-700/40">
          {tidyPages.length > 1 && (
            <div className="flex items-center justify-between gap-2 border-b border-gray-700/40 px-3 py-2">
              <div role="tablist" aria-label="Pages" className="flex gap-1.5 overflow-x-auto">
                {tidyPages.map((p, index) => (
                  <button
                    key={p.number}
                    type="button"
                    role="tab"
                    aria-selected={index === selected}
                    onClick={() => setSelected(index)}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                      index === selected ? 'bg-teal-500 text-gray-950' : 'text-gray-400 hover:bg-gray-700/60'
                    }`}
                  >
                    Page {p.number}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => void handleCopy('all')} className={`${buttonClass('ghost', 'sm')} shrink-0`}>
                {justCopied === 'all' ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
                {justCopied === 'all' ? 'Copied' : 'Copy all'}
              </button>
            </div>
          )}

          {/* The text, laid out like a document: paragraphs with normal spacing. */}
          <div className="bg-gray-900/40 p-3 sm:p-4">
            {page.paragraphs.length > 0 ? (
              <article className="flex max-h-96 flex-col gap-3 overflow-auto rounded-2xl bg-gray-800/60 px-4 py-4 text-[15px] leading-6 text-gray-300 shadow-sm ring-1 ring-gray-700/50 sm:px-6 sm:py-5">
                {page.paragraphs.map((paragraph, index) => (
                  <p key={index}>
                    {paragraph.map((line, lineIndex) => (
                      <span key={lineIndex} className="block">
                        {line}
                      </span>
                    ))}
                  </p>
                ))}
              </article>
            ) : (
              <p className="rounded-2xl bg-gray-800/60 px-4 py-8 text-center text-sm text-gray-500 ring-1 ring-gray-700/50">
                No text was found on this page. If it does contain text, try a sharper photo or the Black & white look.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-gray-700/40 px-4 py-2.5">
            <p className="flex items-center gap-1.5 text-xs text-gray-500">
              <Info className="size-3.5 shrink-0" />
              OCR can make mistakes. Check names, numbers and dates.
            </p>
            {page.paragraphs.length > 0 && (
              <button type="button" onClick={() => void handleCopy('page')} className={`${buttonClass('secondary', 'sm')} shrink-0`}>
                {justCopied === 'page' ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
                {justCopied === 'page' ? 'Copied' : 'Copy'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
