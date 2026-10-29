# Computer Vision Document Scanner

A web app that scans documents from a phone camera or an uploaded image,
straightens and cleans them up with OpenCV, reads the text with Tesseract,
and makes a searchable PDF.

> **Status: all 7 milestones done.** Multi-page scanning, OCR, searchable PDF and
> a saved, searchable history. Before you hand it in or demo it, work through
> **[MANUAL_CHECKS.md](MANUAL_CHECKS.md)** on a computer and a real phone.

## Project layout

```
CV_individual/
├── README.md                This file
├── MANUAL_CHECKS.md         Final check list for desktop and phone browsers
├── backend/                 Python + Flask JSON API
│   ├── requirements.txt     Python packages
│   ├── run.py               Starts the dev server on port 5001
│   ├── scanner/
│   │   ├── app.py           Creates the Flask app and the /api/health route
│   │   ├── config.py        Upload limit, allowed file types, data folders
│   │   ├── errors.py        Turns every error into {"error": "..."} JSON
│   │   ├── uploads.py       POST /api/uploads (check + save), GET /api/uploads/<name>
│   │   ├── document_cv.py   All OpenCV work: find corners, flatten, black & white, rotate
│   │   ├── processing.py    POST /api/process/detect and /apply, GET /api/processed/<name>
│   │   ├── ocr.py           Tesseract OCR; builds one searchable PDF page
│   │   ├── scans.py         Create (OCR + PDF + save), list/search, view, download, delete scans
│   │   └── database.py      SQLite (built-in sqlite3): the scans and scan_pages tables
│   └── data/                Created automatically. Scans, PDFs, SQLite DB (not in git)
└── frontend/                React + TypeScript + Vite + Tailwind CSS
    ├── vite.config.ts       Forwards /api/* requests to Flask
    └── src/
        ├── App.tsx          Holds the list of pages and the page being edited
        ├── scanTypes.ts     What a page looks like in the app's memory
        ├── screens/         Scan tab: page list → corners → page result → review
        │                    History tab: list with search → scan details
        ├── config.ts        Upload limit and file types (match backend config.py)
        ├── api/client.ts    Every call to the backend goes through here
        ├── index.css        Theme: font, animations (scan line, fade-in, shimmer)
        ├── lib/             Plain helpers (file checks, corners, copy text, friendly dates)
        └── components/      Reusable pieces (capture cards, page grid, corner editor
            │                with magnifier, text viewer, page viewer, alerts)
            └── ui/          Small design pieces: buttons, toast messages, confirm
                             dialog, step indicator, sticky action bar
```

## The interface

- **Phone first.** A bottom tab bar (Scan / History), large tap targets, and
  the main button of each step stuck to the bottom of the screen.
- **Guided steps.** A progress bar shows Capture → Corners → Enhance → Review.
- **Feedback everywhere.** A scanning animation while OpenCV looks for the
  page, a magnifier while dragging corners, "Hold to compare" with the
  original photo, a live progress card during OCR, and short pop-up messages
  ("Page 2 added"). Removing a page can be undone.
- **History.** Search highlights the matching words, pages open in a
  full-screen viewer (swipe between them), and deleting asks first.
- Icons come from the `lucide-react` package; everything else is Tailwind CSS.
  Animations switch off when the device's "reduce motion" setting is on.

## What you need installed (macOS)

| Tool    | Check with         | Tested with |
|---------|--------------------|-------------|
| Python  | `python3 --version` | 3.12.4      |
| Node.js | `node --version`    | 22.14.0     |
| npm     | `npm --version`     | 10.9.2      |
| Tesseract | `tesseract --version` | 5.5.3     |
| Tesseract languages (optional) | `tesseract --list-langs` | lists `hin` after `brew install tesseract-lang` |
| Homebrew | `brew --version`   | (to install Tesseract) |

### Installing Tesseract

Tesseract is the program that reads text from images. It is installed on the
Mac itself, not inside the Python environment:

```bash
brew install tesseract
```

This takes a few minutes. Check it worked:

```bash
tesseract --list-langs
```

Expected output lists `eng` and `osd`. If the app says "Tesseract is not
installed on the server", this step is missing. For other languages,
`brew install tesseract-lang` adds them; then change `OCR_LANGUAGE` in
`backend/scanner/config.py` (for example `"eng+hin"`).

