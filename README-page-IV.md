# Page IV (Biohybrid implants, connectomics, brain stimulation)

Page IV lives in three files next to `index.html`:

| File | What it is | Who edits it |
|---|---|---|
| `iv-content.json` | All the words, ratings, chart numbers and sources for page IV | Anyone. This is where content changes go. |
| `iv.js` | Draws page IV from the JSON | Only if you're changing how the page works |
| `iv.css` | Page IV styles (reuses the colours and fonts in `index.html`) | Only for visual changes |

`index.html` only gained two lines for page IV: a `<link>` to `iv.css` in the `<head>` and a `<script src="iv.js">` at the bottom. Page III is untouched.

## Running it locally

Both page III (`data.json`) and page IV (`iv-content.json`) load data with `fetch`, which browsers block when you double-click `index.html`. From the repo folder run:

```
python3 -m http.server 8000
```

then open http://localhost:8000/#iv. GitHub Pages works with no changes.

## Editing content in iv-content.json

- **Ratings** are in `scorecard` → field → criterion (`c1`…`c6`). Ratings are 1–5, higher means more promising; for risk (`c6`), higher means lower risk. Update the one-line `rationale` when you change a number. The scorecard, weighted scores, ranking and the "holds under every lens" sentence all recompute automatically.
- **Evidence** is in `fields` → each field → `slides` (one per criterion, in order). Each item has `text`, `group`, optional `qualifier` (e.g. "Preprint"), and `sourceIds`.
- **Sources**: every id in `sourceIds` must exist in the `sources` list at the bottom of the file. Add new sources there first (real URL, and a `type` such as `peer-reviewed`, `preprint`, `company`, `news`). Citation numbers and the reference list are generated automatically.
- Use plain straight quotes in the JSON; the page converts them to curly quotes.
- If you break the JSON (missing comma, etc.), page IV shows an error message and the console says where. Paste the file into jsonlint.com to find the typo.

## Still to verify before submitting

- Market revenue figures were left out because they aren't linked to filings yet.
- Biohybrid "five engineering problems" list was left out until it has sources.
- Confirm Stanford SNT's FDA status (stimulation, criterion 2 readiness note).
