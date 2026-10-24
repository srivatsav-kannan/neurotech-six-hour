"""Sentence vectors from the same MiniLM file the web page runs in the browser.

Uses Xenova/all-MiniLM-L6-v2 (quantized ONNX), mean-pooled over tokens and L2-normalised,
which is what transformers.js does with pooling: 'mean', normalize: true.

usage: python embed_minilm.py assy_Pereira2018_language.nc emb_minilm.npy
"""
import sys

import numpy as np
import onnxruntime as ort
import xarray as xr
from huggingface_hub import hf_hub_download
from tokenizers import Tokenizer

REPO = "Xenova/all-MiniLM-L6-v2"
tok = Tokenizer.from_file(hf_hub_download(REPO, "tokenizer.json"))
tok.no_padding()
tok.no_truncation()
sess = ort.InferenceSession(hf_hub_download(REPO, "onnx/model_quantized.onnx"))
inputs = {i.name for i in sess.get_inputs()}

sent = xr.open_dataset(sys.argv[1]).sentence.values
out = np.zeros((len(sent), 384), dtype=np.float32)
for i, s in enumerate(sent):
    enc = tok.encode(s)
    feed = {
        "input_ids": np.array([enc.ids], dtype=np.int64),
        "attention_mask": np.array([enc.attention_mask], dtype=np.int64),
        "token_type_ids": np.array([enc.type_ids], dtype=np.int64),
    }
    hidden = sess.run(None, {k: v for k, v in feed.items() if k in inputs})[0][0]
    v = hidden.mean(0)
    out[i] = v / np.linalg.norm(v)
np.save(sys.argv[2], out)
