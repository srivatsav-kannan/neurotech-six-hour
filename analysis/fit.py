"""Fit one matrix from GPT-2 to fMRI and test what it can do.

Data: Pereira et al. (2018), 384-sentence experiment, language-network voxels as packaged
by Brain-Score. Ridge regression with five folds split by passage, so a test sentence never
shares a passage with any training sentence.

usage: python fit.py assy_Pereira2018_language.nc emb.npy <site dir>
"""
import json
import sys

import numpy as np
import xarray as xr
from PIL import Image
from sklearn.linear_model import RidgeCV
from sklearn.model_selection import GroupKFold
from sklearn.preprocessing import StandardScaler

LAYER, EXP, MAIN, OTHER = 8, "384sentences", "426", "289"

ds = xr.open_dataset(sys.argv[1])
emb = np.load(sys.argv[2])
site = sys.argv[3]
rng = np.random.default_rng(0)

data, subj, exp = ds.data.values, ds.subject.values, ds.experiment.values
rows = exp == EXP
sent = ds.sentence.values[rows]
passage = ds.passage_label.values[rows]
topic = ds.passage_category.values[rows]
X = emb[rows, LAYER]
n = len(sent)
folds = list(GroupKFold(5).split(X, groups=passage))


def voxels(s):
    v = np.where(subj == s)[0]
    return v[~np.isnan(data[np.ix_(rows, v)]).any(0)]


def ridge(A, B, alphas):
    sa, sb = StandardScaler().fit(A), StandardScaler().fit(B)
    return sa, sb, RidgeCV(alphas=alphas).fit(sa.transform(A), sb.transform(B))


def encode(Y):
    """held-out brain predictions from GPT-2"""
    P = np.zeros_like(Y)
    for tr, te in folds:
        sa, sb, m = ridge(X[tr], Y[tr], np.logspace(0, 5, 11))
        P[te] = sb.inverse_transform(m.predict(sa.transform(X[te])))
    return P


def decode(Y):
    """held-out GPT-2 vectors read back out of the brain"""
    D = np.zeros((n, X.shape[1]))
    for tr, te in folds:
        sa, _, m = ridge(Y[tr], X[tr], np.logspace(1, 6, 11))
        D[te] = m.predict(sa.transform(Y[te]))
    return D


def colcorr(A, B):
    A, B = A - A.mean(0), B - B.mean(0)
    return (A * B).sum(0) / np.sqrt((A ** 2).sum(0) * (B ** 2).sum(0) + 1e-12)


def zcols(A):
    return (A - A.mean(0)) / (A.std(0) + 1e-9)


def zrows(A):
    return (A - A.mean(1, keepdims=True)) / A.std(1, keepdims=True)


def similarity(A, B):
    return zrows(A) @ zrows(B).T / A.shape[1]


def pairwise(S):
    """how often the right sentence beats a random other one"""
    return float((np.diag(S)[:, None] > S).sum() / (n * (n - 1)))


subjects = [s for s in np.unique(subj) if len(voxels(s))]
Y = {s: data[np.ix_(rows, voxels(s))] for s in subjects}
P = {s: encode(Y[s]) for s in subjects}
r = {s: colcorr(P[s], Y[s]) for s in subjects}

Xz = StandardScaler().fit_transform(X)
dec = {s: decode(Y[s]) for s in subjects}
S_all = similarity(decode(np.hstack([Y[s] for s in subjects])), Xz)
rank_all = (S_all > np.diag(S_all)[:, None]).sum(1)

pred_mean = np.mean([zcols(P[s]).mean(1) for s in subjects], 0)
act_mean = np.mean([zcols(Y[s]).mean(1) for s in subjects], 0)

S_b2b = similarity(dec[MAIN], dec[OTHER])

# the matrix itself, fit on all 384 sentences for one participant
vM = voxels(MAIN)
sa, sb, m = ridge(X, Y[MAIN], np.logspace(0, 5, 11))
W = m.coef_.T.astype(np.float32)  # 768 GPT-2 features x voxels
np.save(f"{site}/W.npy", W)

lim = np.percentile(np.abs(W), 99)
t = np.clip(W / lim, -1, 1)[..., None]
paper, pos, neg = np.array([244, 239, 228]), np.array([123, 45, 38]), np.array([31, 61, 90])
img = np.where(t > 0, paper + (pos - paper) * t, paper + (neg - paper) * -t).astype(np.uint8)
Image.fromarray(img).quantize(colors=32).save(f"{site}/W.png", optimize=True)

top_vox = np.argsort(-r[MAIN])[:40]
top_dim = np.argsort(-np.abs(W[:, top_vox]).sum(1))[:24]
show = sorted(int(rng.choice(np.where(topic == tp)[0])) for tp in np.unique(topic))
zY, zP = zcols(Y[MAIN]), zcols(P[MAIN])
q = lambda A, scale: np.clip(np.round(np.asarray(A) / scale * 99), -99, 99).astype(int).tolist()
coords = np.stack([ds[f"col_to_coord_{k}"].values[vM] for k in (1, 2, 3)], 1)
roi = ds.roi.values[vM]

out = {
    "layer": LAYER, "n": n, "subjects": len(subjects), "w_shape": list(W.shape),
    "r_main": round(float(np.median(r[MAIN])), 3),
    "r_mean": round(float(np.mean([np.median(r[s]) for s in subjects])), 3),
    "sentences": sent.tolist(),
    "ap": coords[:, 1].tolist(), "si": coords[:, 2].tolist(),
    "left": [int(x.startswith("LH")) for x in roi],
    "r": q(r[MAIN], 0.6),
    "w_slice": q(W[np.ix_(top_dim, top_vox)], np.abs(W[np.ix_(top_dim, top_vox)]).max()),
    "w_rows": top_dim.tolist(), "w_cols": top_vox.tolist(),
    "show": show,
    "x": {i: q(Xz[i, top_dim], 3) for i in show},
    "actual": {i: q(zY[i], 3) for i in show},
    "pred": {i: q(zP[i], 3) for i in show},
    "pattern_r": {i: round(float(np.corrcoef(zY[i], zP[i])[0, 1]), 2) for i in show},
    "dec_pairwise": round(pairwise(S_all), 3),
    "dec_pairwise_each": [round(pairwise(similarity(dec[s], Xz)), 3) for s in subjects],
    "dec_rank": {i: int(rank_all[i]) for i in show},
    "dec_top": {i: np.argsort(-S_all[i])[:3].tolist() for i in show},
    "insilico_pred": np.round(pred_mean, 3).tolist(),
    "insilico_act": np.round(act_mean, 3).tolist(),
    "insilico_r": round(float(np.corrcoef(pred_mean, act_mean)[0, 1]), 3),
    "b2b_pairwise": round(pairwise(S_b2b), 3),
}
json.dump(out, open(f"{site}/data.json", "w"), separators=(",", ":"))
print({k: out[k] for k in ["r_main", "r_mean", "dec_pairwise", "insilico_r", "b2b_pairwise", "w_shape"]})
