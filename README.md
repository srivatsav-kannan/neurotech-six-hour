# Neurotech & BCI

Our submission for the 6 Hour Challenge (Neurotech and BCI track, 24 October 2026). We answered two of the track's four questions:

- **III.** Parts of the brain map linearly to LLM activations. How can LLMs improve neural decoding and our understanding of the brain?
- **IV.** Biohybrid implants, connectomics, human brain stimulation: which research development has the most promise?

Live site: https://srivatsav-kannan.github.io/neurotech-six-hour/

## The site

The site is a single static page with four tabs and no build step.

- **Overview** sets out our argument: the biggest near-term gains in neurotechnology will come from the software, data and access that make existing devices work for more people.
- **Most promising field** (question IV) compares biohybrid implants, connectomics and brain stimulation on six criteria. Brain stimulation comes first under every weighting we tried.
- **LLMs and the brain** (question III) is an interactive demo. You type a sentence, a small language model running in your browser turns it into 384 numbers, and a matrix fit on real fMRI data turns those numbers into predicted activity across one person's language network.
- **What to build** turns both answers into openings for new companies.

## How the page III demo works

The brain data comes from Pereira et al. (2018), where participants read short sentences in an MRI scanner. We use the 384-sentence experiment and the language-network voxels that MIT's Brain-Score packages, for participant 426 (1,357 voxels).

1. Each sentence goes through MiniLM (`all-MiniLM-L6-v2`), which gives 384 numbers per sentence. The page runs the same quantized ONNX model in the browser with transformers.js, so a typed sentence goes through exactly the model W was fit on.
2. W is a ridge regression from those 384 numbers to every voxel, fit on all 384 sentences.
3. For a sentence, the page multiplies its numbers by W and draws the result on a side view of the MNI152 template brain.

The eight example sentences are ones participant 426 read in the scanner, so the page can show their measured scan next to W's. They are sentences W was fit on, chosen because their scans come out clearly. On sentences W has not seen (five-fold cross-validation, split by passage), its predictions correlate with the measured voxels at a median of 0.16 for participant 426 and 0.08 averaged over the nine participants. Single-sentence fMRI is noisy, so these numbers are modest. `analysis/evaluate.py` reproduces them.

The order in which brain areas light up in step 2 of the demo is an illustration based on published reading studies, not something computed from this dataset.

## Rebuilding the page III data

The scripts in `analysis/` rebuild `model.json`, `W.bin`, `brain.json` and `brain_left.png` from the public data. With the pinned versions below, the outputs match the committed files byte for byte (checked with Python 3.12 on macOS).

```bash
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r analysis/requirements.txt
python analysis/get_data.py data
python analysis/embed_minilm.py data/assy_Pereira2018_language.nc data/emb_minilm.npy
python analysis/fit_minilm.py data/assy_Pereira2018_language.nc data/emb_minilm.npy .
python analysis/render_brain.py .
python analysis/evaluate.py data/assy_Pereira2018_language.nc data/emb_minilm.npy
```

| Script | What it does |
|---|---|
| `get_data.py` | Downloads the Pereira data from Brain-Score and checks its SHA-1 |
| `embed_minilm.py` | Turns every sentence into MiniLM's 384 numbers |
| `fit_minilm.py` | Fits W for participant 426 and writes `W.bin` and `model.json` |
| `render_brain.py` | Renders the brain image and writes `brain.json` |
| `evaluate.py` | Reports how well W predicts sentences it was not fit on |

## Files

| Path | What it is |
|---|---|
| `index.html` | The whole site: layout, the Overview, III and What to build tabs, and the page III demo |
| `iv.js`, `iv.css`, `iv-content.json` | The Most promising field tab. `iv.js` draws it from `iv-content.json` |
| `model.json` | For page III: the mean and spread used to scale MiniLM's numbers, voxel positions, and the example sentences |
| `W.bin` | W as 8-bit integers (384 × 1,357), with per-voxel scales in `model.json` |
| `brain_left.png`, `brain.json` | The brain image and the numbers that place voxels on it |
| `tms-demo/` | A standalone page on timing TMS pulses to the brain's mu rhythm, cited on page IV |
| `analysis/` | The scripts that build the page III data |

## Running it locally

The pages load their data with `fetch`, which browsers block when `index.html` is opened straight from disk. Serve the folder instead:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000. GitHub Pages serves it as is.

## Editing page IV

All of page IV's words, ratings, chart numbers and sources live in `iv-content.json`, so content changes go there rather than in `iv.js`.

- **Ratings** are under `scorecard`, by field and criterion (`c1` to `c6`). They run from 1 to 5, higher is more promising, and for risk (`c6`) higher means less risk. Update the one-line `rationale` when you change a rating. Weighted scores and rankings recompute on their own.
- **Evidence** is under `fields`, one slide per criterion. Each item has `text`, `group`, an optional `qualifier` such as "Preprint", and `sourceIds`.
- **Sources**: every id in `sourceIds` must exist in the `sources` list at the end of the file. Citation numbers and the reference list are generated automatically.
- Use straight quotes in the JSON; the page turns them into curly ones. If the JSON breaks, page IV shows an error and the browser console says where.

## TMS timing demo

`tms-demo/index.html` shows a small neural network that predicts the motor cortex's mu rhythm from scalp EEG, so a TMS pulse could land on the wave's trough. It runs on recorded EEG from BCI Competition IV data set 2a, not live stimulation. `tms-demo/data.js` was generated by a separate model project that is not in this repository.

## Data and credits

- Pereira et al. (2018), *Toward a universal decoder of linguistic meaning from brain activation*, Nature Communications. Language-network voxels as packaged by [Brain-Score](https://www.brain-score.org/).
- MiniLM (`sentence-transformers/all-MiniLM-L6-v2`), run through the ONNX conversion `Xenova/all-MiniLM-L6-v2` and [transformers.js](https://github.com/xenova/transformers.js).
- The MNI152 template brain, loaded with [nilearn](https://nilearn.github.io/).
- BCI Competition IV, data set 2a (Graz University of Technology), for the TMS demo.
- Page IV's sources are listed at the bottom of that tab.

## Team

Tyler Jing-Wei Chang, Ryan Yuejia Shi, Nia Haydn D'Souza Ganapathy, Sanjana Kalla Dharmakumar, Srivatsav Kannan
