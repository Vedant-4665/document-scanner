"""Settings for the backend, kept in one place so they are easy to find."""

from pathlib import Path

# backend/ folder (this file lives in backend/scanner/).
BACKEND_DIR = Path(__file__).resolve().parent.parent

# All uploaded images, processed pages, PDFs and the SQLite database live
# under backend/data/. That folder is ignored by git.
DATA_DIR = BACKEND_DIR / "data"
UPLOAD_DIR = DATA_DIR / "uploads"
# Cropped and enhanced pages made from the uploads.
PROCESSED_DIR = DATA_DIR / "processed"
OUTPUT_DIR = DATA_DIR / "outputs"
DATABASE_PATH = DATA_DIR / "scanner.db"

# Biggest single request Flask will accept. Phone photos are usually 2-8 MB,
# so 15 MB leaves headroom without letting someone fill the disk.
MAX_UPLOAD_MB = 15

# Only these image types are accepted. Later milestones check the file's
# real contents too, not just its name.
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}


def ensure_data_dirs() -> None:
    """Create the data folders if they do not exist yet."""
    for folder in (DATA_DIR, UPLOAD_DIR, PROCESSED_DIR, OUTPUT_DIR):
        folder.mkdir(parents=True, exist_ok=True)

# Largest image (width x height) we will decode. A tiny file can claim to be
# enormous and use up all memory when opened ("decompression bomb").
# 50 million pixels covers normal phone cameras (12-48 MP).
MAX_IMAGE_PIXELS = 50_000_000

# Smaller than this is too blurry to scan text from.
MIN_IMAGE_SIDE = 200

# --- OCR (Milestone 5) ---

# Languages Tesseract may read. The first ("eng", English) is always used.
# The others ("hin" Hindi, "guj" Gujarati) are added per page, only when that
# page contains their script (see ocr.choose_languages), and only if their
# language data is installed (`brew install tesseract-lang` installs them all).
OCR_LANGUAGES = ["eng", "hin", "guj"]
# Give up on one page after this many seconds instead of hanging forever.
OCR_TIMEOUT_SECONDS = 120
# Most pages one scan may have. Every page takes a few seconds of OCR.
MAX_PAGES_PER_SCAN = 30

# --- History (Milestone 6) ---

# Photos and pages not used by any saved scan are deleted at server start
# once they are older than this (left over from cancelled pages or closed tabs).
ABANDONED_FILE_HOURS = 24
