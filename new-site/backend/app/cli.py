"""One-off operations. Passwords are read interactively, never as command arguments."""

import argparse, getpass, json
from pathlib import Path
from sqlalchemy import select
from app.core.database import SessionLocal
from app.core.config import settings
from app.core.security import password_hasher
from app import models


def seed(db):
    folder = Path(settings().seed_dir)
    if db.scalar(select(models.Product.id).limit(1)):
        raise RuntimeError("Seed refused: products already exist")
    load = lambda name: json.loads(
        (folder / (name + ".json")).read_text(encoding="utf-8-sig")
    )
    navigation = load("store_menu_items")
    from app.modules.auth.models import uid

    mapping = {r["id"]: uid() for r in navigation}
    for r in navigation:
        db.add(
            models.Navigation(
                id=mapping[r["id"]],
                parent_id=mapping.get(r["parent_id"]),
                label=r["label"],
                action=r["action"],
                action_value=r["action_value"],
                placement=r["placement"],
                sort_order=r["sort_order"],
                enabled=bool(r["is_active"]),
            )
        )
    for kind, file in [("brands", "store_brands"), ("categories", "store_categories")]:
        for r in load(file):
            db.add(models.CatalogEntry(kind=kind, name=r["name"]))
    for r in load("products"):
        parse = lambda k: json.loads(r.get(k) or "[]")
        p = models.Product(
            legacy_id=r["id"],
            title=r["title"],
            brand=r["brand"],
            category=r["category"],
            country=r["country"],
            kind="stock" if r["type"] == "現貨" else "preorder",
            status=r["status"],
            badge=r["badge"],
            price_amount=r["price"],
            sale_amount=r["sale_price"],
            gallery=parse("gallery") or [r["img"]],
            description_html=r["description"],
            size_guide_html=r["size_guide"],
            date=r["date"],
        )
        db.add(p)
        db.flush()
        colors, sizes = parse("colors") or [""], parse("sizes") or [""]
        # Import only explicitly listed combinations when free-text variants contains them.
        combos = [(c, s) for c in colors for s in sizes]
        if r["id"] == 22:
            combos = [
                ("白色棕色愛心", "XS"),
                ("白色灰色愛心", "XS"),
                ("白色棕色愛心", "L"),
            ]
        for color, size in combos:
            db.add(
                models.Variant(
                    product_id=p.id,
                    color=color,
                    size=size,
                    stock_qty=0 if p.kind == "stock" else None,
                )
            )
    value = load("content")
    value.update(shippingFee=60, freeShippingThreshold=1800)
    db.add(models.SiteContent(key="main", value=value))
    db.commit()
    print(
        "Imported catalog/content only. No orders or members imported. Stock remains 0 pending owner confirmation."
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["seed", "admin", "reset-password"])
    parser.add_argument("--username")
    args = parser.parse_args()
    with SessionLocal() as db:
        if args.command == "seed":
            return seed(db)
        name = (args.username or input("Admin username: ")).strip().casefold()
        if not name or len(name) > 80:
            raise ValueError("Invalid username")
        password = getpass.getpass("Password (12+ characters): ")
        if len(password) < 12 or password != getpass.getpass("Confirm password: "):
            raise ValueError("Password confirmation failed")
        a = db.scalar(select(models.Admin).where(models.Admin.username == name))
        if args.command == "admin" and a:
            raise ValueError("Account already exists")
        if args.command == "reset-password" and not a:
            raise ValueError("Account not found")
        if not a:
            a = models.Admin(username=name)
            db.add(a)
        a.password_hash = password_hasher.hash(password)
        if a.id:
            from sqlalchemy import update

            db.execute(
                update(models.Session)
                .where(
                    models.Session.kind == "admin", models.Session.principal_id == a.id
                )
                .values(revoked=True)
            )
        db.commit()
        print("Admin saved. All admin accounts have equal permissions.")


if __name__ == "__main__":
    main()
