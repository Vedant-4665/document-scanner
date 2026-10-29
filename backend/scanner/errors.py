"""JSON error responses and request checks shared by every API route."""

from flask import Flask, abort, jsonify, request
from werkzeug.exceptions import HTTPException

from . import config


def json_error(message: str, status: int):
    """Return a response like {"error": "..."} with the given HTTP status."""
    return jsonify(error=message), status


def read_json_body() -> dict:
    """Return the request's JSON object, or stop with a 400 error."""
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        abort(400, description="The request must be a JSON object.")
    return body


def register_error_handlers(app: Flask) -> None:
    """Make Flask answer with JSON, never an HTML error page."""

    @app.errorhandler(413)
    def too_large(_error):
        return json_error(f"File is too large. The limit is {config.MAX_UPLOAD_MB} MB.", 413)

    @app.errorhandler(HTTPException)
    def http_error(error: HTTPException):
        return json_error(error.description or "Request failed.", error.code or 500)

    @app.errorhandler(Exception)
    def unexpected_error(error: Exception):
        # Log the full details in the terminal, but do not show internals to the browser.
        app.logger.exception("Unexpected server error: %s", error)
        return json_error("Something went wrong on the server. Check the backend terminal.", 500)
