# Final manual-check list

Work through this list by hand on a computer and on a real phone. Tick each
box when the **Expected** result happens. If something else happens, write
down what you saw next to it. That note is your bug report.

Automatic tests can't cover real cameras, real paper, real lighting or real
phone browsers, so this list matters.

---

## 0. Before you start

### Prepare test material

- [ ] A **printed, typed page** (a letter, a printed web page) — the "easy" case
- [ ] A **receipt or bill** with small print and numbers
- [ ] A **3-page document** (any three printed pages; number them 1, 2, 3 by hand)
- [ ] A **handwritten note** — expected to read badly; that's honest behaviour
- [ ] A **dark table or surface** and a **white table or white sheet** to put pages on
- [ ] On the computer: one **.txt file**, one **.pdf file**, and a **text file renamed to `fake.jpg`**
- [ ] On the computer: a photo **bigger than 15 MB** (if you don't have one, skip that check and note it)

### Start the app

Run each command from the project folder (the one containing `README.md`).

Terminal 1:

```bash
cd backend && source .venv/bin/activate && python run.py
```

- [ ] **Expected:** `* Running on http://127.0.0.1:5001`

Terminal 2 (use `--host` so the phone can connect too):

```bash
cd frontend && npm run dev -- --host
```

- [ ] **Expected:** a `Local:` line and a `Network: http://…:5173/` line
- [ ] If macOS asks whether "node" may accept incoming connections, click **Allow**

### Browsers to test

Tick the ones you have and do sections 1–7 in each:

| Browser | Device | Done? | Notes |
|---------|--------|-------|-------|
| Chrome | Mac | ☐ | |
| Safari | Mac | ☐ | |
| Firefox (optional) | Mac | ☐ | |
| Safari | iPhone | ☐ | |
| Chrome | Android phone | ☐ | |

On the phone, open the **Network** address (not `localhost`). Phone and Mac
must be on the same Wi-Fi.

---

## 1. Opening the app

- [ ] Open the app. **Expected:** "Scan a document" with a big **Upload an image** card (on a phone: **Take photo** and **Upload** cards side by side) and a tips box. Desktop: **Scan** / **History** tabs in the header. Phone: a tab bar at the bottom.
- [ ] Stop Terminal 1 (Ctrl+C) and reload. **Expected:** a yellow warning that the backend is not responding, with **Retry**.
- [ ] Start Terminal 1 again, press **Retry**. **Expected:** the warning disappears.
- [ ] **Phone:** nothing on the page is wider than the screen; no sideways scrolling.

## 2. Adding a page

### Desktop

- [ ] **Desktop:** only the **Upload an image** card is shown (no Take photo). Drag a photo onto it. **Expected:** "Drop the image here" while dragging; then "Analysing page 1…" with a glowing line sweeping over the photo and a checklist (Uploading photo → Finding the page edges); then the corner screen.
- [ ] Click **Upload an image** → pick a photo. **Expected:** same as above.

### Phone

- [ ] **Take photo**. **Expected:** the back camera opens. Take a photo of the printed page on the dark table → corner screen.
- [ ] If the camera did *not* open (chooser shown instead): **Expected:** you can still take or pick a photo from that chooser. Note which browser did this.
- [ ] Deny camera permission for the browser in the phone's settings, then tap **Take photo**. **Expected:** the camera can't open; **Upload** still works.
- [ ] **Upload** → pick a photo from the gallery. **Expected:** corner screen.
- [ ] **iPhone:** pick a photo from the library. **Expected:** it uploads (iPhone usually converts to JPG). If you see the HEIC message instead, its instructions should make sense.

### Bad files (desktop is easiest)

- [ ] `.txt` file → **Expected:** "Unsupported file type. Please choose a JPG, PNG or WebP image."
- [ ] `.pdf` file → **Expected:** same message.
- [ ] `fake.jpg` (renamed text file) → **Expected:** "This file could not be read as an image. It may be damaged."
- [ ] Photo over 15 MB → **Expected:** "This file is … MB. The limit is 15 MB."

## 3. Finding and adjusting the corners

- [ ] Printed page on a **dark** surface. **Expected:** the step bar shows step 2, a green "Page edges detected" chip, and the outline hugs the paper's edges; everything outside it is dimmed.
- [ ] White page on a **white** surface. **Expected:** yellow "We couldn't find the page edges automatically", corners start at the photo's edges.
- [ ] Drag each corner handle with mouse / finger. **Expected:** the handle follows; a round **magnifier** appears at the top (on the side away from your finger) showing the corner up close with a crosshair; the page doesn't scroll while dragging on the phone; corners stop at the photo's edge.
- [ ] Drag a corner badly, press **Reset to detected**. **Expected:** the outline returns to the found position.
- [ ] Press **Use whole image**. **Expected:** corners jump to the photo's corners.
- [ ] **Desktop keyboard:** press Tab until a corner handle is outlined in yellow, use the arrow keys (Shift = bigger steps). **Expected:** the corner moves.
- [ ] Drag corners into a dented (arrow-head) shape, press **Crop page**. **Expected:** a red message saying the corners don't make a usable page shape, with **Try again**; **← Corners** lets you fix it.
- [ ] **Cancel** (top right, and next to **Crop page**). **Expected:** back to the start screen or page list with a "Page discarded · **Undo**" message. Press **Undo** quickly: the corner screen comes back.

### Going back, from anywhere (you should never feel stuck)

- [ ] Choose a photo, and **while "Analysing page 1…" is showing** press **Cancel** (top right, under the progress bar). **Expected:** straight back to the start screen, no error message, and the corner screen does *not* appear a few seconds later. (To see this clearly, use a large photo or a phone on slow Wi-Fi.)
- [ ] Repeat, but this time tap the **DocScan logo** at the top left instead. **Expected:** the same.
- [ ] Repeat, but this time press the browser's **Back** button (phone: the Back gesture or button). **Expected:** the same. The app is not left.
- [ ] On the corner screen press **Back**. **Expected:** the page is discarded (with Undo). On the *result* screen, **Back** goes to the corner screen first, then to the start.
- [ ] On the review screen press **Back**. **Expected:** the page list, with your pages still there. After a scan is *saved*, **Back** starts a fresh scan instead.
- [ ] In History, open a scan and press **Back**. **Expected:** the list.
- [ ] Tap the **Scan** tab while you are already on it, from the review screen. **Expected:** the page list.

## 4. Page result (look and rotation)

- [ ] **Crop page** on a good outline. **Expected:** step 3, a straight, flat page with the table cut away. On a phone the **Save page** button stays at the bottom of the screen.
- [ ] Switch **Color** ↔ **Black & white**. **Expected:** "Processing…", then the new look. Black & white has crisp black text on white paper.
- [ ] Photo with a **shadow** across the page → Black & white. **Expected:** the shadow mostly disappears; text stays readable.
- [ ] The round **rotate right** button four times. **Expected:** back to the starting orientation.
- [ ] Press and hold **Hold to compare**. **Expected:** the original photo shows while held; the result returns when you let go.
- [ ] **← Corners**. **Expected:** your corners are still where you left them.
- [ ] **Save page**. **Expected:** a "Page 1 added" message at the top, then "Your document" with a numbered page card and an **Add page** tile.

## 5. Multiple pages

- [ ] Add pages 2 and 3 of the numbered document (in the wrong order on purpose: 1, 3, 2).
- [ ] Use the ‹ › arrows under each page card to put them in order 1, 2, 3. **Expected:** cards reorder; ‹ on the first and › on the last are greyed out. The Scan tab shows a badge with the page count.
- [ ] Tap page 2 (or its ✎ pencil), change its look, **Save page**. **Expected:** it stays in position 2 with the new look.
- [ ] Edit a page, then ✕ Cancel. **Expected:** nothing changes.
- [ ] The 🗑 bin on a page. **Expected:** it disappears at once with a "Page N removed · Undo" message. Press **Undo**: the page comes back in the same place.
- [ ] Try to reload the browser tab. **Expected:** the browser warns you'll lose changes. Cancel the reload.
- [ ] Switch to **History** and back to **Scan**. **Expected:** your pages are still there.

## 6. Review, OCR and PDF

- [ ] **Review & save**. **Expected:** step 4, page thumbnails in order, Title box filled with "Scan <today's date>".
- [ ] Empty the Title box. **Expected:** **Create and save PDF** is greyed out.
- [ ] Type a title, press **Create and save PDF**. **Expected:** a progress card ("Reading the text on 3 pages…", a moving bar and a seconds counter), then a green success card "Saved to history", Download/Open buttons, and **Recognised text** with one tab per page.
- [ ] Switch page tabs; press **Copy** and paste somewhere. **Expected:** the button briefly shows "Copied" and the page text pastes. **Copy all** copies every page.
- [ ] Compare the text with the paper. **Expected:** typed text is mostly right; note mistakes (0/O, 1/l are common).
- [ ] Do the same with the **handwritten note**. **Expected:** poor or no text, and "No text was found on this page" if empty. That's honest, not a bug.
- [ ] Under **Download as**, check the cards: **PDF** (marked Recommended), **Word**, **Text** and **Images (ZIP · 3 images)**.
- [ ] Download each one. **Expected:** files named after your title. The Word file opens in Word/Pages/Google Docs and shows each scanned page as a picture, with its recognised text below to edit; the Text file shows `--- Page N ---` sections; the ZIP holds `<title> - page 01.jpg`, `02`, `03`.
- [ ] Save a scan of a **single** page. **Expected:** the image card says **Image · JPG** (Color) or **PNG** (Black & white) and downloads one image, not a ZIP.
- [ ] Save a scan of a **blank** page. **Expected:** only PDF and Image are offered, with a note that no text was recognised.
- [ ] Open the PDF. **Expected:** 3 pages in the order 1, 2, 3, each roughly A4-sized.
- [ ] In the PDF, press Cmd+F (phone: the viewer's search) and search a word you can see. **Expected:** it's found and highlighted in the right place.
- [ ] Select and copy a line of text from the PDF. **Expected:** you can paste the words.
- [ ] **Phone:** tapping a format card saves or opens the file; **Open PDF** shows the PDF in the browser.
- [ ] Stop Terminal 1, then press **Create and save PDF** on a new scan. **Expected:** a red error message, not a frozen screen. Start Terminal 1 again.

## 7. History

- [ ] **History** tab. **Expected:** grey placeholder cards for a moment, then your saved scans, newest first, with thumbnail, title, a friendly date ("Just now", "5 minutes ago"; hover for the exact time) and page count.
- [ ] Search a word from a **title**. **Expected:** only matching scans.
- [ ] Search a word that only appears in a page's **text**. **Expected:** the scan is found, with a snippet where the word is highlighted in yellow. The ✕ in the search box clears it.
- [ ] Search `zzz`. **Expected:** "No matches" with a suggestion to try another word.
- [ ] The ⬇ download icon on a card. **Expected:** downloads that scan's PDF.
- [ ] Open a scan. **Expected:** title, date and page chips, download buttons, page thumbnails, text.
- [ ] Tap a page thumbnail. **Expected:** a full-screen viewer; swipe (phone) or arrow keys/buttons (desktop) move between pages; **Original** shows the photo; ✕ or Esc closes it.
- [ ] **Delete**. **Expected:** a pop-up "Delete this scan?"; Cancel keeps it; Delete removes it, shows a message, and returns to the list.
- [ ] Stop and restart Terminal 1, reload the page. **Expected:** remaining scans are still listed (they're saved in SQLite).
- [ ] Check the database directly:

  ```bash
  sqlite3 backend/data/scanner.db "SELECT title, created_at, page_count FROM scans;"
  ```

  **Expected:** one line per scan still in History; the deleted one is gone.

## 8. Look and feel

- [ ] **Phone, portrait:** every button is easy to tap; text is readable without zooming; nothing is cut off; the bottom tab bar doesn't cover any buttons, and is hidden while you edit a page.
- [ ] Screens fade in smoothly. With "Reduce motion" turned on in the phone/computer settings, animations are switched off.
- [ ] **Phone, landscape:** the corner screen still fits; you can reach the buttons by scrolling.
- [ ] **Desktop, narrow window and wide window:** layout stays centred and tidy.
- [ ] Every error you saw in this list was a readable sentence, never a raw code or blank screen.

## 9. Things that are expected *not* to work in this version

Don't report these as bugs. Say them honestly in your project report:

- No user accounts: everyone who can open the app sees and can delete every scan.
  A public deployment needs sign-in, with each scan belonging to one user,
  before storing real people's documents.
- Page detection can fail (white on white, folded pages, corner outside the photo).
  The fix is the manual corner adjustment.
- OCR is English-only and makes mistakes, especially with handwriting.
- Curled or folded pages can't be perfectly flattened with four corners.
- No live camera preview. The phone's own camera app is used through a file input.
- Pages that are being built are lost if the tab is closed before saving.

---

## Results summary

| Section | Mac Chrome | Mac Safari | iPhone Safari | Android Chrome |
|---------|-----------|------------|---------------|----------------|
| 1 Opening | | | | |
| 2 Adding a page | | | | |
| 3 Corners | | | | |
| 4 Page result | | | | |
| 5 Multiple pages | | | | |
| 6 Review / OCR / PDF | | | | |
| 7 History | | | | |
| 8 Look and feel | | | | |

Write ✓ (all good), ✗ (problem — note it), or – (not tested).
