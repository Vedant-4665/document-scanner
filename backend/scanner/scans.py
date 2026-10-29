"""API routes for saved scans: create (OCR + searchable PDF), list/search, view, download, delete.

Each page is made searchable in ocr.py; pypdf joins the pages into one file;
database.py stores the scan's details and text in SQLite.
"""

import re
import time
import uuid
from datetime import datetime, timezone

import pytesseract
from flask import Blueprint, abort, current_app, jsonify, request, send_file
from pypdf import PageObject, PdfWriter

from . import config, database
from .errors import read_json_body
from .ocr import make_searchable_page
from .processing import color_version_of, find_processed
from .uploads import find_upload

bp = Blueprint("scans", __name__, url_prefix="/api/scans")

SCAN_ID_PATTERN = re.compile(r"[0-9a-f]{32}")
MAX_TITLE_LENGTH = 100
MAX_SEARCH_LENGTH = 100
# Characters of text shown before and after a search match. Few before, so
# the match itself is visible in the two-line preview on a phone.
SNIPPET_BEFORE = 25
SNIPPET_AFTER = 80


@bp.post("")
def create_scan():
    """Body: {"title": "...", "pages": ["<processed filename>", ...]} in page order.

    Reads the text on every page, builds one searchable PDF and saves the scan
    in history. Returns 201 with the same JSON as GET /api/scans/<id>.
    This can take several seconds per page, because OCR is slow.
    """
    body = read_json_body()

    title = body.get("title")
    if not isinstance(title, str) or not title.strip():
        abort(400, description="Please give the scan a title.")
    title = title.strip()[:MAX_TITLE_LENGTH]

    page_names = body.get("pages")
    if not isinstance(page_names, list) or not page_names:
        abort(400, description="A scan needs at least one page.")
    if len(page_names) > config.MAX_PAGES_PER_SCAN:
        abort(400, description=f"A scan can have at most {config.MAX_PAGES_PER_SCAN} pages.")

    # Find each page's processed image and the original photo it came from.
    pages = []
    for number, name in enumerate(page_names, start=1):
        processed_path = find_processed(name)
        # Processed names start with the upload's id: "<upload id>-<settings>.jpg".
        original_path = _find_original(name.split("-")[0]) if processed_path else None
        if processed_path is None or original_path is None:
            abort(404, description=f"Page {number} was not found on the server. Please redo that page.")
        pages.append({"processed": processed_path, "original": original_path})

    # Make each page searchable, then join them, in order, into one PDF.
    pdf = PdfWriter()
    for number, page in enumerate(pages, start=1):
        pdf_page, text = _ocr_or_abort(page["processed"], color_version_of(page["processed"]), number)
        pdf.add_page(pdf_page)
        page["text"] = text.strip()

    scan_id = uuid.uuid4().hex
    pdf_path = config.OUTPUT_DIR / f"{scan_id}.pdf"
    with open(pdf_path, "wb") as pdf_file:
        pdf.write(pdf_file)

    database.add_scan(
        scan_id,
        title,
        created_at=datetime.now(timezone.utc).isoformat(timespec="seconds"),
        pdf_path=_relative(pdf_path),
        pages=[
            {
                "original_path": _relative(page["original"]),
                "processed_path": _relative(page["processed"]),
                "ocr_text": page["text"],
            }
            for page in pages
        ],
    )
    return jsonify(_scan_detail(scan_id)), 201


@bp.get("")
def list_scans():
    """Query: ?q=<search text> (optional). Returns {scans: [...]}, newest first."""
    search = request.args.get("q", "").strip()[:MAX_SEARCH_LENGTH]
    rows = database.list_scans(search)
    return jsonify(
        scans=[
            {
                **_scan_summary(row),
                "thumbnail_url": _file_url(row["first_page_path"]) if row["first_page_path"] else None,
                "snippet": _snippet(row["matching_text"], search) if search else None,
            }
            for row in rows
        ]
    )


@bp.get("/<scan_id>")
def get_scan(scan_id: str):
    return jsonify(_scan_detail(scan_id))


@bp.get("/<scan_id>/pdf")
def get_scan_pdf(scan_id: str):
    """Shows the PDF in the browser; ?download=1 saves it as "<title>.pdf" instead."""
    scan, _ = _get_or_404(scan_id)
    # Keep only safe characters for the file name the browser suggests.
    safe_title = re.sub(r"[^\w\- ]+", "", scan["title"]).strip() or "scan"
    return send_file(
        config.DATA_DIR / scan["pdf_path"],
        mimetype="application/pdf",
        as_attachment=request.args.get("download") == "1",
        download_name=f"{safe_title}.pdf",
    )


