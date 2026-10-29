"""Image upload: check the file, save it under a safe name, and serve it back."""

import re
import uuid
from io import BytesIO
from pathlib import Path

from flask import Blueprint, abort, jsonify, request, send_from_directory
from PIL import Image, ImageOps, UnidentifiedImageError

from . import config
from .errors import json_error

bp = Blueprint("uploads", __name__, url_prefix="/api/uploads")

# The real image format (detected from the file's contents) -> extension we save with.
FORMAT_EXTENSIONS = {"JPEG": "jpg", "PNG": "png", "WEBP": "webp"}

# Saved files are always named "<32 hex characters>.<extension>". Anything else
# asked for in a URL is refused, so nobody can request "../../secret.txt".
SAVED_NAME_PATTERN = re.compile(r"[0-9a-f]{32}\.(jpg|png|webp)")

Image.MAX_IMAGE_PIXELS = config.MAX_IMAGE_PIXELS


@bp.post("")
def upload_image():
    """Receive one image in the form field "image" and save it.

    Returns 201 with {id, filename, image_url, width, height}.
    """
    file = request.files.get("image")
    if file is None or not file.filename:
        return json_error("No file was sent. Choose an image and try again.", 400)

    # 1. Quick check on the name the browser sent. We never use this name to
    #    save the file; it is only a first filter.
    extension = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if extension not in config.ALLOWED_EXTENSIONS:
        return json_error("Unsupported file type. Please choose a JPG, PNG or WebP image.", 415)

    data = file.read()
    if not data:
        return json_error("The file is empty.", 400)

    # 2. Check the actual contents. A renamed .exe or a damaged photo fails here.
    try:
        image = Image.open(BytesIO(data))
        image_format = image.format
        width, height = image.size  # read from the header, before decoding pixels
        if image_format not in FORMAT_EXTENSIONS:
            return json_error("This file is not a real JPG, PNG or WebP image.", 415)
        if width * height > config.MAX_IMAGE_PIXELS:
            return json_error("This image has too many pixels. Please use a smaller photo.", 413)
        if min(width, height) < config.MIN_IMAGE_SIDE:
            return json_error(
                f"This image is too small ({width}×{height} px). "
                f"Each side must be at least {config.MIN_IMAGE_SIDE} px.",
                400,
            )

        # Phones often save photos sideways plus an "orientation" tag. This
        # rotates the pixels upright so OpenCV later sees what the user sees.
        image = ImageOps.exif_transpose(image)
        image = _flatten_to_rgb(image)
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError, SyntaxError, ValueError):
        return json_error("This file could not be read as an image. It may be damaged.", 400)

    # 3. Save under a random name. Re-saving also drops hidden metadata such
    #    as GPS location, which phone photos often contain.
    image_id = uuid.uuid4().hex
    saved_extension = FORMAT_EXTENSIONS[image_format]
    saved_name = f"{image_id}.{saved_extension}"
    save_options = {} if saved_extension == "png" else {"quality": 95}
    image.save(config.UPLOAD_DIR / saved_name, **save_options)

    return (
        jsonify(
            id=image_id,
            filename=saved_name,
            image_url=f"/api/uploads/{saved_name}",
            width=image.width,
            height=image.height,
        ),
        201,
    )


@bp.get("/<name>")
def get_uploaded_image(name: str):
    """Send back a previously saved image."""
    if not SAVED_NAME_PATTERN.fullmatch(name):
        abort(404, description="Image not found.")
    return send_from_directory(config.UPLOAD_DIR, name)


def find_upload(name: object) -> Path | None:
    """Return the path of a saved upload, or None if the name is invalid or missing."""
    if not isinstance(name, str) or not SAVED_NAME_PATTERN.fullmatch(name):
        return None
    path = config.UPLOAD_DIR / name
    return path if path.is_file() else None


def _flatten_to_rgb(image: Image.Image) -> Image.Image:
    """Return a plain colour (RGB) or greyscale (L) image.

    Transparent areas are placed on white, like paper, instead of turning black.
    """
    if image.mode in ("RGB", "L"):
        return image
    rgba = image.convert("RGBA")
    background = Image.new("RGB", rgba.size, "white")
    background.paste(rgba, mask=rgba.getchannel("A"))
    return background
