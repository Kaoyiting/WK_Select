"""ATM test order integration and server payment deadlines."""
from alembic import op
import sqlalchemy as sa
revision="0012"
down_revision="0011"
branch_labels=None
depends_on=None

def upgrade():
    op.add_column("orders",sa.Column("is_test",sa.Boolean(),nullable=False,server_default=sa.false()))
    op.add_column("orders",sa.Column("payment_deadline",sa.DateTime(timezone=True),nullable=True))
    op.create_index("ix_orders_payment_deadline","orders",["payment_deadline"])
    op.add_column("atm_sandbox_transactions",sa.Column("submitted_at",sa.DateTime(timezone=True),nullable=True))
    op.alter_column("atm_sandbox_transactions","admin_id",nullable=True)
    op.add_column("atm_sandbox_transactions",sa.Column("order_id",sa.String(36),sa.ForeignKey("orders.id"),nullable=True))
    op.create_unique_constraint("uq_atm_sandbox_order","atm_sandbox_transactions",["order_id"])

def downgrade():
    op.drop_column("atm_sandbox_transactions","submitted_at")
    op.drop_constraint("uq_atm_sandbox_order","atm_sandbox_transactions",type_="unique")
    op.drop_column("atm_sandbox_transactions","order_id")
    op.drop_index("ix_orders_payment_deadline",table_name="orders")
    op.drop_column("orders","payment_deadline")
    op.drop_column("orders","is_test")