@bp.delete("/<scan_id>")
def delete_scan(scan_id: str):
    """Delete the scan from history, and its files unless another scan uses them."""
    if not SCAN_ID_PATTERN.fullmatch(scan_id):
        abort(404, description="Scan not found.")
    unused_paths = database.delete_scan(scan_id)
    if unused_paths is None:
        abort(404, description="Scan not found. It may have been deleted already.")
    for path in unused_paths:
        try:
            (config.DATA_DIR / path).unlink(missing_ok=True)
        except OSError:
            # The scan is gone from history either way; just note the leftover file.
            current_app.logger.exception("Could not delete file %s", path)
    return jsonify(deleted=True)


def remove_abandoned_files() -> None:
    """Delete photos and pages that never became part of a saved scan.

    Every photo you take and every look you try is saved as a file. Files that
    no saved scan uses and that are older than ABANDONED_FILE_HOURS are
    leftovers (cancelled pages, closed tabs). This runs when the server starts.
    """
    saved = database.all_saved_paths()
    cutoff = time.time() - config.ABANDONED_FILE_HOURS * 3600
    for folder in (config.UPLOAD_DIR, config.PROCESSED_DIR, config.OUTPUT_DIR):
        for path in folder.iterdir():
            if path.is_file() and _relative(path) not in saved and path.stat().st_mtime < cutoff:
                path.unlink(missing_ok=True)


# --- Helpers ---


def _get_or_404(scan_id: str):
    found = database.get_scan(scan_id) if SCAN_ID_PATTERN.fullmatch(scan_id) else None
    if found is None:
        abort(404, description="Scan not found. It may have been deleted.")
    return found


def _scan_summary(scan) -> dict:
    return {
        "id": scan["id"],
        "title": scan["title"],
        "created_at": scan["created_at"],
        "page_count": scan["page_count"],
        "pdf_url": f"/api/scans/{scan['id']}/pdf",
    }


def _scan_detail(scan_id: str) -> dict:
    scan, pages = _get_or_404(scan_id)
    return {
        **_scan_summary(scan),
        "pages": [
            {
                "number": page["page_number"],
                "image_url": _file_url(page["processed_path"]),
                "original_url": _file_url(page["original_path"]),
                "text": page["ocr_text"],
            }
            for page in pages
        ],
    }


def _file_url(relative_path: str) -> str:
    """"processed/x.jpg" -> "/api/processed/x.jpg"; "uploads/x.jpg" -> "/api/uploads/x.jpg"."""
    return f"/api/{relative_path}"


def _relative(path) -> str:
    """Path inside backend/data/, with forward slashes, as stored in the database."""
    return path.relative_to(config.DATA_DIR).as_posix()


def _find_original(upload_id: str):
    for extension in sorted(config.ALLOWED_EXTENSIONS):
        path = find_upload(f"{upload_id}.{extension}")
        if path:
            return path
    return None


def _snippet(text: str | None, search: str) -> str | None:
    """A short piece of text around the first match, for the search results."""
    if not text:
        return None
    position = text.lower().find(search.lower())
    if position == -1:
        return None
    start = max(position - SNIPPET_BEFORE, 0)
    end = min(position + len(search) + SNIPPET_AFTER, len(text))
    piece = " ".join(text[start:end].split())  # collapse line breaks and extra spaces
    return ("…" if start > 0 else "") + piece + ("…" if end < len(text) else "")


def _ocr_or_abort(picture_path, ocr_source_path, page_number: int) -> tuple[PageObject, str]:
    """Run OCR on one page, turning each kind of failure into a clear message."""
    try:
        return make_searchable_page(picture_path, ocr_source_path)
    except pytesseract.TesseractNotFoundError:
        abort(
            503,
            description="Tesseract is not installed on the server, so text can't be read. "
            "See 'Installing Tesseract' in the README.",
        )
    except RuntimeError:  # pytesseract raises this when the timeout is reached
        abort(
            504,
            description=f"Reading the text on page {page_number} took too long. "
            "Try a clearer photo or fewer pages.",
        )
    except pytesseract.TesseractError as error:
        current_app.logger.exception("Tesseract failed on page %s", page_number)
        if "Failed loading language" in str(error):
            abort(
                503,
                description=f"Tesseract's language data for '{config.OCR_LANGUAGES[0]}' is missing on the server.",
            )
        abort(500, description=f"Text recognition failed on page {page_number}.")
