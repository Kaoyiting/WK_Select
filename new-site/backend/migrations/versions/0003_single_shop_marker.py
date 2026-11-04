"""Reserve a fixed shop identifier without enabling multi-shop operation."""
from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None
TABLES = (
    "admin_accounts", "admin_login_attempts", "assets", "audit_logs",
    "catalog_entries", "idempotency_records", "members", "navigation_items",
    "products", "sessions", "site_content", "customers", "orders",
    "product_variants", "order_items", "payments", "purchase_requests", "shipments",
)


def upgrade():
    for table in TABLES:
        op.execute(f"ALTER TABLE {table} ADD COLUMN tenant_id VARCHAR(36) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'")
        op.execute(f"CREATE INDEX ix_{table}_tenant_id ON {table}(tenant_id)")


def downgrade():
    raise RuntimeError("Restore into an isolated database instead of dropping shop markers")
