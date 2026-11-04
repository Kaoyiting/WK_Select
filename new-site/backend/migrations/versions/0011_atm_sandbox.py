"""Isolated ATM sandbox transactions; never real orders."""
from alembic import op
import sqlalchemy as sa
revision = "0011"
down_revision = "0010"
branch_labels = None
depends_on = None

def upgrade():
    op.create_table("atm_sandbox_transactions",
        sa.Column("id",sa.String(36),primary_key=True),
        sa.Column("tenant_id",sa.String(36),nullable=False,server_default="00000000-0000-0000-0000-000000000001"),
        sa.Column("admin_id",sa.String(36),sa.ForeignKey("admin_accounts.id"),nullable=False),
        sa.Column("merchant_trade_no",sa.String(20),nullable=False,unique=True),
        sa.Column("amount",sa.BigInteger(),nullable=False),
        sa.Column("expire_days",sa.Integer(),nullable=False),
        *[sa.Column(k,sa.String(n),nullable=False) for k,n in [("status",30),("source",20),("provider_trade_no",30),("bank_code",3),("virtual_account",20),("expires_on",20)]],
        sa.Column("created_at",sa.DateTime(timezone=True),nullable=False),
        sa.Column("paid_at",sa.DateTime(timezone=True),nullable=True))
    op.create_index("ix_atm_sandbox_transactions_tenant_id","atm_sandbox_transactions",["tenant_id"])

def downgrade():
    op.drop_table("atm_sandbox_transactions")
