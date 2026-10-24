"""GPT-2 vectors for every sentence in Pereira et al. (2018).

Each sentence is fed with the earlier sentences of its passage as context, the way
participants read them, and we average the hidden states over the sentence's own tokens.

usage: python embed.py assy_Pereira2018_language.nc emb.npy
"""
import sys

import numpy as np
import torch
import xarray as xr
from transformers import GPT2Model, GPT2TokenizerFast

ds = xr.open_dataset(sys.argv[1])
sent = ds.sentence.values
passage = ds.passage_label.values
exp = ds.experiment.values
stim_num = ds.stimulus_num.values

tok = GPT2TokenizerFast.from_pretrained("gpt2")
model = GPT2Model.from_pretrained("gpt2", output_hidden_states=True).eval()

emb = np.zeros((len(sent), 13, 768), dtype=np.float32)
ctx_key, ctx = None, ""
with torch.no_grad():
    for i in np.lexsort((stim_num, passage, exp)):
        key = (exp[i], passage[i])
        if key != ctx_key:
            ctx_key, ctx = key, ""
        start = len(tok(ctx)["input_ids"]) if ctx else 0
        full = (ctx + " " + sent[i]).strip()
        hidden = model(tok(full, return_tensors="pt")["input_ids"]).hidden_states
        for layer in range(13):
            emb[i, layer] = hidden[layer][0, start:].mean(0).numpy()
        ctx = full

np.save(sys.argv[2], emb)
