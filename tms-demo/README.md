# TMS timing demo

The demo is a standalone page in this folder. Page IV cites its results in stimulation criterion 5 and links to it from the sources.

| File | What it is |
|---|---|
| `player.js` | The interactive player (delay buttons, EEG strips, landing dials). Used by `index.html` here. Styles are prefixed `tms-` and use the site's colour tokens. |
| `data.js` | Generated data: a 30 s recorded EEG clip from held-out subject 8, pulse times for each system delay (AR forecast vs our personalized model), and the 9-subject results. |
| `index.html` | Standalone page: the same player plus headline numbers, the latency chart, method, caveats and sources. Linked from the page IV sources. |

## How the site uses it

- Stimulation criterion 5 has three "Our demo" evidence items, a counterpoint (Madsen 2019) and a caveat. The convergence section has one line on timing. All cite sources added at the end of `sources`.

## Regenerating data.js

From the model project folder: `python export_web_demo.py path/to/tms-demo/data.js` (needs the trained weights in `results/`).
