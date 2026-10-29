// Tidies Tesseract's raw text for reading on screen and copying.
//
// Tesseract separates every block it finds with an empty line and keeps odd
// spacing, so raw output looks gappy. This only changes how text is shown:
// the original text saved in the database (used for search and in the PDF)
// is not modified.

// A paragraph is a list of lines that belong together.
export type Paragraph = string[]

export function tidyOcrText(text: string): Paragraph[] {
  return text
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/) // one or more empty lines = a new paragraph
    .map((block) =>
      block
        .split('\n')
        .map((line) => line.replace(/\s+/g, ' ').trim()) // collapse extra spaces
        // Drop lines with no letters or digits, e.g. a stray "|" or "—".
        .filter((line) => /[\p{L}\p{N}]/u.test(line)),
    )
    .filter((paragraph) => paragraph.length > 0)
}

// The tidied text as plain text: lines joined, one empty line between paragraphs.
export function paragraphsToText(paragraphs: Paragraph[]): string {
  return paragraphs.map((paragraph) => paragraph.join('\n')).join('\n\n')
}

export function countWords(paragraphs: Paragraph[]): number {
  return paragraphs.flat().join(' ').split(' ').filter(Boolean).length
}
