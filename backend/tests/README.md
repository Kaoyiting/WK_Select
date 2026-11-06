# Backend tests

Tests recreate every table before each test. Run them only against a dedicated
database whose name ends in `_test`.

Set both explicit test settings before running pytest. `conftest.py` validates
them before creating the SQLAlchemy engine, then replaces `DATABASE_URL` with
`TEST_DATABASE_URL` so an unrelated application URL cannot be used by mistake.

PowerShell example:

```powershell
$env:TESTING = "true"
$env:TEST_DATABASE_URL = "postgresql+psycopg://wk:replace-me@localhost:55439/wk_select_new_test"
python -m pytest
```

Do not point `TEST_DATABASE_URL` at a development, staging, or production
database. The test fixture runs `drop_all()` and `create_all()`.
