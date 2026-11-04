from fastapi import HTTPException


def fail(code: str, message: str, status: int = 422):
    raise HTTPException(status, {"code": code, "message": message})