## Getting the code

```bash
git clone https://github.com/Vedant-4665/document-scanner.git
cd document-scanner
```

**Every command below starts in this project folder** (the one containing
`README.md`). Open a new terminal there before each block.

Your scans, PDFs and database (`backend/data/`) are never put in Git, so a
fresh copy starts with an empty history.

## First-time setup

Run these once. Open **Terminal** (or the VS Code terminal) in the project folder.

**Backend**:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

`python3 -m venv .venv` makes a private Python environment just for this project.
After `source .venv/bin/activate`, your prompt starts with `(.venv)`.
The install should end with a line starting `Successfully installed flask-…`.

**Frontend**:

```bash
cd frontend
npm install
```

Success looks like `added N packages` and `found 0 vulnerabilities`.

## Running the app (every time)

You need **two terminal windows**: the backend and frontend run side by side.

**Terminal 1: backend**

```bash
cd backend
source .venv/bin/activate
python run.py
```

Expected output includes:

```
 * Running on http://127.0.0.1:5001
 * Debugger is active!
```

**Terminal 2: frontend**

```bash
cd frontend
npm run dev
```

Expected output includes `Local:   http://localhost:5173/`.

Open <http://localhost:5173> in your browser. You should see **Scan a document**
with an **Upload an image** card. Phones show **Take photo** and **Upload** cards. If a yellow warning about the backend
appears instead, Flask is not running.

Stop either server with **Ctrl + C** in its terminal.

### How the two halves connect

The browser only talks to Vite (port 5173). Vite forwards every request
starting with `/api` to Flask (port 5001). Flask uses 5001 because macOS's
AirPlay Receiver uses port 5000.

## Upload rules

- Types: JPG, PNG, WebP. The server checks the file's real contents, not just its name.
- Size: up to 15 MB per file and 50 million pixels; each side at least 200 px.
- iPhone HEIC photos are not supported. Set Settings → Camera → Formats →
  **Most Compatible**, or export the photo as JPG.
- Saved files get random names like `3f9c…e1.jpg` in `backend/data/uploads/`.
  The name you uploaded is never used on disk. Phone photos are rotated
  upright, and hidden metadata such as GPS location is removed when saved.

## How the image processing works (plain language)

All of the computer-vision code is in one file: `backend/scanner/document_cv.py`.

### Finding the page: `detect_page_corners()`

1. **Shrink.** The photo is scaled down so its longest side is 800 px. This is
   faster, and tiny details like paper texture stop getting in the way.
2. **Grayscale.** Colour is thrown away. Edges are changes in brightness, so
   one brightness value per pixel is enough.
3. **Gaussian blur.** Each pixel is averaged with its neighbours (5×5). This
   smooths out camera noise, which would otherwise look like lots of tiny edges.
4. **Canny edge detection.** Marks pixels where brightness changes sharply,
   such as the border between a white page and a dark table. The result is a
   black image with thin white lines. The lines are thickened slightly
   (dilation) so small gaps in the page border join up.
5. **Contour detection.** `findContours` traces the connected white lines
   into outlines, i.e. lists of points.
6. **Polygon approximation.** `approxPolyDP` simplifies each wiggly outline
   into a few straight sides. It may differ from the outline by up to 2% of
   the outline's length.
7. **Pick the page.** Starting with the biggest outline, the first one that
   has exactly **four corners**, is **convex** (bulges outwards, no dents) and
   covers **20–98% of the photo** is taken as the page.
8. **Order the corners.** The four points are sorted into top-left,
   top-right, bottom-right, bottom-left (by angle around their centre), then
   scaled back up to the full-size photo.

If no outline passes step 7, the app says it couldn't find the page and
starts the corners at the edges of the photo, for you to drag into place.

### Flattening: `flatten_page()`

The four corners usually form a skewed shape, because the photo was taken
at an angle. `cv2.getPerspectiveTransform` calculates a 3×3 matrix that maps
those four corners onto the corners of a straight rectangle.
`cv2.warpPerspective` then moves every pixel using that matrix. The
rectangle's size is the length of the page's longest edges in the photo.

### Black & white: `enhance()`

The page is turned grey and lightly blurred. Then **adaptive thresholding**
makes each pixel pure black or pure white. Each pixel is compared with the
average brightness of its own neighbourhood, not with one value for the
whole page. So text stays black even where a shadow makes part of the paper
darker. The **Color** option keeps the flattened page as photographed. The
original photo is always kept on the server ("View original photo").

