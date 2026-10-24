"""Fit W from MiniLM sentence vectors to one person's fMRI, and export it for the page.

Data: Pereira et al. (2018), 384-sentence experiment, language-network voxels as packaged
by Brain-Score, participant 426. Ridge regression; held-out numbers use five folds split by
passage. The exported W is fit on all 384 sentences so the page can apply it to anything typed.

usage: python fit_minilm.py assy_Pereira2018_language.nc emb_minilm.npy <site dir>
"""
import json
import sys

import numpy as np
import xarray as xr
from sklearn.linear_model import RidgeCV
from sklearn.model_selection import GroupKFold

SUBJECT, EXP, N_EXAMPLES = "426", "384sentences", 8

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
passage = ds.passage_label.values[rows]
topic = ds.passage_category.values[rows]

mu, sd = X.mean(0), X.std(0)
sd[sd == 0] = 1  # one MiniLM dimension never changes
ym, ys = Y.mean(0), Y.std(0)
Xs, Ys = (X - mu) / sd, (Y - ym) / ys
alphas = np.logspace(0, 5, 11)

P = np.zeros_like(Ys)
for tr, te in GroupKFold(5).split(Xs, groups=passage):
    P[te] = RidgeCV(alphas=alphas).fit(Xs[tr], Ys[tr]).predict(Xs[te])
Pc, Yc = P - P.mean(0), Ys - Ys.mean(0)
r_vox = (Pc * Yc).sum(0) / np.sqrt((Pc ** 2).sum(0) * (Yc ** 2).sum(0))
r_sent = np.array([np.corrcoef(P[i], Ys[i])[0, 1] for i in range(len(sent))])
print("median voxel r %.3f, median sentence r %.3f" % (np.median(r_vox), np.median(r_sent)))

m = RidgeCV(alphas=alphas).fit(Xs, Ys)
W = m.coef_.T  # 384 MiniLM numbers x voxels, in standardised units
scale = np.abs(W).max(0) / 127
np.round(W / scale).astype(np.int8).tofile(f"{site}/W.bin")

# examples: the best-matching held-out sentence from different topics
examples, seen = [], set()
for i in np.argsort(-r_sent):
    if topic[i] in seen or len(sent[i]) > 80:
        continue
    seen.add(topic[i]); examples.append(int(i))
    if len(examples) == N_EXAMPLES:
        break

q = lambda a: np.clip(np.round(np.asarray(a) / 3 * 127), -127, 127).astype(int).tolist()
c = np.stack([ds[f"col_to_coord_{k}"].values[v] for k in (1, 2, 3)], 1)
out = {
    "subject": SUBJECT, "n_vox": int(len(v)), "dims": int(X.shape[1]),
    "alpha": float(m.alpha_), "r_vox": round(float(np.median(r_vox)), 3),
    "mu": np.round(mu, 6).tolist(), "sd": np.round(sd, 6).tolist(),
    "intercept": np.round(m.intercept_, 4).tolist(), "w_scale": np.round(scale, 7).tolist(),
    # SPM 2 mm box: x runs right to left, z starts at -50 mm
    "x": (78 - 2 * (c[:, 0] - 1)).tolist(), "y": (-112 + 2 * (c[:, 1] - 1)).tolist(), "z": (-50 + 2 * (c[:, 2] - 1)).tolist(),
    "examples": [{
        "text": str(sent[i]),
        "emb": np.round(X[i], 5).tolist(),
        "measured": q(Ys[i]), "predicted": q(P[i]), "r": round(float(r_sent[i]), 2),
    } for i in examples],
}
json.dump(out, open(f"{site}/model.json", "w"), separators=(",", ":"))
print([(e["text"], e["r"]) for e in out["examples"]])
