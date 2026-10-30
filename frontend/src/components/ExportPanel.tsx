import { AlignLeft, Download, ExternalLink, FileText, FileType, Images, Info, type LucideIcon } from 'lucide-react'
import type { ExportOption, ScanDetail } from '../api/client'

// Icon and colours for each format's card.
const LOOKS: Record<ExportOption['format'], { icon: LucideIcon; tile: string }> = {
  pdf: { icon: FileText, tile: 'bg-red-500/10 text-red-400' },
  docx: { icon: FileType, tile: 'bg-blue-500/10 text-blue-400' },
  txt: { icon: AlignLeft, tile: 'bg-gray-700/60 text-gray-300' },
  images: { icon: Images, tile: 'bg-emerald-500/10 text-emerald-400' },
}

// "Download as…" cards. The backend decides which formats suit this scan
// (for example, Word and Text only when text was found), so this just shows
// what it offers, with the recommended one first.
export function ExportPanel({ scan }: { scan: ScanDetail }) {
  return (
    <section className="flex flex-col gap-3" aria-label="Download">
      <div className="flex items-end justify-between gap-2">
        <h3 className="font-semibold text-gray-200">Download as</h3>
        <a
          href={scan.pdf_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-400 hover:text-teal-300 hover:underline"
        >
          <ExternalLink className="size-4" /> Open PDF
        </a>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {scan.exports.map((option) => {
          const { icon: Icon, tile } = LOOKS[option.format]
          return (
            <a
              key={option.format}
              href={option.url}
              download
              className={`group flex items-center gap-3 rounded-2xl border bg-gray-800/40 p-3 shadow-sm backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-teal-500/5 active:scale-[0.99] focus-visible:ring-4 focus-visible:ring-teal-500/30 focus-visible:outline-none ${
                option.recommended ? 'border-teal-500/30 ring-1 ring-teal-500/20' : 'border-gray-700/60'
              }`}
            >
              <span className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${tile}`}>
                <Icon className="size-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="font-semibold text-gray-200">{option.label}</span>
                  <span className="rounded-md bg-gray-700/60 px-1.5 py-0.5 text-[11px] font-semibold text-gray-400">
                    {option.file_type}
                  </span>
                  {option.recommended && (
                    <span className="rounded-md bg-teal-500 px-1.5 py-0.5 text-[11px] font-semibold text-gray-950">
                      Recommended
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-xs leading-snug text-gray-500">{option.description}</span>
              </span>
              <Download className="size-5 shrink-0 text-gray-500 transition group-hover:text-teal-400" />
            </a>
          )
        })}
      </div>

      {scan.export_notes.map((note) => (
        <p key={note} className="flex items-start gap-1.5 text-xs text-gray-500">
          <Info className="mt-0.5 size-3.5 shrink-0" /> {note}
        </p>
      ))}
    </section>
  )
}
