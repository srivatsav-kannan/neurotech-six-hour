# TMS timing demo (on the What to build page)

The interactive demo appears on the What to build page, and a fuller standalone write-up lives in this folder.

| File | What it is |
|---|---|
| `player.js` | The interactive player (delay buttons, EEG strips, landing dials). Shared by the site and `index.html` here. Styles are prefixed `tms-` and use the site's colour tokens. |
| `data.js` | Generated data: a 30 s recorded EEG clip from held-out subject 8, pulse times for each system delay (AR forecast vs our personalized model), and the 9-subject results. |
| `index.html` | Standalone page: the same player plus headline numbers, the latency chart, method, caveats and sources. Linked from the What to build page. |

## How the site shows it

- The section and its wording live in `index.html`, on the What to build page (`<section id="tms">`).
- A small script at the bottom of `index.html` loads `data.js` and `player.js` the first time that page is opened and mounts the player. The player only animates while it is on screen.
- Stimulation criterion 5 has three "Our demo" evidence items, a counterpoint (Madsen 2019) and a caveat. The convergence section has one line on timing. All cite sources added at the end of `sources`.

## Regenerating data.js

From the model project folder: `python export_web_demo.py path/to/tms-demo/data.js` (needs the trained weights in `results/`).
