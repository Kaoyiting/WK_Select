"""Optional photo-to-color association, entered by the shop administrator."""
from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TABLE products ADD COLUMN image_colors JSON NOT NULL DEFAULT '{}'::json")


def downgrade():
    raise RuntimeError("Do not discard photo associations through downgrade")
