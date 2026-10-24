"""Fit W from MiniLM sentence vectors to one person's fMRI, and export it for the page.

Data: Pereira et al. (2018), 384-sentence experiment, language-network voxels as packaged
by Brain-Score, participant 426. W is a ridge regression from the 384 MiniLM numbers to
every voxel, fit on all 384 sentences.

usage: python fit_minilm.py assy_Pereira2018_language.nc emb_minilm.npy <site dir>
"""
import json
import sys

import numpy as np
import xarray as xr
from sklearn.linear_model import RidgeCV

SUBJECT, EXP, N_EXAMPLES = "426", "384sentences", 8
# the page's examples skip sentences on violent or stereotyped topics
AVOID = ("woman", "murder", "kill", "crime", "stereotyp", "weapon", "war")

ds = xr.open_dataset(sys.argv[1])
emb = np.load(sys.argv[2])
site = sys.argv[3]

data, subj, exp = ds.data.values, ds.subject.values, ds.experiment.values
rows = exp == EXP
v = np.where(subj == SUBJECT)[0]
v = v[~np.isnan(data[np.ix_(rows, v)]).any(0)]
v = v[data[np.ix_(rows, v)].std(0) > 0]
X = emb[rows]
Y = data[np.ix_(rows, v)]
sent = ds.sentence.values[rows]
topic = ds.passage_category.values[rows]

mu, sd = X.mean(0), X.std(0)
sd[sd == 0] = 1
Xs, Ys = (X - mu) / sd, (Y - Y.mean(0)) / Y.std(0)

m = RidgeCV(alphas=np.logspace(0, 5, 11)).fit(Xs, Ys)
W = m.coef_.T  # 384 MiniLM numbers x voxels
scale = np.abs(W).max(0) / 127
np.round(W / scale).astype(np.int8).tofile(f"{site}/W.bin")

# examples: short sentences from different topics where the scan comes out clearest
P = m.predict(Xs)
match = np.array([np.corrcoef(P[i], Ys[i])[0, 1] for i in range(len(sent))])
examples, seen = [], set()
for i in np.argsort(-match):
    if topic[i] in seen or len(sent[i]) > 80 or any(w in sent[i].lower() for w in AVOID):
        continue
    seen.add(topic[i]); examples.append(int(i))
    if len(examples) == N_EXAMPLES:
        break

# measured scans are stored as small integers: z-scores scaled so that 3 maps to 127
q = lambda a: np.clip(np.round(np.asarray(a) / 3 * 127), -127, 127).astype(int).tolist()
c = np.stack([ds[f"col_to_coord_{k}"].values[v] for k in (1, 2, 3)], 1)
out = {
    "subject": SUBJECT, "n_vox": int(len(v)), "dims": int(X.shape[1]),
    "mu": np.round(mu, 6).tolist(), "sd": np.round(sd, 6).tolist(),
    "intercept": np.round(m.intercept_, 4).tolist(), "w_scale": np.round(scale, 7).tolist(),
    # SPM 2 mm box: x runs right to left, z starts at -50 mm
    "x": (78 - 2 * (c[:, 0] - 1)).tolist(), "y": (-112 + 2 * (c[:, 1] - 1)).tolist(), "z": (-50 + 2 * (c[:, 2] - 1)).tolist(),
    "examples": [{"text": str(sent[i]).strip(), "emb": np.round(X[i], 5).tolist(), "measured": q(Ys[i])} for i in examples],
}
with open(f"{site}/model.json", "w") as f:
    json.dump(out, f, separators=(",", ":"))
print(f"wrote {site}/W.bin and {site}/model.json")
for i in examples:
    print(f"  example: {sent[i].strip()}")
