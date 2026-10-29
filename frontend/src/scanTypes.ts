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
