import { Check, ChevronDown, Copy, Info, ScanText } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { copyText } from '../lib/copyText'
import { countWords, paragraphsToText, tidyOcrText } from '../lib/tidyText'
import { useToast } from './ui/Toast'
import { buttonClass } from './ui/buttons'

type TextViewerProps = {
  pages: { number: number; text: string }[]
}

export function TextViewer({ pages }: TextViewerProps) {
  const showToast = useToast()
  const panelId = useId()
  const [isOpen, setIsOpen] = useState(false)
  const [selected, setSelected] = useState(0)
  const [justCopied, setJustCopied] = useState<'page' | 'all' | null>(null)

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
    <div className="overflow-hidden rounded-2xl border border-[#e2d9cc] bg-white shadow-sm">
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors duration-150 hover:bg-[#faf8f4] focus-visible:bg-[#faf8f4] focus-visible:outline-none"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
          <ScanText className="size-[18px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-[#1c1814]">Recognised text</span>
          <span className="block text-xs text-[#2e2118]">
            {totalWords > 0 ? `${totalWords} words on ${tidyPages.length} ${pageWord}` : 'No text was found'}
          </span>
        </span>
        <span className="flex items-center gap-1 text-xs font-semibold text-amber-700">
          {isOpen ? 'Hide' : 'Show'}
          <ChevronDown className={`size-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {isOpen && (
        <div id={panelId} className="animate-fade-in-up border-t border-[#e2d9cc]">
          {/* Multi-page tabs */}
          {tidyPages.length > 1 && (
            <div className="flex items-center justify-between gap-2 border-b border-[#e2d9cc] bg-[#faf8f4] px-3 py-2">
              <div role="tablist" aria-label="Pages" className="flex gap-1 overflow-x-auto">
                {tidyPages.map((p, index) => (
                  <button
                    key={p.number}
                    type="button"
                    role="tab"
                    aria-selected={index === selected}
                    onClick={() => setSelected(index)}
                    className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-150 ${
                      index === selected
                        ? 'bg-amber-700 text-white'
                        : 'text-[#2e2118] hover:bg-[#f0ebe3] hover:text-[#1c1814]'
                    }`}
                  >
                    Page {p.number}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => void handleCopy('all')} className={`${buttonClass('secondary', 'sm')} shrink-0 text-xs`}>
                {justCopied === 'all' ? <Check className="size-3.5 text-green-700" /> : <Copy className="size-3.5" />}
                {justCopied === 'all' ? 'Copied' : 'Copy all'}
              </button>
            </div>
          )}

          {/* Text area */}
          <div className="bg-[#faf8f4] p-3 sm:p-4">
            {page.paragraphs.length > 0 ? (
              <article className="flex max-h-96 flex-col gap-3 overflow-auto rounded-xl border border-[#e2d9cc] bg-white px-4 py-4 text-[15px] leading-7 text-[#1c1814] shadow-inner sm:px-5 sm:py-5">
                {page.paragraphs.map((paragraph, index) => (
                  <p key={index} className="text-[#1c1814]">
                    {paragraph.map((line, lineIndex) => (
                      <span key={lineIndex} className="block">{line}</span>
                    ))}
                  </p>
                ))}
              </article>
            ) : (
              <p className="rounded-xl border border-[#e2d9cc] bg-white px-4 py-8 text-center text-sm text-[#2e2118]">
                No text was found on this page. If it does contain text, try a sharper photo or the Black &amp; white look.
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-2 border-t border-[#e2d9cc] bg-[#faf8f4] px-4 py-2.5">
            <p className="flex items-center gap-1.5 text-xs text-[#2e2118]">
              <Info className="size-3.5 shrink-0 text-[#555047]" />
              OCR can make mistakes. Check names, numbers and dates.
            </p>
            {page.paragraphs.length > 0 && (
              <button type="button" onClick={() => void handleCopy('page')} className={`${buttonClass('secondary', 'sm')} shrink-0 text-xs`}>
                {justCopied === 'page' ? <Check className="size-3.5 text-green-700" /> : <Copy className="size-3.5" />}
                {justCopied === 'page' ? 'Copied' : 'Copy'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
