"""Text recognition (OCR) with Tesseract, and building one searchable PDF page.

Tesseract is a separate program installed on the computer (see README).
pytesseract only runs it for us.

A searchable PDF page has two layers stacked on top of each other:
  1. the picture: the page exactly as the user chose it (Color or Black & white)
  2. an invisible text layer from Tesseract, placed exactly over the words,
     so you can search, select and copy text in any PDF viewer.

Tesseract reads the colour version of the page, prepared by
document_cv.prepare_for_ocr() (grayscale, even lighting, enlarged if small),
even when the user chose Black & white. Tests showed this reads far more
accurately than the black & white look.

OCR is a best guess. Blurry photos, handwriting, unusual fonts and languages
whose data isn't installed give poor or empty results.
"""

import tempfile
from io import BytesIO
from pathlib import Path

import cv2
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


def ocr_languages() -> str:
    """The languages to read, e.g. "eng+hin": those in OCR_LANGUAGES that are installed."""
    installed = set(pytesseract.get_languages())
    chosen = [language for language in config.OCR_LANGUAGES if language in installed]
    # If none are installed, ask for the first anyway so Tesseract reports it missing.
    return "+".join(chosen) or config.OCR_LANGUAGES[0]


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

    with tempfile.TemporaryDirectory() as temp_dir:
        ocr_path = str(Path(temp_dir) / "ocr.png")
        cv2.imwrite(ocr_path, ocr_image)
        languages = ocr_languages()
        options = f"--dpi {OCR_DPI}"
        text = pytesseract.image_to_string(
            ocr_path, lang=languages, config=options, timeout=config.OCR_TIMEOUT_SECONDS
        )
        # textonly_pdf=1: a PDF page holding only the invisible text, no picture.
        text_layer_pdf = pytesseract.image_to_pdf_or_hocr(
            ocr_path,
            extension="pdf",
            lang=languages,
            config=f"{options} -c textonly_pdf=1",
            timeout=config.OCR_TIMEOUT_SECONDS,
        )

    # Stack the invisible text on top of the picture. The OCR copy may be
    # enlarged, so the text layer is stretched to exactly the picture's size.
    text_page = PdfReader(BytesIO(text_layer_pdf)).pages[0]
    text_page.scale_to(float(pdf_page.mediabox.width), float(pdf_page.mediabox.height))
    pdf_page.merge_page(text_page)
    return pdf_page, text


def _a4_dpi(width: int, height: int) -> int:
    """The DPI that makes this image fit an A4 page."""
    short_side, long_side = sorted((width, height))
    return max(72, round(max(short_side / A4_SHORT_INCHES, long_side / A4_LONG_INCHES)))
