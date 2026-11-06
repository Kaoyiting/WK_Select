"""Anonymous half-hour deduplicated product views."""
from alembic import op
import sqlalchemy as sa
revision="0008"
down_revision="0007"
branch_labels=None
depends_on=None
def upgrade():
    op.create_table("product_views",sa.Column("id",sa.String(36),primary_key=True),sa.Column("tenant_id",sa.String(36),nullable=False,server_default="00000000-0000-0000-0000-000000000001"),sa.Column("product_id",sa.String(36),sa.ForeignKey("products.id"),nullable=False),sa.Column("visitor_hash",sa.String(64),nullable=False),sa.Column("window",sa.BigInteger(),nullable=False),sa.UniqueConstraint("product_id","visitor_hash","window"))
    op.create_index("ix_product_views_product_id","product_views",["product_id"])
def downgrade():
    op.drop_table("product_views")
