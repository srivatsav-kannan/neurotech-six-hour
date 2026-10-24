# TMS timing demo (linked from page IV)

A standalone page for question IV, styled with the same tokens and fonts as `index.html`. It is linked from page IV only through `iv-content.json`; no other existing file was changed.

| File | What it is |
|---|---|
| `index.html` | The demo page: interactive closed-loop player, results across 9 people, method, caveats, sources |
| `data.js` | Generated data: a 30 s recorded EEG clip from held-out subject 8, pulse times for each system delay (AR forecast vs our personalized model), and the 9-subject results. Loaded with a `<script>` tag, so the page also works when opened straight from disk. |

## Where page IV points to it

- `fields` → stimulation → criterion 5 slide: three "Our demo" evidence items plus a "The catch" item, and one caveat.
- `convergence.explanation`: one line under "when to stimulate".
- `sources`: `tms-phase-demo` (URL `tms-demo/index.html`, the link readers click), plus `zrenner2018-brs`, `shirinpour2020-jne`, `madsen2019-brs`, `bci-competition-iv-2a`.

`iv.js` renders JSON text only (no images or embeds), so the demo is reached through its entry in the page IV source list.

## Regenerating data.js

From the model project folder: `python export_web_demo.py path/to/tms-demo/data.js` (needs the trained weights in `results/`).
