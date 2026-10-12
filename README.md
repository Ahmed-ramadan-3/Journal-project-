# دفتر اليومية — Arabic Accounting Journal Notebook

A personal, static, browser-only journal for accounting practice (Administrative Sciences students).
Vanilla HTML/CSS/JS. No build step, no backend, no login, no dependencies.

## Files
`index.html` · `styles.css` · `app.js` · `vercel.json` · `.gitignore` · `README.md`

## Run locally
Open `index.html` in a browser, or serve the folder:
```
python3 -m http.server 8000     # then open http://localhost:8000
```
Fonts (Amiri, Aref Ruqaa) load from Google Fonts; offline, the app falls back to system Arabic fonts.

## Build
None. The folder is the site.

## Deploy
**Vercel:** import the repository, Framework Preset = *Other*, Build Command empty, Output Directory `.` (root). `vercel.json` is optional.
**GitHub Pages:** push to GitHub → Settings → Pages → Deploy from branch → `main` / root. All paths are relative, so the repository base path (`/repo-name/`) works without changes.

## Using the notebook
- **قيد بسيط**: one debit (من حـ/) and one credit (له حـ/) line. **قيد متعدد**: add or remove any number of debit/credit lines. The header switch picks the mode for new entries; saved entries are never lost when switching.
- **البيان** is always written by you; placeholders are hints only.
- **حفظ كمسودة** saves anything (even incomplete or unbalanced). **حفظ كقيد مكتمل** requires every line filled, valid amounts, and total debit = total credit.
- Amounts accept Western or Arabic digits, up to 2 decimals, stored as integer hundredths (no floating-point errors). They are never altered to force a balance.
- Search (accounts + البيان), date range, sort, edit, duplicate (saved as draft), delete (with confirmation).

## Data privacy
Everything is stored in your browser's `localStorage` on this device only. Nothing is sent to any server and nothing is synced or backed up to the cloud. Clearing browser data deletes the notebook, so export regularly.

## Export / import
- **تصدير نسخة احتياطية (JSON)** → full backup. **تصدير CSV** → for spreadsheets (UTF-8 with BOM).
- **استيراد نسخة احتياطية** validates the whole file first; if anything is malformed, your existing data is untouched. A valid file replaces current entries only after you confirm.
- **حذف كل بيانات الدفتر** requires confirmation.

## Print / PDF
**طباعة / حفظ PDF** opens the browser print dialog (choose "Save as PDF"). The print stylesheet gives black-on-white, hides controls, repeats the header row on each page, avoids splitting an entry, and prints the title and selected date range.

## Notes
Educational tool, not professional accounting software. Dark mode is intentionally omitted to keep the paper look consistent.
