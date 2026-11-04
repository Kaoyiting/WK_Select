import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
manifest = json.loads((ROOT / "new-site/data/original-manifest.json").read_text())
changed = [
    name
    for name, digest in manifest.items()
    if not (ROOT / name).is_file()
    or hashlib.sha256((ROOT / name).read_bytes()).hexdigest() != digest
]
if changed:
    raise SystemExit("Original files changed: " + ", ".join(changed))
print(f"PASS: {len(manifest)} original files unchanged.")
