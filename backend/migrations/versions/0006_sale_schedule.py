"""Optional sale schedule, stored as timezone-aware instants."""
from alembic import op
import sqlalchemy as sa
revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None
def upgrade():
    op.add_column("products", sa.Column("sale_starts_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("products", sa.Column("sale_ends_at", sa.DateTime(timezone=True), nullable=True))
def downgrade():
    op.drop_column("products", "sale_ends_at")
    op.drop_column("products", "sale_starts_at")
