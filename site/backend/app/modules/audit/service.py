from .models import Audit


def record(db, principal, action, target_id="", detail=None):
    db.add(
        Audit(
            admin_id=principal.id if principal else None,
            action=action,
            target_id=target_id,
            detail=detail or {},
        )
    )
