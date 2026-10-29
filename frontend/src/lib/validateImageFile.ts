import { ACCEPTED_IMAGE_TYPES, MAX_UPLOAD_MB } from '../config'

// Checks a chosen file before uploading it.
// Returns an error message to show the user, or null if the file looks fine.
export function validateImageFile(file: File): string | null {
  const name = file.name.toLowerCase()

  // iPhones save photos as HEIC by default, which browsers and our backend
  // can't process. Most iPhones convert to JPEG on upload, but not always.
  if (file.type === 'image/heic' || file.type === 'image/heif' || /\.hei[cf]$/.test(name)) {
    return 'HEIC photos are not supported. On iPhone, go to Settings → Camera → Formats and choose "Most Compatible", or save the photo as JPG.'
  }

  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return 'Unsupported file type. Please choose a JPG, PNG or WebP image.'
  }

  if (file.size === 0) {
    return 'The file is empty.'
  }

  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1)
    return `This file is ${sizeMb} MB. The limit is ${MAX_UPLOAD_MB} MB.`
  }

  return null
}
