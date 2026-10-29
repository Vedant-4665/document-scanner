"""API routes that find the page in an uploaded photo, then crop and enhance it.

The image work itself lives in document_cv.py. This file only checks the
request, calls those functions, and saves the result.
"""

import hashlib
import json
import math
import re
from pathlib import Path

import cv2
import numpy as np
from flask import Blueprint, abort, current_app, jsonify, send_from_directory
from PIL import Image

from . import config, document_cv
from .errors import read_json_body
from .uploads import find_upload

bp = Blueprint("processing", __name__, url_prefix="/api")

# Processed files are named "<upload id>-<12 hex characters>-<look>.<jpg|png>",
# e.g. "ab12…-3f9c0d1e2b4a-black_white.png". Pages saved before the look was
# part of the name ("<upload id>-<12 hex>.jpg") are still accepted.
PROCESSED_NAME_PATTERN = re.compile(r"[0-9a-f]{32}-[0-9a-f]{12}(-original|-black_white)?\.(jpg|png)")


@bp.post("/process/detect")
def detect_page():
    """Body: {"filename": "<upload filename>"}.

    Returns {corners: [[x, y] x4], found: bool}. Corners are in the uploaded
    image's pixels, ordered top-left, top-right, bottom-right, bottom-left.
    """
    body = read_json_body()
    image = _load_upload(body.get("filename"))
    corners, found = document_cv.detect_page_corners(image)
    return jsonify(corners=_round_corners(corners), found=found)


@bp.post("/process/apply")
def apply_processing():
    """Body: {"filename", "corners": [[x, y] x4], "enhancement", "rotation"}.

    Returns {filename, image_url, width, height} of the processed page.
    """
    body = read_json_body()
    filename = body.get("filename")
    image = _load_upload(filename)
    height, width = image.shape[:2]

    corners = document_cv.order_corners(_parse_corners(body.get("corners"), width, height))
    if not document_cv.is_usable_page_shape(corners, width, height):
        abort(
            400,
            description="The corners don't make a usable page shape. Make sure the outline "
            "isn't dented inwards and isn't tiny.",
        )

    enhancement = body.get("enhancement", "original")
    if enhancement not in document_cv.ENHANCEMENTS:
        abort(400, description=f"Unknown enhancement option: {enhancement!r}.")

    rotation = body.get("rotation", 0)
    if isinstance(rotation, bool) or rotation not in document_cv.ROTATIONS:
        abort(400, description="Rotation must be 0, 90, 180 or 270.")

    # Name the files after their settings: the same settings give the same file,
    # so switching options back and forth doesn't fill the disk with copies.
    # The colour version is always saved too, even when the user picks black &
    # white: text recognition reads the colour version (see color_version_of).
    settings = json.dumps([filename, _round_corners(corners), rotation])
    stem = f"{filename.split('.')[0]}-{hashlib.sha256(settings.encode()).hexdigest()[:12]}"
    color_path = config.PROCESSED_DIR / f"{stem}-original.jpg"
    # PNG keeps black & white crisp; JPEG keeps colour photos small.
    output_path = color_path if enhancement == "original" else config.PROCESSED_DIR / f"{stem}-black_white.png"

    if not color_path.exists() or not output_path.exists():
        try:
            color = document_cv.rotate(document_cv.flatten_page(image, corners), rotation)
            _save(color_path, color)
            if output_path != color_path:
                _save(output_path, document_cv.enhance(color, enhancement))
        except cv2.error:
            current_app.logger.exception("OpenCV failed while processing %s", filename)
            abort(500, description="Processing failed. Try moving the corners or using another photo.")

    with Image.open(output_path) as result:  # reads only the size from the file header
        result_width, result_height = result.size
    return jsonify(
        filename=output_path.name,
        image_url=f"/api/processed/{output_path.name}",
        width=result_width,
        height=result_height,
    )


@bp.get("/processed/<name>")
def get_processed_image(name: str):
    if not PROCESSED_NAME_PATTERN.fullmatch(name):
        abort(404, description="Processed image not found.")
    return send_from_directory(config.PROCESSED_DIR, name)


# --- Helpers ---


def color_version_of(processed_path: Path) -> Path:
    """The colour version of a processed page (itself, if it is already colour).

    Older pages, saved before colour copies were kept, have no colour version;
    for those the page itself is returned.
    """
    if processed_path.name.endswith("-black_white.png"):
        color_path = processed_path.with_name(processed_path.name.replace("-black_white.png", "-original.jpg"))
        if color_path.is_file():
            return color_path
    return processed_path


def _save(path: Path, image: np.ndarray) -> None:
    params = [cv2.IMWRITE_JPEG_QUALITY, 92] if path.suffix == ".jpg" else []
    if not cv2.imwrite(str(path), image, params):
        abort(500, description="The processed page could not be saved on the server.")


def find_processed(name: object) -> Path | None:
    """Return the path of a processed page, or None if the name is invalid or missing."""
    if not isinstance(name, str) or not PROCESSED_NAME_PATTERN.fullmatch(name):
        return None
    path = config.PROCESSED_DIR / name
    return path if path.is_file() else None


def _load_upload(filename: object) -> np.ndarray:
    path = find_upload(filename)
    if path is None:
        abort(404, description="The uploaded image was not found. Please upload it again.")
    image = cv2.imread(str(path), cv2.IMREAD_COLOR)
    if image is None:
        abort(500, description="The server could not open the uploaded image. Please upload it again.")
    return image


def _parse_corners(value: object, width: int, height: int) -> np.ndarray:
    """Check the corners are four [x, y] number pairs; pull them inside the image."""
    message = "Corners must be a list of four [x, y] number pairs."
    if not isinstance(value, list) or len(value) != 4:
        abort(400, description=message)
    points = []
    for point in value:
        if not (isinstance(point, list) and len(point) == 2):
            abort(400, description=message)
        for number in point:
            # bool is a kind of int in Python, so rule it out explicitly.
            if isinstance(number, bool) or not isinstance(number, (int, float)) or not math.isfinite(number):
                abort(400, description=message)
        x, y = point
        points.append([min(max(x, 0), width - 1), min(max(y, 0), height - 1)])
    return np.array(points, dtype=np.float32)


def _round_corners(corners: np.ndarray) -> list[list[float]]:
    return [[round(float(x), 1), round(float(y), 1)] for x, y in corners]
