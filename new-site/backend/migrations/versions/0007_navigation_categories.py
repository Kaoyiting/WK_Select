"""Backfill all named navigation category choices."""
from alembic import op
revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None
def upgrade():
    op.execute("""INSERT INTO catalog_entries (id, tenant_id, kind, name)
      SELECT gen_random_uuid()::text, '00000000-0000-0000-0000-000000000001', 'categories', category_name
      FROM (SELECT DISTINCT trim(COALESCE(NULLIF(action_value,''),label)) AS category_name
            FROM navigation_items WHERE action IN ('category','custom') AND (parent_id IS NOT NULL OR action_value <> '')) n
      WHERE category_name <> '' AND category_name !~ '^(https?:|/|#)'
      AND NOT EXISTS (SELECT 1 FROM catalog_entries c WHERE c.kind='categories' AND c.name=n.category_name)
      ON CONFLICT DO NOTHING""")
def downgrade():
    pass
