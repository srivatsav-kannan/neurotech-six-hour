"""How well W predicts brain activity for sentences it was not fit on.

Five-fold cross-validation split by passage, so a test sentence never shares a passage with
any training sentence. Reports the median correlation across voxels between predicted and
measured activity, for participant 426 (the one on the page) and averaged over everyone.

usage: python evaluate.py assy_Pereira2018_language.nc emb_minilm.npy
"""
import sys

import numpy as np
import xarray as xr
from sklearn.linear_model import RidgeCV
from sklearn.model_selection import GroupKFold

ds = xr.open_dataset(sys.argv[1])
emb = np.load(sys.argv[2])
data, subj, exp = ds.data.values, ds.subject.values, ds.experiment.values
rows = exp == "384sentences"
X = emb[rows]
folds = list(GroupKFold(5).split(X, groups=ds.passage_label.values[rows]))


def zscore(A):
    sd = A.std(0)
    return (A - A.mean(0)) / np.where(sd == 0, 1, sd)


medians = {}
for s in np.unique(subj):
    v = np.where(subj == s)[0]
    v = v[~np.isnan(data[np.ix_(rows, v)]).any(0)]
    v = v[data[np.ix_(rows, v)].std(0) > 0] if len(v) else v
    if not len(v):
        continue
    Y = zscore(data[np.ix_(rows, v)])
    P = np.zeros_like(Y)
    for tr, te in folds:
        P[te] = RidgeCV(alphas=np.logspace(0, 5, 11)).fit(zscore(X)[tr], Y[tr]).predict(zscore(X)[te])
    Pc, Yc = P - P.mean(0), Y - Y.mean(0)
    r = (Pc * Yc).sum(0) / np.sqrt((Pc ** 2).sum(0) * (Yc ** 2).sum(0))
    medians[s] = float(np.median(r))

for s, m in medians.items():
    print(f"participant {s}: median voxel r = {m:.3f}")
print(f"mean over {len(medians)} participants: {np.mean(list(medians.values())):.3f}")
