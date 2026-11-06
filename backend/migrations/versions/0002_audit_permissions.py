"""Keep the runtime account from changing historical audit entries."""
from alembic import op
revision="0002"
down_revision="0001"
branch_labels=None
depends_on=None


def upgrade():
    op.execute("REVOKE UPDATE, DELETE ON audit_logs FROM wk")


def downgrade():
    raise RuntimeError("Do not weaken audit permissions through downgrade")
