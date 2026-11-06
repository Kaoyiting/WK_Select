"""Reproducible local setup; never changes the original website or its storage."""

import json
import os
import secrets
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
os.chdir(ROOT)


def run(*args, input=None):
    return subprocess.run(args, input=input, text=True, check=True)


def main():
    env_file = ROOT / ".env"
    if not env_file.exists():
        env_file.write_text(
            "APP_ENV=local\nDB_PASSWORD="
            + secrets.token_hex(24)
            + "\nDB_ADMIN_PASSWORD="
            + secrets.token_hex(24)
            + "\nSESSION_SECRET="
            + secrets.token_hex(48)
            + "\nPUBLIC_ORIGIN=http://localhost:8089\nSTORAGE_BACKEND=local\n",
            encoding="utf8",
        )
    env = dict(
        line.split("=", 1)
        for line in env_file.read_text(encoding="utf8").splitlines()
        if "=" in line and not line.startswith("#")
    )
    if env.get("APP_ENV") != "local":
        raise RuntimeError("Local setup is forbidden outside APP_ENV=local")
    folder = ROOT / ".secrets"
    folder.mkdir(exist_ok=True)
    migration = folder / "migration_database_url"
    migration.write_text(
        "postgresql+psycopg://wk_bootstrap:"
        + env["DB_ADMIN_PASSWORD"]
        + "@db/wk_select_new",
        encoding="utf8",
    )
    run("docker", "compose", "build")
    run("docker", "compose", "up", "-d", "--wait", "db")
    run(
        "docker",
        "compose",
        "run",
        "--rm",
        "--volume",
        str(migration) + ":/run/secrets/migration_url:ro",
        "-e",
        "DATABASE_URL_FILE=/run/secrets/migration_url",
        "api",
        "alembic",
        "upgrade",
        "head",
    )
    count = subprocess.check_output(
        [
            "docker",
            "compose",
            "exec",
            "-T",
            "db",
            "psql",
            "-U",
            "wk_bootstrap",
            "-d",
            "wk_select_new",
            "-tAc",
            "SELECT COUNT(*) FROM products",
        ],
        text=True,
    ).strip()
    if count == "0":
        run(
            "docker", "compose", "run", "--rm", "api", "python", "-m", "app.cli", "seed"
        )
    credentials_file = folder / "local-admins.json"
    if not credentials_file.exists():
        credentials_file.write_text(
            json.dumps(
                [
                    {"username": "owner", "password": secrets.token_urlsafe(24)},
                    {"username": "helper", "password": secrets.token_urlsafe(24)},
                ],
                indent=2,
            ),
            encoding="utf8",
        )
    code = """
import json,sys
from sqlalchemy import select
from app.core.config import settings
from app.core.database import SessionLocal
from app.modules.auth.models import Admin
from app.core.security import password_hasher
assert settings().app_env == 'local'
with SessionLocal() as db:
    for row in json.load(sys.stdin):
        if not db.scalar(select(Admin).where(Admin.username == row['username'])):
            db.add(Admin(username=row['username'], password_hash=password_hasher.hash(row['password'])))
    db.commit()
print('Local admin accounts ready; existing passwords were not overwritten.')
"""
    run(
        "docker",
        "compose",
        "run",
        "--rm",
        "-T",
        "api",
        "python",
        "-c",
        code,
        input=credentials_file.read_text(encoding="utf8"),
    )
    run("docker", "compose", "up", "-d", "--wait")
    print("Local storefront: http://localhost:8089/#home")
    print("Local admin: http://localhost:8089/admin")
    print(
        "Local-only random admin credentials are in .secrets/local-admins.json (not committed)."
    )


if __name__ == "__main__":
    main()
