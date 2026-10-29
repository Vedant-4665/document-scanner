"""Download formats for a saved scan, and which ones suit it.

Every scan can be downloaded as a searchable PDF and as images. Formats made
from the recognised text (Word and plain text) are only offered when OCR
actually found text, because an empty document would be useless.

    PDF     always; the recommended format (shows the pages, text is searchable)
    Word    .docx: each scanned page as a picture, then its recognised text
            to edit (needs text)
    Text    .txt with the recognised text (needs text)
    Images  one page: the page as JPG (Color) or PNG (Black & white);
            several pages: a .zip with one image per page, in order

Files are built when they are downloaded; only the PDF is stored on disk.
"""

import re
import zipfile
from datetime import datetime
from io import BytesIO
from pathlib import Path

from docx import Document
from docx.shared import Inches
from PIL import Image

FORMATS = ("pdf", "docx", "txt", "images")


def available_exports(scan, pages, base_url: str) -> tuple[list[dict], list[str]]:
    """Return (the formats that suit this scan, notes explaining any left out).

    `scan` and `pages` are rows from database.get_scan(). Each format is a
    dict the frontend shows as a download card.
    """
    page_count = len(pages)
    has_text = any(tidy_paragraphs(page["ocr_text"]) for page in pages)
    image_types = sorted({Path(page["processed_path"]).suffix.lstrip(".").upper() for page in pages})

    exports = [
        {
            "format": "pdf",
            "label": "PDF",
            "file_type": "PDF",
            "description": "Best for sharing and printing. The text inside is searchable.",
            "recommended": True,
        }
    ]
    notes = []
    if has_text:
        exports.append(
            {
                "format": "docx",
                "label": "Word",
                "file_type": "DOCX",
                "description": "Each page as a picture, with its text below to edit in Word or Google Docs.",
                "recommended": False,
            }
        )
        exports.append(
            {
                "format": "txt",
                "label": "Text",
                "file_type": "TXT",
                "description": "Plain text that opens anywhere. Easy to copy and paste.",
                "recommended": False,
            }
        )
    else:
        notes.append("Word and Text aren't offered because no text was recognised on these pages.")

    exports.append(
        {
            "format": "images",
            "label": "Image" if page_count == 1 else "Images",
            "file_type": "/".join(image_types) if page_count == 1 else f"ZIP · {page_count} images",
            "description": "Send in chat apps or add to slides."
            if page_count == 1
            else "One image per page, numbered in order, in a single ZIP file.",
            "recommended": False,
        }
    )
    for export in exports:
        export["url"] = f"{base_url}/export/{export['format']}"
    return exports, notes


def build_export(fmt: str, scan, pages, data_dir: Path) -> tuple[BytesIO | Path, str, str]:
    """Make the file for one format. Returns (file or path, file name, MIME type)."""
    name = safe_file_name(scan["title"])
    if fmt == "pdf":
        return data_dir / scan["pdf_path"], f"{name}.pdf", "application/pdf"
    if fmt == "txt":
        # UTF-8 so Hindi and other scripts survive; Flask adds "charset=utf-8" itself.
        return BytesIO(_text_file(scan, pages).encode("utf-8")), f"{name}.txt", "text/plain"
    if fmt == "docx":
        return (
            _word_file(scan, pages, data_dir),
            f"{name}.docx",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )
    if fmt == "images":
        if len(pages) == 1:
            path = data_dir / pages[0]["processed_path"]
            mime = "image/png" if path.suffix == ".png" else "image/jpeg"
            return path, f"{name}{path.suffix}", mime
        return _images_zip(name, pages, data_dir), f"{name}.zip", "application/zip"
    raise ValueError(f"Unknown format: {fmt}")


def safe_file_name(title: str) -> str:
    """Keep only characters that are safe in a file name on every computer."""
    return re.sub(r"[^\w\- ]+", "", title).strip() or "scan"


