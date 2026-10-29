"""OpenCV steps that turn a photo of a page into a flat, clean scan.

The whole pipeline lives in this one file:

    detect_page_corners()  grayscale -> blur -> Canny edges -> contours ->
                           polygon approximation -> largest 4-corner shape
    order_corners()        top-left, top-right, bottom-right, bottom-left
    flatten_page()         getPerspectiveTransform + warpPerspective
    enhance()              "original" colour, or black & white (adaptive threshold)
    rotate()               quarter turns
    prepare_for_ocr()      grayscale -> even out lighting -> enlarge small pages

These functions only work with images (NumPy arrays in OpenCV's BGR colour
order). They know nothing about Flask or the web, so they can be tried on
their own in a Python shell.

Automatic detection is a best guess. It struggles when the page is a similar
colour to the table, is folded, or has a corner outside the photo. That is
why the app always lets the user check and drag the corners.
"""

import cv2
import numpy as np

# Detection runs on a smaller copy of the photo. It is faster, and small
# details such as paper texture or letters stop looking like page edges.
DETECTION_MAX_SIDE = 800

# A shape counts as "the page" only if it covers this share of the photo...
MIN_PAGE_AREA_RATIO = 0.2
# ...and not this much: a "page" covering the whole photo is usually just
# the photo's own border.
MAX_PAGE_AREA_RATIO = 0.98

# Corners the user sets must enclose at least this share of the photo.
MIN_MANUAL_AREA_RATIO = 0.01

ENHANCEMENTS = ("original", "black_white")

# Tesseract reads best when letters are roughly 25-35 pixels tall. Pages
# narrower than this are enlarged for OCR (phone screenshots are often
# ~1170 px wide, which makes their small print too tiny).
OCR_TARGET_WIDTH = 2400
# ...but never more than this; enlarging further made results worse in tests.
OCR_MAX_ENLARGE = 2.5
ROTATIONS = (0, 90, 180, 270)  # degrees clockwise

_ROTATE_CODES = {
    90: cv2.ROTATE_90_CLOCKWISE,
    180: cv2.ROTATE_180,
    270: cv2.ROTATE_90_COUNTERCLOCKWISE,
}


def detect_page_corners(image: np.ndarray) -> tuple[np.ndarray, bool]:
    """Find the four corners of the page in a photo.

    Returns (corners, found). `corners` is a 4x2 array of (x, y) pixel
    positions in the full-size image, in the order top-left, top-right,
    bottom-right, bottom-left. When no page outline is found, `found` is
    False and the corners are those of the whole photo, for the user to
    move by hand.
    """
    height, width = image.shape[:2]
    scale = min(1.0, DETECTION_MAX_SIDE / max(height, width))
    small = cv2.resize(image, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)

    # 1. Grayscale: edges are about brightness, so colour isn't needed.
    gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
    # 2. Gaussian blur: smooths away noise and fine texture.
    gray = cv2.GaussianBlur(gray, (5, 5), 0)
    # 3. Canny edge detection: marks pixels where brightness changes sharply.
    edges = cv2.Canny(gray, 50, 150)
    # Thicken the edge lines a little so small gaps in the page outline close up.
    edges = cv2.dilate(edges, np.ones((3, 3), np.uint8))

    # 4. Contours: trace the connected edge lines into outlines.
    contours, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)

    # 5. Check outlines from biggest to smallest; keep the first valid page shape.
    small_area = gray.shape[0] * gray.shape[1]
    for contour in sorted(contours, key=cv2.contourArea, reverse=True)[:10]:
        area = cv2.contourArea(contour)
        if area < MIN_PAGE_AREA_RATIO * small_area:
            break  # sorted biggest first, so every remaining one is too small
        if area > MAX_PAGE_AREA_RATIO * small_area:
            continue
        # 6. Polygon approximation: simplify the wiggly outline into straight
        #    sides, allowing it to differ from the outline by 2% of its length.
        perimeter = cv2.arcLength(contour, True)
        polygon = cv2.approxPolyDP(contour, 0.02 * perimeter, True)
        # A page has exactly four corners and bulges outwards (convex).
        if len(polygon) == 4 and cv2.isContourConvex(polygon):
            # Scale the corners back up to the full-size photo.
            return order_corners(polygon.reshape(4, 2) / scale), True

    return whole_image_corners(width, height), False


def whole_image_corners(width: int, height: int) -> np.ndarray:
    return np.array(
        [[0, 0], [width - 1, 0], [width - 1, height - 1], [0, height - 1]], dtype=np.float32
    )


