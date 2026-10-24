"""Download the Pereira et al. (2018) language-network data packaged by Brain-Score.

The file is checked against the SHA-1 that Brain-Score publishes for it.

usage: python get_data.py <data dir>
"""
import hashlib
import sys
import urllib.request
from pathlib import Path

URL = "https://brainscore-storage.s3.amazonaws.com/brainscore-language/assy_Pereira2018_language.nc"
SHA1 = "f8434b4022f5b2c862f0ff2854d5b3f5f2a7fb96"

out = Path(sys.argv[1]) / "assy_Pereira2018_language.nc"
out.parent.mkdir(parents=True, exist_ok=True)
if not out.exists():
    urllib.request.urlretrieve(URL, out)
digest = hashlib.sha1(out.read_bytes()).hexdigest()
if digest != SHA1:
    sys.exit(f"checksum mismatch for {out}: {digest}")
print(out)
