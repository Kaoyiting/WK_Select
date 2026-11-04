"""Optional member email/password credentials."""
from alembic import op
import sqlalchemy as sa
revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None

def upgrade():
    op.alter_column("members", "google_sub", existing_type=sa.String(255), nullable=True)
    op.add_column("members", sa.Column("login_email", sa.String(254), nullable=True))
    op.add_column("members", sa.Column("password_hash", sa.Text(), nullable=True))
    op.create_unique_constraint("uq_members_login_email", "members", ["login_email"])

def downgrade():
    op.drop_constraint("uq_members_login_email", "members", type_="unique")
    op.drop_column("members", "password_hash")
    op.drop_column("members", "login_email")
    # Keep google_sub nullable: password-only members have no Google identity.
