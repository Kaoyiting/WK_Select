from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy import select, func
from app.core.database import get_db
from app.core.dependencies import admin
from app.core.exceptions import fail
from app.modules.audit.service import record
from .models import Product, Navigation, CatalogEntry, ProductView
from .schemas import ProductInput, NavigationInput, EntryInput
from .service import product_data, save_product

router = APIRouter()


@router.get("/catalog/products")
def products(db=Depends(get_db)):
    from app.modules.orders.models import Order, OrderItem
    sold = dict(db.execute(select(OrderItem.product_id, func.sum(OrderItem.quantity)).join(Order, Order.id == OrderItem.order_id).where(Order.status == "completed", Order.is_test.is_(False)).group_by(OrderItem.product_id)).all())
    order_counts = dict(db.execute(select(OrderItem.product_id, func.count(func.distinct(Order.id))).join(Order, Order.id == OrderItem.order_id).where(Order.status.in_(["pending", "confirmed", "shipped", "completed"]), Order.is_test.is_(False)).group_by(OrderItem.product_id)).all())
    views = dict(db.execute(select(ProductView.product_id, func.count()).group_by(ProductView.product_id)).all())
    return {
        "data": [
            {**product_data(p), "sales_count": int(sold.get(p.id, 0)), "order_count": int(order_counts.get(p.id,0)), "view_count": int(views.get(p.id,0))}
            for p in db.scalars(
                select(Product)
                .where(Product.status == "published")
                .order_by(Product.date.desc(), Product.legacy_id.desc())
            )
        ]
    }


@router.get("/catalog/products/{id}")
def product(id: str, db=Depends(get_db)):
    p = db.get(Product, id)
    if not p or p.status != "published":
        fail("NOT_FOUND", "找不到商品", 404)
    return {"data": product_data(p)}


@router.get("/catalog/metadata")
def metadata(db=Depends(get_db)):
    return {
        "data": {
            "brands": [
                {"id": x.id, "name": x.name}
                for x in db.scalars(
                    select(CatalogEntry).where(CatalogEntry.kind == "brands")
                )
            ],
            "categories": [
                {"id": x.id, "name": x.name}
                for x in db.scalars(
                    select(CatalogEntry).where(CatalogEntry.kind == "categories")
                )
            ],
            "navigation": [
                nav_data(n)
                for n in db.scalars(
                    select(Navigation)
                    .where(Navigation.enabled.is_(True))
                    .order_by(Navigation.sort_order)
                )
            ],
        }
    }


def nav_data(n):
    return {
        k: getattr(n, k)
        for k in [
            "id",
            "parent_id",
            "label",
            "action",
            "action_value",
            "placement",
            "sort_order",
            "enabled",
            "version",
        ]
    }


@router.get("/admin/products")
def admin_products(p=Depends(admin), db=Depends(get_db)):
    return {
        "data": [
            product_data(x)
            for x in db.scalars(
                select(Product).order_by(Product.date.desc(), Product.legacy_id.desc())
            )
        ]
    }


@router.post("/admin/products", status_code=201)
def create(payload: ProductInput, a=Depends(admin), db=Depends(get_db)):
    p = save_product(db, payload)
    record(db, a, "product.create", p.id)
    db.commit()
    return {"data": product_data(p)}


@router.patch("/admin/products/{id}")
def edit(id: str, payload: ProductInput, a=Depends(admin), db=Depends(get_db)):
    p = db.get(Product, id)
    if not p:
        fail("NOT_FOUND", "找不到商品", 404)
    p = save_product(db, payload, p)
    record(db, a, "product.update", p.id)
    db.commit()
    return {"data": product_data(p)}


@router.get("/admin/navigation")
def navigation(a=Depends(admin), db=Depends(get_db)):
    return {
        "data": [
            nav_data(n)
            for n in db.scalars(select(Navigation).order_by(Navigation.sort_order))
        ]
    }


@router.post("/admin/navigation", status_code=201)
@router.patch("/admin/navigation/{id}")
def save_navigation(
    payload: NavigationInput,
    id: str | None = None,
    a=Depends(admin),
    db=Depends(get_db),
):
    n = db.get(Navigation, id) if id else Navigation()
    if not n:
        fail("NOT_FOUND", "找不到導覽", 404)
    if id and payload.expected_version != n.version:
        fail("VERSION_CONFLICT", "請重新載入", 409)
    parent = payload.parent_id
    seen = {id} if id else set()
    depth = 0
    while parent:
        if parent in seen:
            fail("VALIDATION_ERROR", "導覽不能循環")
        seen.add(parent)
        row = db.get(Navigation, parent)
        if not row:
            fail("VALIDATION_ERROR", "上層不存在")
        parent = row.parent_id
        depth += 1
        if depth > 2:
            fail("VALIDATION_ERROR", "最多三層")
    for key, value in payload.model_dump(exclude={"expected_version"}).items():
        setattr(n, key, value)
    n.version = (n.version or 0) + 1
    # Navigation categories and product classification share the same choices.
    if n.action in {"category", "custom"} and (n.parent_id or n.action_value):
        name = (n.action_value or n.label).strip()
        if name and not name.startswith(("http:", "https:", "/", "#")) and not db.scalar(select(CatalogEntry).where(CatalogEntry.kind == "categories", CatalogEntry.name == name)):
            db.add(CatalogEntry(kind="categories", name=name))
    db.add(n)
    record(db, a, "navigation.save", id or "")
    db.commit()
    return {"data": nav_data(n)}


