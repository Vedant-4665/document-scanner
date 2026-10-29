"""Text recognition (OCR) with Tesseract, and building one searchable PDF page.

Tesseract is a separate program installed on the computer (see README).
pytesseract only runs it for us.

A searchable PDF page has two layers stacked on top of each other:
  1. the picture: the page exactly as the user chose it (Color or Black & white)
  2. an invisible text layer from Tesseract, placed exactly over the words,
     so you can search, select and copy text in any PDF viewer.

For each page:
  1. Prepare an OCR copy from the colour version of the page
     (document_cv.prepare_for_ocr: grayscale, even lighting, enlarged if small).
  2. Choose the languages: a quick read of a small preview shows which
     scripts are on the page (e.g. Devanagari for Hindi, Gujarati), and only
     those languages are used, always with English. Reading every language
     at once made Tesseract mix scripts, e.g. Gujarati letters inside Hindi
     words, and invent text from logos and photos.
  3. One Tesseract run writes the invisible text layer and a table of every
     word it found with a confidence score (0-100). The page text is rebuilt
     from that table, leaving out lines in which Tesseract wasn't fairly sure
     of a single word: those are almost always "text" it imagined in a logo,
     barcode or photo.

OCR is a best guess. Blurry photos, handwriting, unusual fonts and languages
whose data isn't installed give poor or empty results.
"""

import csv
import re
import tempfile
from io import BytesIO
from pathlib import Path

import cv2
import numpy as np
import pytesseract
from PIL import Image
from pypdf import PageObject, PdfReader

from . import config, document_cv

# PDF page size comes from the image's pixels and its DPI (dots per inch).
# We pick a DPI so each page fits on A4 paper (8.27 x 11.69 inches).
A4_SHORT_INCHES = 8.27
A4_LONG_INCHES = 11.69

# The resolution we tell Tesseract the OCR copy has. 300 DPI is a normal
# scanner setting and gave the most reliable results in tests. It doesn't
# affect where the text sits in the PDF: that is matched to the picture below.
OCR_DPI = 300

# The Unicode letters each extra language writes with, used to spot which
# languages a page contains. A language in OCR_LANGUAGES that is not listed
# here is never chosen automatically.
SCRIPT_OF_LANGUAGE = {
    "hin": r"[ऀ-ॿ]",  # Devanagari (Hindi)
    "guj": r"[઀-૿]",  # Gujarati
}
# The language check reads a preview this wide: quick, and in tests on real
# pages wider previews were more easily fooled by logos and photos.
PREVIEW_WIDTH = 1000
# A language is used when its script:
#   - makes up at least MIN_SCRIPT_SHARE of all letters and digits on the page,
#   - has at least MIN_SCRIPT_LETTERS letters, and
#   - has at least MIN_SHARE_OF_MAIN_SCRIPT as many letters as the page's most
#     common non-English script (so a few stray Hindi-looking letters on a
#     Gujarati page don't add Hindi).
# Measured on real pages: Hindi on bank statements 19-25% of letters,
# Gujarati on a Gujarati page 79%, a two-word Hindi label 39%; stray letters
# "seen" in logos and photos 0-8%.
MIN_SCRIPT_SHARE = 0.10
MIN_SCRIPT_LETTERS = 3
MIN_SHARE_OF_MAIN_SCRIPT = 0.20

# A line is kept only if at least one of its words has this confidence.
# On real pages, junk lines from logos, barcodes and photos had no word this
# confident, while real lines did, even messy table rows whose average
# confidence was low because of a few misread words.
MIN_BEST_WORD_CONFIDENCE = 60


def choose_languages(ocr_image: np.ndarray) -> str:
    """Return the Tesseract languages to read this page with, e.g. "eng+hin"."""
    main = config.OCR_LANGUAGES[0]
    installed = set(pytesseract.get_languages())
    extras = [language for language in config.OCR_LANGUAGES[1:] if language in installed]
    if main not in installed or not extras:
        return main  # if even the main language is missing, Tesseract will say so

    # Quick read of a small preview with every language, then count each script's letters.
    factor = min(1.0, PREVIEW_WIDTH / ocr_image.shape[1])
    preview = cv2.resize(ocr_image, None, fx=factor, fy=factor, interpolation=cv2.INTER_AREA)
    text = pytesseract.image_to_string(
        preview, lang="+".join([main, *extras]), config=f"--dpi {OCR_DPI}", timeout=config.OCR_TIMEOUT_SECONDS
    )
    all_letters = sum(1 for character in text if character.isalnum())
    letters = {
        language: len(re.findall(SCRIPT_OF_LANGUAGE[language], text)) if language in SCRIPT_OF_LANGUAGE else 0
        for language in extras
    }
    most = max(letters.values())
    chosen = [
        language
        for language, count in letters.items()
        if count >= MIN_SCRIPT_LETTERS
        and count >= MIN_SCRIPT_SHARE * all_letters
        and count >= MIN_SHARE_OF_MAIN_SCRIPT * most
    ]
    return "+".join([main, *chosen])


