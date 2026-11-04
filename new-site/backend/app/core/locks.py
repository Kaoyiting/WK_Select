import hashlib
from sqlalchemy import text

def order_lock(db,order_id):
    key=int.from_bytes(hashlib.sha256(("order:"+order_id).encode()).digest()[:8],"big",signed=True)
    db.execute(text("SELECT pg_advisory_xact_lock(:key)"),{"key":key})