@router.delete("/admin/navigation/{id}", status_code=204)
def delete_navigation(id: str, a=Depends(admin), db=Depends(get_db)):
    n = db.get(Navigation, id)
    if not n:
        fail("NOT_FOUND", "找不到導覽", 404)
    if db.scalar(select(Navigation.id).where(Navigation.parent_id == id).limit(1)):
        fail("RESOURCE_IN_USE", "請先移除或移動下層選單", 409)
    db.delete(n)
    record(db, a, "navigation.delete", id)
    db.commit()


@router.post("/admin/catalog/{kind}", status_code=201)
def add_entry(kind: str, payload: EntryInput, a=Depends(admin), db=Depends(get_db)):
    if kind not in {"brands", "categories"}:
        fail("NOT_FOUND", "找不到類型", 404)
    if db.scalar(
        select(CatalogEntry).where(
            CatalogEntry.kind == kind, CatalogEntry.name == payload.name
        )
    ):
        fail("RESOURCE_IN_USE", "名稱已存在", 409)
    x = CatalogEntry(kind=kind, name=payload.name)
    db.add(x)
    db.commit()
    return {"data": {"id": x.id, "name": x.name}}


@router.delete("/admin/catalog/{kind}/{id}", status_code=204)
def delete_entry(kind: str, id: str, a=Depends(admin), db=Depends(get_db)):
    x = db.get(CatalogEntry, id)
    if not x or x.kind != kind:
        fail("NOT_FOUND", "找不到項目", 404)
    attr = Product.brand if kind == "brands" else Product.category
    if db.scalar(select(Product.id).where(attr == x.name).limit(1)):
        fail("RESOURCE_IN_USE", "尚有商品使用此名稱", 409)
    db.delete(x)
    db.commit()


@router.patch("/admin/catalog/{kind}/{id}")
def rename_entry(
    kind: str, id: str, payload: EntryInput, a=Depends(admin), db=Depends(get_db)
):
    x = db.scalar(select(CatalogEntry).where(CatalogEntry.id == id).with_for_update())
    if not x or x.kind != kind:
        fail("NOT_FOUND", "找不到項目", 404)
    if db.scalar(
        select(CatalogEntry.id).where(
            CatalogEntry.kind == kind,
            CatalogEntry.name == payload.name,
            CatalogEntry.id != id,
        )
    ):
        fail("RESOURCE_IN_USE", "名稱已存在", 409)
    previous = x.name
    attr = Product.brand if kind == "brands" else Product.category
    for p in db.scalars(select(Product).where(attr == previous).with_for_update()):
        setattr(p, "brand" if kind == "brands" else "category", payload.name)
        p.version += 1
    action = "brand" if kind == "brands" else "category"
    for n in db.scalars(
        select(Navigation).where(
            Navigation.action == action, Navigation.action_value == previous
        )
    ):
        n.action_value = payload.name
        if n.label == previous:
            n.label = payload.name
        n.version += 1
    x.name = payload.name
    record(db, a, "catalog.rename", id)
    db.commit()
    return {"data": {"id": x.id, "name": x.name}}


@router.get("/admin/products/{id}/preview")
def preview_product(id: str, a=Depends(admin), db=Depends(get_db)):
    p = db.get(Product, id)
    if not p:
        fail("NOT_FOUND", "找不到商品", 404)
    return {"data": product_data(p)}


@router.post("/catalog/products/{id}/view")
def record_view(id: str, request: Request, response: Response, db=Depends(get_db)):
    import hmac, hashlib, secrets, time
    from sqlalchemy.dialects.postgresql import insert
    from app.core.config import settings
    from app.core.dependencies import check_origin
    check_origin(request)
    p=db.get(Product,id)
    if not p or p.status != "published":
        fail("NOT_FOUND", "找不到商品", 404)
    key=settings().session_secret.encode()
    def signature(value): return hmac.new(key,value.encode(),hashlib.sha256).hexdigest()
    cookie=request.cookies.get("wk_visitor", "")
    parts=cookie.split(".")
    if len(parts)==2 and len(parts[0])==32 and hmac.compare_digest(parts[1],signature(parts[0])):
        visitor=parts[0]
    else:
        visitor=secrets.token_hex(16)
        response.set_cookie("wk_visitor",visitor+"."+signature(visitor),httponly=True,secure=settings().secure_cookie,samesite="lax",max_age=2592000,path="/")
    visitor_hash=signature("views:"+visitor)
    statement=insert(ProductView).values(product_id=id,visitor_hash=visitor_hash,window=int(time.time()//1800)).on_conflict_do_nothing(index_elements=["product_id","visitor_hash","window"]).returning(ProductView.id)
    counted=db.scalar(statement) is not None
    db.commit()
    return {"data":{"counted":counted}}
