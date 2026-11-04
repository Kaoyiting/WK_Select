from app.core.exceptions import fail


def apply_customer(row, payload, editing=False):
    if editing and row.version != payload.expected_version:
        fail("VERSION_CONFLICT", "客戶資料已修改，請重新載入", 409)
    for key, value in payload.model_dump(exclude={"expected_version"}).items():
        setattr(row, key, value)
    row.version = (row.version or 0) + 1
    return row
