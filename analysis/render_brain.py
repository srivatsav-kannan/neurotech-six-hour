"""Side views of the MNI152 brain, shaded from its own surface, for drawing voxels on.

usage: python render_brain.py <site dir>
"""
import json
import sys

import numpy as np
from nilearn.datasets import load_mni152_brain_mask, load_mni152_template
from scipy.ndimage import binary_erosion, gaussian_filter
from PIL import Image, ImageFilter

SCALE = 2
site = sys.argv[1]

t = load_mni152_template(resolution=1)
vol = t.get_fdata()
aff = t.affine
brain = binary_erosion(load_mni152_brain_mask(resolution=1).get_fdata() > 0.5, iterations=2)


def side(from_left):
    xs = range(vol.shape[0]) if from_left else range(vol.shape[0] - 1, -1, -1)
    ny, nz = vol.shape[1], vol.shape[2]
    depth = np.full((ny, nz), np.nan)
    tone = np.zeros((ny, nz))
    for x in xs:
        hit = brain[x] & np.isnan(depth)
        depth[hit] = x if from_left else vol.shape[0] - 1 - x
        tone[hit] = vol[x][hit]
    mask = ~np.isnan(depth)
    d = gaussian_filter(np.where(mask, depth, np.nanmax(depth)), 1.0)
    # light from the front-top, shading from the depth gradient
    gy, gz = np.gradient(d)
    shade = np.clip(0.72 - 0.16 * gy - 0.22 * gz, 0, 1)
    tone = tone / np.percentile(tone[mask], 99)
    g = np.clip(0.7 * shade + 0.25 * tone + 0.05, 0, 1)
    # image rows run top to bottom (high z first); columns run front to back for the left view
    g, mask = g.T[::-1], mask.T[::-1]
    if from_left:
        g, mask = g[:, ::-1], mask[:, ::-1]
    paper = np.array([244, 239, 228]) / 255
    ink = np.array([38, 34, 30]) / 255
    g = g ** 1.7
    rgb = ink + (paper - ink) * (0.18 + 0.82 * g[..., None])
    img = np.dstack([rgb * 255, mask * 255]).astype(np.uint8)
    im = Image.fromarray(img, "RGBA").resize((img.shape[1] * SCALE, img.shape[0] * SCALE), Image.LANCZOS)
    return im.filter(ImageFilter.SMOOTH)


side(True).save(f"{site}/brain_left.png", optimize=True)

ny, nz = vol.shape[1], vol.shape[2]
geom = {
    "scale": SCALE, "w": ny * SCALE, "h": nz * SCALE,
    "y0": aff[1, 3], "z0": aff[2, 3], "step": aff[1, 1], "ny": ny, "nz": nz,
}
json.dump(geom, open(f"{site}/brain.json", "w"))
print(geom)