def tidy_paragraphs(text: str) -> list[list[str]]:
    """Split OCR text into paragraphs of lines, without Tesseract's extra gaps.

    The same rules as the app's text viewer (frontend/src/lib/tidyText.ts):
    empty lines separate paragraphs, extra spaces are collapsed, and lines
    with no letters or digits (a stray "|" or "—") are dropped.
    """
    paragraphs = []
    for block in re.split(r"\n\s*\n", text.replace("\r\n", "\n").replace("\r", "\n")):
        lines = [" ".join(line.split()) for line in block.split("\n")]
        lines = [line for line in lines if any(ch.isalnum() for ch in line)]
        if lines:
            paragraphs.append(lines)
    return paragraphs


# --- Builders for each format ---


def _header_lines(scan) -> list[str]:
    created = datetime.fromisoformat(scan["created_at"]).astimezone().strftime("%d %b %Y, %H:%M")
    pages = scan["page_count"]
    return [
        scan["title"],
        f"Scanned {created} · {pages} {'page' if pages == 1 else 'pages'}",
        "Text recognised automatically (OCR). Check names, numbers and dates against the original.",
    ]


def _text_file(scan, pages) -> str:
    parts = ["\n".join(_header_lines(scan))]
    for page in pages:
        paragraphs = tidy_paragraphs(page["ocr_text"])
        body = "\n\n".join("\n".join(lines) for lines in paragraphs) or "(No text found on this page.)"
        parts.append(f"--- Page {page['page_number']} ---\n\n{body}")
    return "\n\n\n".join(parts) + "\n"


# Word page: A4 with 0.8-inch margins. The picture of each scanned page may
# use the full width, but at most this height, leaving room for its heading.
WORD_PAGE_WIDTH, WORD_PAGE_HEIGHT, WORD_MARGIN = 8.27, 11.69, 0.8
WORD_PICTURE_MAX_HEIGHT = 8.0


def _word_file(scan, pages, data_dir: Path) -> BytesIO:
    title, subtitle, warning = _header_lines(scan)
    document = Document()
    section = document.sections[0]
    section.page_width, section.page_height = Inches(WORD_PAGE_WIDTH), Inches(WORD_PAGE_HEIGHT)
    for side in ("left_margin", "right_margin", "top_margin", "bottom_margin"):
        setattr(section, side, Inches(WORD_MARGIN))
    usable_width = WORD_PAGE_WIDTH - 2 * WORD_MARGIN

    document.add_heading(title, level=0)
    document.add_paragraph(subtitle)

    for index, page in enumerate(pages):
        if index > 0:
            document.add_page_break()  # each scanned page starts a new Word page
        document.add_heading(f"Page {page['page_number']}", level=1)

        # The scanned page as a picture, as large as fits.
        picture_path = data_dir / page["processed_path"]
        with Image.open(picture_path) as picture:
            aspect = picture.width / picture.height
        document.add_picture(str(picture_path), width=Inches(min(usable_width, WORD_PICTURE_MAX_HEIGHT * aspect)))

        # Its recognised text, as normal editable paragraphs.
        document.add_heading("Text on this page", level=2)
        document.add_paragraph(warning).runs[0].italic = True
        paragraphs = tidy_paragraphs(page["ocr_text"])
        if not paragraphs:
            document.add_paragraph("(No text found on this page.)").runs[0].italic = True
        for lines in paragraphs:
            # Lines of one paragraph stay together, separated by line breaks.
            run = document.add_paragraph().add_run(lines[0])
            for line in lines[1:]:
                run.add_break()
                run.add_text(line)

    file = BytesIO()
    document.save(file)
    file.seek(0)
    return file


def _images_zip(name: str, pages, data_dir: Path) -> BytesIO:
    file = BytesIO()
    # ZIP_STORED: JPG and PNG are already compressed, so don't compress again.
    with zipfile.ZipFile(file, "w", zipfile.ZIP_STORED) as archive:
        for page in pages:
            path = data_dir / page["processed_path"]
            archive.write(path, arcname=f"{name} - page {page['page_number']:02d}{path.suffix}")
    file.seek(0)
    return file
