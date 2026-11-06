"""Order photo snapshots and a member preferred pickup store."""
from alembic import op
import sqlalchemy as sa
revision="0010"
down_revision="0009"
branch_labels=None
depends_on=None

def upgrade():
    op.add_column("order_items",sa.Column("image_url",sa.Text(),nullable=False,server_default=""))
    op.execute("UPDATE order_items SET image_url=COALESCE(p.gallery->>0,'') FROM products p WHERE p.id=order_items.product_id")
    op.add_column("customers",sa.Column("preferred_store",sa.JSON(),nullable=True))

def downgrade():
    op.drop_column("customers","preferred_store")
    op.drop_column("order_items","image_url")
