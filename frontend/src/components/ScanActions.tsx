import { Download, ExternalLink } from 'lucide-react'
import { pdfDownloadUrl } from '../api/client'
import { buttonClass } from './ui/buttons'

// "Download PDF" and "Open PDF" buttons for a saved scan.
export function ScanActions({ scan }: { scan: { pdf_url: string; title: string } }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:flex">
      <a href={pdfDownloadUrl(scan)} download={`${scan.title}.pdf`} className={buttonClass('primary', 'lg')}>
        <Download className="size-5" /> Download PDF
      </a>
      <a href={scan.pdf_url} target="_blank" rel="noreferrer" className={buttonClass('secondary', 'lg')}>
        <ExternalLink className="size-5" /> Open PDF
      </a>
    </div>
  )
}
