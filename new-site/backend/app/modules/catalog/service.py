import bleach
from bleach.css_sanitizer import CSSSanitizer
from sqlalchemy import select
from app.core.exceptions import fail
from .models import Product, Variant


def clean_html(value):
    return bleach.clean(
        value,
        tags=[
            "p",
            "br",
            "h2",
            "h3",
            "h4",
            "strong",
            "b",
            "em",
            "i",
            "u",
            "s",
            "ul",
            "ol",
            "li",
            "blockquote",
            "a",
            "span",
            "img",
        ],
        attributes={"img": ["src", "alt"], "a": ["href", "title"], "span": ["style"], "p": ["style"], "h2": ["style"], "h3": ["style"]},
        css_sanitizer=CSSSanitizer(allowed_css_properties=["font-size", "font-weight", "text-align", "font-style", "text-decoration"]),
        protocols=["http", "https", "mailto"],
        strip=True,
    )


def active_sale(p):
    from datetime import datetime, timezone
    t = datetime.now(timezone.utc)
    return p.sale_amount is not None and (p.sale_starts_at is None or p.sale_starts_at <= t) and (p.sale_ends_at is None or t < p.sale_ends_at)


def product_data(p):
    return {
        **{
            k: getattr(p, k)
            for k in [
                "id",
                "legacy_id",
                "title",
                "brand",
                "category",
                "country",
                "kind",
                "status",
                "badge",
                "price_amount",
                "sale_amount",
                "gallery",
                "image_colors",
                "description_html",
                "size_guide_html",
                "date",
                "version",
            ]
        },
        "sale_starts_at": p.sale_starts_at.isoformat() if p.sale_starts_at else None,
        "sale_ends_at": p.sale_ends_at.isoformat() if p.sale_ends_at else None,
        "sale_active": active_sale(p),
        "variants": [
            {
                k: getattr(v, k)
                for k in ["id", "color", "size", "stock_qty", "enabled", "version"]
            }
            for v in p.variants
        ],
    }


def save_product(db, payload, product=None):
    from app.modules.orders.models import Order, OrderItem

    p = product or Product()
    if product:
        # Lock variants before order rows, matching checkout/cancellation lock ordering.
        variants = db.scalars(
            select(Variant)
            .where(Variant.product_id == p.id)
            .order_by(Variant.id)
            .with_for_update()
        ).all()
        db.refresh(p)
        if payload.expected_version != p.version:
            fail("VERSION_CONFLICT", "商品已被修改，請重新載入", 409)
        outstanding = db.scalar(
            select(OrderItem.id)
            .join(Order)
            .where(
                OrderItem.product_id == p.id, Order.status.in_(["pending", "confirmed"])
            )
            .limit(1)
        )
        old_ids = {v.id for v in variants}
        new_ids = {v.id for v in payload.variants if v.id}
        active_ids = {v.id for v in variants if v.enabled}
        if outstanding and (p.kind != payload.kind or active_ids != new_ids):
            fail("RESOURCE_IN_USE", "商品尚有未出貨訂單，不能改供貨方式或移除規格", 409)
        for v in payload.variants:
            if v.id and v.id not in old_ids:
                fail("VALIDATION_ERROR", "規格不屬於此商品")
    data = payload.model_dump(exclude={"variants", "expected_version"})
    for key in ["description_html", "size_guide_html"]:
        data[key] = clean_html(data[key])
        from html.parser import HTMLParser
        from app.modules.assets.service import validate_image_url
        class Images(HTMLParser):
            def handle_starttag(self, tag, attrs):
                if tag == "img":
                    validate_image_url(db, dict(attrs).get("src", ""))
        Images().feed(data[key])
    from app.modules.assets.service import validate_image_url

    for url in data["gallery"]:
        validate_image_url(db, url)
    for key, value in data.items():
        setattr(p, key, value)
    if not product:
        db.add(p)
        db.flush()
    existing = {v.id: v for v in p.variants}
    keep = set()
    for value in payload.variants:
        v = existing.get(value.id) or Variant(product_id=p.id)
        for key, val in value.model_dump(exclude={"id"}).items():
            setattr(v, key, val)
        if v.id:
            keep.add(v.id)
        v.version = (v.version or 0) + 1
        db.add(v)
    for key, v in existing.items():
        if key not in keep:
            v.enabled = False  # Historical order FKs remain valid.
    p.version = (p.version or 0) + 1
    db.flush()
    db.refresh(p)
    return p
