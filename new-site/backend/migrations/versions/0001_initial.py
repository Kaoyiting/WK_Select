"""Initial single-store schema; no legacy order/member migration."""

from alembic import op
from pathlib import Path

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    schema = Path(__file__).with_suffix(".sql").read_text(encoding="utf8")
    for statement in schema.split(";"):
        if statement.strip():
            op.execute(statement)


def downgrade():
    raise RuntimeError(
        "Destructive downgrade is disabled. Restore into an isolated database instead."
    )
