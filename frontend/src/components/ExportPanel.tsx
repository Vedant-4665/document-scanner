import { AlignLeft, Download, ExternalLink, FileText, FileType, Images, Info, type LucideIcon } from 'lucide-react'
import type { ExportOption, ScanDetail } from '../api/client'

const LOOKS: Record<ExportOption['format'], { icon: LucideIcon; bg: string; text: string }> = {
  pdf:    { icon: FileText,  bg: 'bg-red-100',    text: 'text-red-700' },
  docx:   { icon: FileType,  bg: 'bg-blue-100',   text: 'text-blue-700' },
  txt:    { icon: AlignLeft, bg: 'bg-[#f0ebe3]',  text: 'text-[#2e2118]' },
  images: { icon: Images,    bg: 'bg-green-100',  text: 'text-green-700' },
}

export function ExportPanel({ scan }: { scan: ScanDetail }) {
  return (
    <section className="flex flex-col gap-3" aria-label="Download">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#2e2118]">Download as</p>
        <a
          href={scan.pdf_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 transition-colors hover:text-amber-600 hover:underline"
        >
          <ExternalLink className="size-3.5" /> Open PDF
        </a>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {scan.exports.map((option) => {
          const { icon: Icon, bg, text } = LOOKS[option.format]
          return (
            <a
              key={option.format}
              href={option.url}
              download
              className={`group flex items-center gap-3 rounded-2xl border bg-white p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-amber-900/8 active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none ${
                option.recommended
                  ? 'border-amber-300 shadow-sm shadow-amber-900/8'
                  : 'border-[#e2d9cc] hover:border-[#c9bfb2]'
              }`}
            >
              <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${bg} ${text}`}>
                <Icon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-semibold text-[#1c1814]">{option.label}</span>
                  <span className="rounded-md border border-[#d4c9bb] bg-[#f8f4ee] px-1.5 py-0.5 text-[10px] font-semibold text-[#2e2118]">
                    {option.file_type}
                  </span>
                  {option.recommended && (
                    <span className="rounded-md bg-amber-700 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      Recommended
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-[#2e2118]">{option.description}</span>
              </span>
              <Download className="size-4 shrink-0 text-[#555047] transition-colors group-hover:text-amber-700" />
            </a>
          )
        })}
      </div>

      {scan.export_notes.map((note) => (
        <p key={note} className="flex items-start gap-1.5 text-xs text-[#2e2118]">
          <Info className="mt-0.5 size-3.5 shrink-0 text-[#555047]" /> {note}
        </p>
      ))}
    </section>
  )
}
