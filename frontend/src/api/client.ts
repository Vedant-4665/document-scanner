// All calls to the Flask backend go through this file, so the URL prefix and
// error handling live in one place.

// Shape of the JSON returned by GET /api/health.
export type HealthResponse = {
  status: 'ok'
  opencv_version: string | null
  tesseract_version: string | null
  max_upload_mb: number
}

// Shape of the JSON returned by POST /api/uploads.
export type UploadedImage = {
  id: string
  filename: string
  image_url: string
  width: number
  height: number
}

// A position in the uploaded image, in its own pixels.
export type Point = { x: number; y: number }
// Always in the order top-left, top-right, bottom-right, bottom-left.
export type Corners = [Point, Point, Point, Point]

export type DetectionResult = {
  corners: Corners
  found: boolean // false = automatic detection gave up; corners are the whole image
}

export type Enhancement = 'original' | 'black_white'
export type Rotation = 0 | 90 | 180 | 270 // degrees clockwise

export type ProcessedImage = {
  filename: string
  image_url: string
  width: number
  height: number
}

// Every backend error response looks like { "error": "Readable message" }.
type ErrorResponse = { error?: string }

export async function getHealth(): Promise<HealthResponse> {
  const response = await send('/api/health')
  return (await response.json()) as HealthResponse
}

export async function uploadImage(file: File): Promise<UploadedImage> {
  // FormData sends the file the same way a classic HTML <form> would.
  const form = new FormData()
  form.append('image', file)
  const response = await send('/api/uploads', { method: 'POST', body: form })
  return (await response.json()) as UploadedImage
}

export async function detectCorners(filename: string): Promise<DetectionResult> {
  const response = await send('/api/process/detect', postJson({ filename }))
  const body = (await response.json()) as { corners: [number, number][]; found: boolean }
  // The backend uses [x, y] pairs; the frontend uses {x, y} objects.
  const corners = body.corners.map(([x, y]) => ({ x, y })) as Corners
  return { corners, found: body.found }
}

export async function processImage(settings: {
  filename: string
  corners: Corners
  enhancement: Enhancement
  rotation: Rotation
}): Promise<ProcessedImage> {
  const response = await send(
    '/api/process/apply',
    postJson({
      ...settings,
      corners: settings.corners.map(({ x, y }) => [x, y]),
    }),
  )
  return (await response.json()) as ProcessedImage
}

function postJson(data: unknown): RequestInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }
}

// A saved scan, as listed in history.
export type ScanSummary = {
  id: string
  title: string
  created_at: string // ISO date and time, UTC
  page_count: number
  pdf_url: string // shows the PDF; add ?download=1 to save it
  thumbnail_url: string | null
  snippet: string | null // text around the search match, when searching
}

// A saved scan with all its pages (POST /api/scans and GET /api/scans/<id>).
export type ScanDetail = Omit<ScanSummary, 'thumbnail_url' | 'snippet'> & {
  pages: { number: number; image_url: string; original_url: string; text: string }[]
}

// OCR every page, build one searchable PDF and save it in history.
// Slow: a few seconds per page.
export async function createScan(title: string, pageFilenames: string[]): Promise<ScanDetail> {
  const response = await send('/api/scans', postJson({ title, pages: pageFilenames }))
  return (await response.json()) as ScanDetail
}

export async function listScans(search: string): Promise<ScanSummary[]> {
  const response = await send(`/api/scans?q=${encodeURIComponent(search)}`)
  return ((await response.json()) as { scans: ScanSummary[] }).scans
}

export async function getScan(id: string): Promise<ScanDetail> {
  const response = await send(`/api/scans/${id}`)
  return (await response.json()) as ScanDetail
}

export async function deleteScan(id: string): Promise<void> {
  await send(`/api/scans/${id}`, { method: 'DELETE' })
}

// "Download PDF" link: the server then names the file after the scan title.
export function pdfDownloadUrl(scan: { pdf_url: string }): string {
  return `${scan.pdf_url}?download=1`
}

// Makes the request and turns every kind of failure into an Error whose
// message can be shown to the user as-is.
async function send(url: string, options?: RequestInit): Promise<Response> {
  let response: Response
  try {
    response = await fetch(url, options)
  } catch {
    // fetch() itself only throws when the network request could not be made.
    throw new Error('Could not reach the server. Check your connection and that the dev server is running.')
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ErrorResponse
    if (body.error) throw new Error(body.error)
    // No JSON message: usually the Vite proxy saying Flask is not running.
    throw new Error(
      `The backend is not responding (HTTP ${response.status}). Is Flask running on port 5001?`,
    )
  }

  return response
}