def make_searchable_page(picture_path: Path, ocr_source_path: Path) -> tuple[PageObject, str]:
    """Return (one searchable PDF page, recognised text).

    picture_path: the page as the user chose it; this is what the PDF shows.
    ocr_source_path: the colour version of the same page, which Tesseract reads.

    Raises pytesseract.TesseractNotFoundError if Tesseract is not installed,
    pytesseract.TesseractError if it fails, and RuntimeError on timeout.
    """
    # The picture layer: the page as the user chose it, sized to fit A4.
    picture_pdf = BytesIO()
    with Image.open(picture_path) as picture:
        dpi = _a4_dpi(picture.width, picture.height)
        picture.save(picture_pdf, "PDF", resolution=dpi)
    pdf_page = PdfReader(picture_pdf).pages[0]

    ocr_image = document_cv.prepare_for_ocr(cv2.imread(str(ocr_source_path), cv2.IMREAD_UNCHANGED))
    languages = choose_languages(ocr_image)

    with tempfile.TemporaryDirectory() as temp_dir:
        ocr_path = str(Path(temp_dir) / "ocr.png")
        output_base = str(Path(temp_dir) / "result")
        cv2.imwrite(ocr_path, ocr_image)
        # One Tesseract run writes result.pdf (a page holding only the invisible
        # text, because of textonly_pdf=1) and result.tsv (the table of words).
        pytesseract.pytesseract.run_tesseract(
            ocr_path,
            output_base,
            extension="pdf",
            lang=languages,
            # tessedit_create_tsv=1 also writes the word table (pytesseract
            # ignores "tsv" in `extension`, so it is switched on here instead).
            config=f"--dpi {OCR_DPI} -c textonly_pdf=1 -c tessedit_create_tsv=1",
            timeout=config.OCR_TIMEOUT_SECONDS,
        )
        text = _text_from_word_table(Path(f"{output_base}.tsv").read_text(encoding="utf-8"))
        text_layer_pdf = Path(f"{output_base}.pdf").read_bytes()

    # Stack the invisible text on top of the picture. The OCR copy may be
    # enlarged, so the text layer is stretched to exactly the picture's size.
    text_page = PdfReader(BytesIO(text_layer_pdf)).pages[0]
    text_page.scale_to(float(pdf_page.mediabox.width), float(pdf_page.mediabox.height))
    pdf_page.merge_page(text_page)
    return pdf_page, text


def _text_from_word_table(tsv: str) -> str:
    """Rebuild the page text from Tesseract's word table, leaving out junk lines.

    Each row is one word with its block, paragraph and line number and a
    confidence score. Words are joined into lines, lines into paragraphs
    (separated by an empty line), in the order Tesseract read them.
    """
    lines: dict[tuple[int, int, int], list[tuple[str, float]]] = {}
    for row in csv.DictReader(tsv.splitlines(), delimiter="\t", quoting=csv.QUOTE_NONE):
        word = (row.get("text") or "").strip()
        if word:
            key = (int(row["block_num"]), int(row["par_num"]), int(row["line_num"]))
            lines.setdefault(key, []).append((word, float(row["conf"])))

    paragraphs: dict[tuple[int, int], list[str]] = {}
    for (block, paragraph, _line), words in lines.items():
        if max(conf for _, conf in words) >= MIN_BEST_WORD_CONFIDENCE:
            paragraphs.setdefault((block, paragraph), []).append(" ".join(word for word, _ in words))
    return "\n\n".join("\n".join(paragraph_lines) for paragraph_lines in paragraphs.values())


def _a4_dpi(width: int, height: int) -> int:
    """The DPI that makes this image fit an A4 page."""
    short_side, long_side = sorted((width, height))
    return max(72, round(max(short_side / A4_SHORT_INCHES, long_side / A4_LONG_INCHES)))
