import { AlignLeft, Download, ExternalLink, FileText, FileType, Images, Info, type LucideIcon } from 'lucide-react'
import type { ExportOption, ScanDetail } from '../api/client'

// Icon and colours for each format's card.
const LOOKS: Record<ExportOption['format'], { icon: LucideIcon; tile: string }> = {
  pdf: { icon: FileText, tile: 'bg-red-50 text-red-600' },
  docx: { icon: FileType, tile: 'bg-blue-50 text-blue-600' },
  txt: { icon: AlignLeft, tile: 'bg-slate-100 text-slate-600' },
  images: { icon: Images, tile: 'bg-emerald-50 text-emerald-600' },
}

// "Download as…" cards. The backend decides which formats suit this scan
// (for example, Word and Text only when text was found), so this just shows
// what it offers, with the recommended one first.
export function ExportPanel({ scan }: { scan: ScanDetail }) {
  return (
    <section className="flex flex-col gap-3" aria-label="Download">
      <div className="flex items-end justify-between gap-2">
        <h3 className="font-semibold">Download as</h3>
        <a
          href={scan.pdf_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:underline"
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
              className={`group flex items-center gap-3 rounded-2xl border bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99] focus-visible:ring-4 focus-visible:ring-indigo-200 focus-visible:outline-none ${
                option.recommended ? 'border-indigo-300 ring-1 ring-indigo-200' : 'border-slate-200'
              }`}
            >
              <span className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${tile}`}>
                <Icon className="size-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="font-semibold text-slate-900">{option.label}</span>
                  <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">
                    {option.file_type}
                  </span>
                  {option.recommended && (
                    <span className="rounded-md bg-indigo-600 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                      Recommended
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-xs leading-snug text-slate-500">{option.description}</span>
              </span>
              <Download className="size-5 shrink-0 text-slate-400 transition group-hover:text-indigo-600" />
            </a>
          )
        })}
      </div>

      {scan.export_notes.map((note) => (
        <p key={note} className="flex items-start gap-1.5 text-xs text-slate-500">
          <Info className="mt-0.5 size-3.5 shrink-0" /> {note}
        </p>
      ))}
    </section>
  )
}
