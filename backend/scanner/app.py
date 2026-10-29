"""Flask application: creates the app and registers the JSON API routes."""

import cv2
import pytesseract
from flask import Flask, jsonify

from . import config, database, processing, scans, uploads
from .errors import register_error_handlers


def create_app() -> Flask:
    app = Flask(__name__)

    # Flask rejects bigger requests with "413 Request Entity Too Large".
    app.config["MAX_CONTENT_LENGTH"] = config.MAX_UPLOAD_MB * 1024 * 1024

    config.ensure_data_dirs()
    database.init_db()
    scans.remove_abandoned_files()
    register_error_handlers(app)
    app.register_blueprint(uploads.bp)
    app.register_blueprint(processing.bp)
    app.register_blueprint(scans.bp)

    @app.get("/api/health")
    def health():
        """Lets the frontend (and you) confirm the backend and its tools work."""
        return jsonify(
            status="ok",
            opencv_version=cv2.__version__,
            tesseract_version=_tesseract_version(),
            max_upload_mb=config.MAX_UPLOAD_MB,
        )

    return app


def _tesseract_version() -> str | None:
    """Return the installed Tesseract version, or None if it is not installed."""
    try:
        return str(pytesseract.get_tesseract_version())
    except pytesseract.TesseractNotFoundError:
        return None
