from app.core.exceptions import fail


def apply_request(row, payload, editing):
    if editing and row.version != payload.expected_version:
        fail("VERSION_CONFLICT", "需求已修改，請重新載入", 409)
    allowed = {
        "pending": {"pending", "purchasing", "unavailable", "closed"},
        "purchasing": {"purchasing", "arrived", "unavailable", "closed"},
        "arrived": {"arrived", "closed"},
        "unavailable": {"unavailable", "closed"},
        "closed": {"closed"},
    }
    if editing and payload.status not in allowed[row.status]:
        fail("INVALID_TRANSITION", "不允許的需求狀態", 409)
    for key, value in payload.model_dump(exclude={"expected_version"}).items():
        setattr(row, key, value)
    row.version = (row.version or 0) + 1