### When it goes wrong

Automatic detection is a best guess. Expect it to miss when:

- the page is on a similar-coloured surface (white paper on a white desk)
- the page is folded or curled
- a corner is outside the photo
- something else rectangular in the photo is bigger than the page

The corner screen is always shown so you can check. Flattening estimates
the page's proportions from the photo, so a page shot at a steep angle can
come out slightly squashed.

### Reading the text and making the PDF: `ocr.py` and `scans.py`

When you press **Create and save PDF**, the backend does this for each page:

1. **Prepare an OCR copy** (`prepare_for_ocr()` in `document_cv.py`) from
   the **colour** version of the page, even if you chose Black & white
   (every page keeps a colour copy for this):
   - **Grayscale**, not black & white: smooth letter edges keep their
     shape. A hard black/white cut makes small digits blobby (6 becomes 8).
   - **Even out the lighting**: estimate the blank paper by blurring the text
     away, then divide by it, so shadows disappear.
   - **Enlarge small pages** to about 2400 px wide (at most 2.5×). Tesseract
     reads best when letters are about 25–35 px tall; a phone screenshot is
     often only 1170 px wide.

   On a real bank-statement screenshot this read **22 of 25** checked values
   (dates, amounts, names) correctly, against **6 of 25** when Tesseract read
   the black & white look. Shadowed photos still read all lines correctly.
2. **Choose the languages for this page** (`choose_languages()` in `ocr.py`).
   A quick read of a small preview (1000 px wide) with every installed
   language shows which scripts are on the page. A language is used only
   if its script is at least 10% of the page's letters *and* at least 20%
   as common as the page's main non-English script. English is always used.
   Without this, Tesseract mixed scripts (Gujarati letters inside Hindi
   words) and invented text from logos and photos.
3. **Run Tesseract once on that copy** (through `pytesseract`, told the copy
   is 300 DPI, a normal scanner setting). That one run writes:
   - a **text-only PDF page**: invisible words placed exactly where they
     appear on the page (`textonly_pdf=1`)
   - a **word table** (TSV): every word with its position and a confidence
     score from 0 to 100. The page's text is rebuilt from this table,
     **leaving out lines where no word scored 60 or more**. Those are almost
     always "text" Tesseract imagined in a logo, barcode, photo or signature.
4. **Make the picture page.** Pillow turns the page as you chose it (Color or
   Black & white) into a PDF page sized to fit A4.
5. **Stack the two** with pypdf: the text layer is stretched to exactly the
   picture's size and placed on top. You see the picture, but can search,
   select and copy the words.

**Languages.** `OCR_LANGUAGES` in `config.py` lists `eng` (English), `hin`
(Hindi) and `guj` (Gujarati). Only installed languages are used. Homebrew's
`tesseract` includes English only; `brew install tesseract-lang` adds about
120 more (≈690 MB), including Hindi and Gujarati. Restart the backend after
installing. To support another script, add its language code to
`OCR_LANGUAGES` and its Unicode letter range to `SCRIPT_OF_LANGUAGE` in
`ocr.py`.

Tested on five real pages (an ID card, two Hindi/English bank statements, a
Gujarati address and an English certificate): every checked phrase was read
correctly (47 of 47), with no mixed-up scripts. Time per page: about 1–2 s
for English or Gujarati pages, about 10 s for a dense bilingual statement.

Reading every language on every page was worse: Gujarati letters appeared
inside Hindi words, the certificate code `617fbe8fc4f4` became `61700810414`,
and Hindi digits appeared in Gujarati text.


Finally pypdf joins all pages, in your order, into one PDF in
`backend/data/outputs/`.

OCR is a best guess. It works best on sharp, evenly lit, printed text. Expect
mistakes with blur, handwriting, unusual fonts, tiny print, and languages
other than English, and look-alike swaps such as 0/O and 1/l. The app shows
this warning next to the text.

## Pages

Add as many pages as you like. Each page is: photo → adjust corners → pick a
look and rotation → **Save page**. On the main screen, the ‹ › arrows under each page change the order,
tapping a page (or ✎) reopens it, and the bin removes it (with **Undo**). When
the pages are ready, **Review & save** opens the review screen. Give the
scan a title, press **Create and save PDF**, then **Download PDF** and
read the recognised text. Until you save, pages exist only in the open
browser tab, and the browser asks before you close or reload it.

