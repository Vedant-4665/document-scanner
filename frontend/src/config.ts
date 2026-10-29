// Frontend settings. Keep these in step with backend/scanner/config.py.
// The backend always checks again, so these only give faster, friendlier errors.

export const MAX_UPLOAD_MB = 15

// File types the backend accepts, as browser "MIME types".
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
