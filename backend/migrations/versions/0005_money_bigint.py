"""Integer TWD amounts without 32-bit overflow on multi-item orders."""
from alembic import op

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None
COLUMNS = {
    "products": ("price_amount", "sale_amount"),
    "orders": ("subtotal_amount", "shipping_amount", "total_amount"),
    "order_items": ("unit_amount",),
    "payments": ("amount", "refunded_amount"),
}


def upgrade():
    for table, columns in COLUMNS.items():
        for column in columns:
            op.execute(f"ALTER TABLE {table} ALTER COLUMN {column} TYPE BIGINT")


def downgrade():
    raise RuntimeError("Do not narrow monetary columns or risk truncating historical amounts")
