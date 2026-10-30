import type {
  Corners,
  DetectionResult,
  Enhancement,
  ProcessedImage,
  Rotation,
  UploadedImage,
} from './api/client'

// Everything about one page while it is being set up (corners, look, rotation).
export type PageDraft = {
  image: UploadedImage // the original photo, always kept on the server
  detection: DetectionResult
  detectionError: string | null
  corners: Corners
  enhancement: Enhancement
  rotation: Rotation
}

// A finished page in the document: the draft plus the processed result.
export type Page = PageDraft & {
  processed: ProcessedImage
}

// A photo that is being uploaded and checked for page edges right now.
export type Analysis = {
  previewUrl: string // a temporary browser-only URL, so the photo shows instantly
  stage: 'uploading' | 'detecting'
}