def order_corners(points) -> np.ndarray:
    """Put four points in the order top-left, top-right, bottom-right, bottom-left."""
    points = np.asarray(points, dtype=np.float32).reshape(4, 2)
    # Sort by angle around the centre. Because y grows downwards in images,
    # increasing angle goes clockwise on screen.
    center = points.mean(axis=0)
    angles = np.arctan2(points[:, 1] - center[1], points[:, 0] - center[0])
    points = points[np.argsort(angles)]
    # Then start from the top-left corner: the one with the smallest x + y.
    start = int(np.argmin(points.sum(axis=1)))
    return np.roll(points, -start, axis=0)


def is_usable_page_shape(corners: np.ndarray, width: int, height: int) -> bool:
    """True if the ordered corners form a convex, not-tiny four-sided shape."""
    polygon = corners.reshape(4, 1, 2).astype(np.float32)
    area = cv2.contourArea(polygon)
    return bool(cv2.isContourConvex(polygon)) and area >= MIN_MANUAL_AREA_RATIO * width * height


def flatten_page(image: np.ndarray, corners: np.ndarray) -> np.ndarray:
    """Stretch the four-cornered page area into a flat, straight rectangle.

    The output size comes from the length of the page's edges in the photo,
    so a page photographed at a steep angle can come out a little squashed.
    """
    top_left, top_right, bottom_right, bottom_left = corners
    out_width = round(max(_distance(top_left, top_right), _distance(bottom_left, bottom_right)))
    out_height = round(max(_distance(top_left, bottom_left), _distance(top_right, bottom_right)))
    out_width, out_height = max(out_width, 1), max(out_height, 1)

    target = np.array(
        [[0, 0], [out_width - 1, 0], [out_width - 1, out_height - 1], [0, out_height - 1]],
        dtype=np.float32,
    )
    # A "perspective transform" is a 3x3 matrix that maps any four-sided
    # shape onto any other one; warpPerspective applies it to every pixel.
    matrix = cv2.getPerspectiveTransform(corners.astype(np.float32), target)
    return cv2.warpPerspective(image, matrix, (out_width, out_height), flags=cv2.INTER_CUBIC)


def enhance(image: np.ndarray, mode: str) -> np.ndarray:
    """Apply one of the ENHANCEMENTS. Black & white returns a single channel."""
    if mode == "original":
        return image
    if mode == "black_white":
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        gray = cv2.GaussianBlur(gray, (3, 3), 0)  # remove grain that would become speckles
        # Adaptive threshold: each pixel is compared with the average of its
        # own neighbourhood, not one cut-off for the whole page. That keeps
        # text black even where a shadow makes the paper darker.
        neighbourhood = _odd(max(15, min(gray.shape) // 25))
        return cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, neighbourhood, 15
        )
    raise ValueError(f"Unknown enhancement: {mode}")


def rotate(image: np.ndarray, degrees: int) -> np.ndarray:
    """Rotate clockwise by 0, 90, 180 or 270 degrees."""
    if degrees == 0:
        return image
    return cv2.rotate(image, _ROTATE_CODES[degrees])


def prepare_for_ocr(image: np.ndarray) -> np.ndarray:
    """Make a page as easy as possible for Tesseract to read.

    Tested on real pages, this beat our black & white look by a wide margin
    (a bank-statement screenshot: 24 of 25 values right instead of 6):

    1. Grayscale, not black & white: smooth letter edges keep their shape.
       A hard black/white cut makes small digits blobby (6 turns into 8).
    2. Even out the lighting, so shadows don't confuse Tesseract.
    3. Enlarge small pages so the letters are big enough.
    """
    gray = image if image.ndim == 2 else cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    gray = _even_out_lighting(gray)
    factor = min(max(OCR_TARGET_WIDTH / gray.shape[1], 1.0), OCR_MAX_ENLARGE)
    if factor > 1:
        gray = cv2.resize(gray, None, fx=factor, fy=factor, interpolation=cv2.INTER_CUBIC)
    return gray


def _even_out_lighting(gray: np.ndarray) -> np.ndarray:
    """Remove shadows and uneven light, keeping smooth grey edges.

    Estimates what the blank paper looks like everywhere (by blurring the
    text away), then divides by it, so paper becomes white and ink stays dark.
    """
    height, width = gray.shape
    # Work on a quarter-size copy: the background changes slowly, and this is much faster.
    small = cv2.resize(gray, (max(width // 4, 1), max(height // 4, 1)), interpolation=cv2.INTER_AREA)
    background = cv2.dilate(small, np.ones((7, 7), np.uint8))  # paint over thin dark text
    background = cv2.medianBlur(background, 21)
    background = cv2.resize(background, (width, height), interpolation=cv2.INTER_LINEAR)
    return cv2.divide(gray, background, scale=255)


def _odd(number: int) -> int:
    """Adaptive threshold needs an odd neighbourhood size."""
    return number if number % 2 == 1 else number + 1


def _distance(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.hypot(*(a - b)))