## Download formats

After saving, and on each scan in History, **Download as** shows the formats
that suit that scan. The backend decides (`backend/scanner/exports.py`):

| Format | Offered when | File |
|--------|--------------|------|
| **PDF** (recommended) | always | the searchable PDF: the pages with invisible, selectable text |
| **Word** | text was recognised | `.docx` (A4): for each scanned page, a "Page N" heading, the **page as a picture**, then its recognised text as normal paragraphs you can edit; each scanned page starts a new Word page |
| **Text** | text was recognised | `.txt` (UTF-8, so Hindi works), pages separated by `--- Page N ---` |
| **Image / Images** | always | one page: that page as JPG (Color) or PNG (Black & white); several pages: a `.zip` with one image per page, numbered in order |

If no text was found, Word and Text aren't offered, and a note says why.
Word and Text use the same tidy-up as the on-screen text (no big gaps, no
stray "|" lines). Only the PDF is stored on disk; the other files are made
when you download them. Word files are built with the `python-docx` package.

## History: how scans are saved

Every scan you save appears in the **History** tab. There you can search,
open a scan, download its PDF, see its text, and delete it.

**Files and database.** Images and PDFs are ordinary files in `backend/data/`:

| Folder | What's in it |
|--------|--------------|
| `uploads/` | the original photos |
| `processed/` | the flattened pages (Color or Black & white) |
| `outputs/` | the searchable PDFs |

The details live in one SQLite database file, `backend/data/scanner.db`,
handled with Python's built-in `sqlite3` module in `backend/scanner/database.py`.
It has two tables:

- **scans**: id, title, date and time (`created_at`), page count, PDF path
- **scan_pages**: for each page: which scan it belongs to, its page number,
  the paths of its original photo and processed image, and its OCR text

Paths are stored relative to `backend/data/` (for example `outputs/3f9c….pdf`).

**Search** looks for your words anywhere in a scan's title or in any page's
text (SQL `LIKE`, ignoring upper/lower case for English letters). It can
only find what OCR actually read, so a misread word won't match.

**Delete** removes the scan's rows and its files. A page image used by two
saved scans (for example if you saved the same pages twice) is kept until
neither scan needs it.

**Cleanup.** Every photo you take and every look you try is saved as a file.
When the backend starts, it deletes files that no saved scan uses and that
are more than 24 hours old (`ABANDONED_FILE_HOURS` in `config.py`). These are
left over from cancelled pages or closed tabs.

To look inside the database yourself (macOS includes the `sqlite3` tool):

```bash
sqlite3 backend/data/scanner.db "SELECT title, created_at, page_count FROM scans;"
```

Each saved scan prints as one line, like `Rent receipt|2026-10-27T17:29:41+00:00|1`.
Times are stored in UTC; the app shows them in your local time. To start
completely fresh, stop the backend and delete the `backend/data/` folder;
it is recreated, empty, on the next start.

## Testing on a real phone

The app uses an ordinary file input for photos, not a live camera stream.
Live camera streams need `https://`, but this doesn't, so plain `http://` on
your home Wi-Fi works.

1. Start the backend as usual (Terminal 1).
2. In Terminal 2, start the frontend so other devices can reach it:

   ```bash
   cd frontend
   npm run dev -- --host
   ```

   The output now includes a second line such as
   `➜  Network: http://192.168.1.23:5173/`. Your numbers will differ.
3. If macOS asks whether "node" may accept incoming network connections,
   click **Allow**.
4. Connect your phone to the **same Wi-Fi** as your Mac and open that
   Network address in the phone's browser.
5. Tap **Take photo**. Your phone should open the camera. Some browsers
   ignore the camera hint and show a chooser instead. If the camera never
   opens, allow camera access for the browser in the phone's settings, or
   use **Upload**.

Only use `--host` on a network you trust. Anyone on that Wi-Fi can open the
app while it runs.

## Security note: no user accounts yet

This version has **no sign-in**. Anyone who can open the app can see every
scan in history. That's fine on your own computer. **Before you deploy it
publicly or store other people's real documents**, add sign-in and make each
scan belong to one user, so people can only see and delete their own scans.
