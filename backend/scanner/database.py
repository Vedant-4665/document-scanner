"""SQLite storage for saved scans, using Python's built-in sqlite3 module.

The database is one file: backend/data/scanner.db. It has two tables:

  scans       one row per saved scan: title, date, page count, PDF path
  scan_pages  one row per page: its position, image paths and recognised text

Images and PDFs stay as normal files in backend/data/. The database only
stores their paths, relative to backend/data/ (for example "outputs/ab12….pdf").
"""

import sqlite3
from contextlib import closing

from . import config

SCHEMA = """
CREATE TABLE IF NOT EXISTS scans (
    id          TEXT PRIMARY KEY,   -- 32 random hex characters
    title       TEXT NOT NULL,
    created_at  TEXT NOT NULL,      -- date and time in ISO 8601 format, UTC
    page_count  INTEGER NOT NULL,
    pdf_path    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS scan_pages (
    -- ON DELETE CASCADE: deleting a scan deletes its page rows too.
    scan_id         TEXT NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
    page_number     INTEGER NOT NULL,   -- 1, 2, 3 … in document order
    original_path   TEXT NOT NULL,      -- the uploaded photo
    processed_path  TEXT NOT NULL,      -- the flattened page shown in the PDF
    ocr_text        TEXT NOT NULL,
    PRIMARY KEY (scan_id, page_number)
);
"""


def connect() -> sqlite3.Connection:
    connection = sqlite3.connect(config.DATABASE_PATH)
    connection.row_factory = sqlite3.Row  # rows can be read like dicts: row["title"]
    connection.execute("PRAGMA foreign_keys = ON")  # SQLite needs this for ON DELETE CASCADE
    return connection


def init_db() -> None:
    """Create the tables if they don't exist yet."""
    # closing() closes the connection; "with db" commits, or rolls back on error.
    with closing(connect()) as db, db:
        db.executescript(SCHEMA)


def add_scan(scan_id: str, title: str, created_at: str, pdf_path: str, pages: list[dict]) -> None:
    """Save a scan and its pages. Each page dict has original_path, processed_path, ocr_text."""
    with closing(connect()) as db, db:
        db.execute(
            "INSERT INTO scans (id, title, created_at, page_count, pdf_path) VALUES (?, ?, ?, ?, ?)",
            (scan_id, title, created_at, len(pages), pdf_path),
        )
        db.executemany(
            "INSERT INTO scan_pages (scan_id, page_number, original_path, processed_path, ocr_text)"
            " VALUES (?, ?, ?, ?, ?)",
            [
                (scan_id, number, page["original_path"], page["processed_path"], page["ocr_text"])
                for number, page in enumerate(pages, start=1)
            ],
        )


def list_scans(search: str = "") -> list[sqlite3.Row]:
    """Newest first. With a search, only scans whose title or text contains it.

    Each row also has first_page_path (for a thumbnail) and matching_text
    (the first page whose text contains the search, for a preview snippet).
    """
    # LIKE treats % and _ as wildcards, so escape them in what the user typed.
    escaped = search.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    pattern = f"%{escaped}%"
    with closing(connect()) as db:
        return db.execute(
            r"""
            SELECT s.*,
                   (SELECT processed_path FROM scan_pages
                     WHERE scan_id = s.id ORDER BY page_number LIMIT 1) AS first_page_path,
                   (SELECT ocr_text FROM scan_pages
                     WHERE scan_id = s.id AND ocr_text LIKE :pattern ESCAPE '\'
                     ORDER BY page_number LIMIT 1) AS matching_text
              FROM scans s
             WHERE :search = ''
                OR s.title LIKE :pattern ESCAPE '\'
                OR EXISTS (SELECT 1 FROM scan_pages p
                            WHERE p.scan_id = s.id AND p.ocr_text LIKE :pattern ESCAPE '\')
             ORDER BY s.created_at DESC
            """,
            {"search": search, "pattern": pattern},
        ).fetchall()


def get_scan(scan_id: str) -> tuple[sqlite3.Row, list[sqlite3.Row]] | None:
    """Return (scan row, page rows in order), or None if there is no such scan."""
    with closing(connect()) as db:
        scan = db.execute("SELECT * FROM scans WHERE id = ?", (scan_id,)).fetchone()
        if scan is None:
            return None
        pages = db.execute(
            "SELECT * FROM scan_pages WHERE scan_id = ? ORDER BY page_number", (scan_id,)
        ).fetchall()
        return scan, pages


def delete_scan(scan_id: str) -> list[str] | None:
    """Delete a scan's rows. Return the file paths that no other scan still uses.

    Two scans can share page images (making a PDF twice from the same pages),
    so a page's files are only listed for deletion when nothing else needs them.
    Returns None if there is no such scan.
    """
    with closing(connect()) as db, db:
        scan = db.execute("SELECT pdf_path FROM scans WHERE id = ?", (scan_id,)).fetchone()
        if scan is None:
            return None
        pages = db.execute(
            "SELECT original_path, processed_path FROM scan_pages WHERE scan_id = ?", (scan_id,)
        ).fetchall()
        db.execute("DELETE FROM scans WHERE id = ?", (scan_id,))  # page rows go too (CASCADE)

        unused = [scan["pdf_path"]]
        for page in pages:
            for column in ("original_path", "processed_path"):
                # `column` is one of the two fixed names above, never user input,
                # so putting it into the SQL text is safe.
                still_used = db.execute(
                    f"SELECT 1 FROM scan_pages WHERE {column} = ? LIMIT 1", (page[column],)
                ).fetchone()
                if not still_used and page[column] not in unused:
                    unused.append(page[column])
        return unused


def all_saved_paths() -> set[str]:
    """Every file path that some saved scan uses."""
    with closing(connect()) as db:
        rows = db.execute(
            "SELECT pdf_path AS path FROM scans"
            " UNION SELECT original_path FROM scan_pages"
            " UNION SELECT processed_path FROM scan_pages"
        ).fetchall()
        return {row["path"] for row in rows}
