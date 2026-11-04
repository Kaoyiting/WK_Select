"""Non-destructive restore drill into a NEW *_restore_* database, never the live DB."""

import argparse
import hashlib
import json
import subprocess
import tarfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("backup_directory", type=Path)
    args = parser.parse_args()
    folder = args.backup_directory.resolve()
    manifest = json.loads((folder / "manifest.json").read_text())
    for name in ["database.dump", "uploads.tar"]:
        if hashlib.sha256((folder / name).read_bytes()).hexdigest() != manifest[name]:
            raise RuntimeError("Backup checksum mismatch: " + name)
    name = "wk_restore_" + datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    command = ["docker", "compose", "exec", "-T", "db"]
    subprocess.run(
        command + ["createdb", "-U", "wk_bootstrap", name], cwd=ROOT, check=True
    )
    subprocess.run(
        command
        + [
            "pg_restore",
            "-U",
            "wk_bootstrap",
            "-d",
            name,
            "--no-owner",
            "--exit-on-error",
        ],
        input=(folder / "database.dump").read_bytes(),
        cwd=ROOT,
        check=True,
    )
    subprocess.run(
        command
        + [
            "psql",
            "-U",
            "wk_bootstrap",
            "-d",
            name,
            "-c",
            "SELECT (SELECT COUNT(*) FROM products) AS products, (SELECT COUNT(*) FROM orders) AS orders, (SELECT COUNT(*) FROM admin_accounts) AS admins",
        ],
        cwd=ROOT,
        check=True,
    )
    with tarfile.open(folder / "uploads.tar") as archive:
        print("Local upload entries verified:", len(archive.getmembers()))
    print("Isolated database restored:", name)
    print(
        "Original/new-site active databases were not overwritten. No payment or notification jobs ran."
    )


if __name__ == "__main__":
    main()
