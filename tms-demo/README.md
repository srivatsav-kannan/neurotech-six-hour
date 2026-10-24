# TMS timing demo (top of page IV)

The interactive demo appears at the top of page IV, and a fuller standalone write-up lives in this folder.

| File | What it is |
|---|---|
| `player.js` | The interactive player (delay buttons, EEG strips, landing dials). Shared by page IV and `index.html` here. Styles are prefixed `tms-` and use the site's colour tokens. |
| `data.js` | Generated data: a 30 s recorded EEG clip from held-out subject 8, pulse times for each system delay (AR forecast vs our personalized model), and the 9-subject results. |
| `index.html` | Standalone page: the same player plus headline numbers, the latency chart, method, caveats and sources. Linked from page IV. |

## How page IV shows it

- `iv-content.json` has a `demo` block (kicker, heading, lede, notes, link to the full page, and the two scripts to load). Edit the words there. Delete the block to remove the demo from page IV.
- `iv.js` renders that block as the first section of page IV, loads `data.js` and `player.js`, and mounts the player. The player only animates while it is on screen.
- Stimulation criterion 5 has three "Our demo" evidence items, a counterpoint (Madsen 2019) and a caveat. The convergence section has one line on timing. All cite sources added at the end of `sources`.

## Regenerating data.js

From the model project folder: `python export_web_demo.py path/to/tms-demo/data.js` (needs the trained weights in `results/`).
