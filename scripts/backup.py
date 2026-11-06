"""Backup the NEW local Compose DB/uploads. Keep the resulting folder private/encrypted."""

import hashlib
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def backup():
    dest = ROOT / "backups" / datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    dest.mkdir(parents=True, exist_ok=False)
    dump = subprocess.check_output(
        [
            "docker",
            "compose",
            "exec",
            "-T",
            "db",
            "pg_dump",
            "-U",
            "wk_bootstrap",
            "-d",
            "wk_select_new",
            "-Fc",
        ],
        cwd=ROOT,
    )
    (dest / "database.dump").write_bytes(dump)
    # Local uploads are included; R2 requires the separate bucket backup plan in docs.
    images = subprocess.check_output(
        [
            "docker",
            "compose",
            "exec",
            "-T",
            "api",
            "tar",
            "-C",
            "/app/uploads",
            "-cf",
            "-",
            ".",
        ],
        cwd=ROOT,
    )
    (dest / "uploads.tar").write_bytes(images)
    manifest = {
        p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in dest.iterdir()
    }
    (dest / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf8")
    print("Backup created:", dest)
    print(
        "Contains private data. Encrypt and copy off-host; a local folder alone is not disaster recovery."
    )


if __name__ == "__main__":
    backup()
