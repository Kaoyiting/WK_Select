from io import BytesIO
import time
from sqlalchemy import select
from app.core.database import SessionLocal
from app.modules.auth.models import Member
from app.modules.catalog.models import Variant, Product, CatalogEntry, Navigation
from app.modules.catalog.service import clean_html, product_data
from app.modules.customers.models import Customer
from app.modules.content.models import SiteContent
from test_commerce import make_order, order_payload
from conftest import authenticate


def test_helper_can_confirm_and_refund(client,seeded):
    order=make_order(seeded)
    h=authenticate(client,seeded['helper'],'admin')
    h['Idempotency-Key']='payment-once'
    url='/api/v1/admin/payments/'+order['payment']['id']
    payload={'amount':order['total_amount'],'reference':'test bank receipt','expected_version':1}
    r=client.post(url+'/confirm',headers=h,json=payload)
    assert r.status_code==200 and r.json()['data']['status']=='paid'
    assert client.post(url+'/confirm',headers=h,json=payload).json()==r.json()
    h['Idempotency-Key']='refund-once'
    r=client.post(url+'/record-refund',headers=h,json={'amount':500,'reference':'test actual refund','expected_version':2})
    assert r.status_code==200 and r.json()['data']['status']=='partially_refunded'


def test_customer_notes_not_exposed_to_member(client,seeded):
    with SessionLocal() as db:
        db.add(Customer(member_id=seeded['member'],name='Test',notes='private staff note'));db.commit()
    authenticate(client,seeded['member'],'member')
    r=client.get('/api/v1/me/profile')
    assert r.status_code==200 and 'notes' not in r.json()['data']


def test_disable_member_revokes_access(client,seeded):
    authenticate(client,seeded['member'],'member')
    h=authenticate(client,seeded['helper'],'admin')
    r=client.patch('/api/v1/admin/members/'+seeded['member'],headers=h,json={'status':'disabled'})
    assert r.status_code==200
    assert client.get('/api/v1/orders').status_code==401


def test_content_shipping_configuration_and_version(client,seeded):
    h=authenticate(client,seeded['helper'],'admin')
    r=client.get('/api/v1/admin/site-content').json()['data']
    value={**r['value'],'shippingFee':80,'freeShippingThreshold':2000,'announcementRows':[{'text':'自訂公告','sortOrder':1,'enabled':True}]}
    res=client.patch('/api/v1/admin/site-content',headers=h,json={'value':value,'expected_version':r['version']})
    assert res.status_code==200
    assert client.get('/api/v1/site-content').json()['data']['shippingFee']==80
    assert client.patch('/api/v1/admin/site-content',headers=h,json={'value':value,'expected_version':r['version']}).status_code==409


def test_rich_text_sanitizes_scripts_but_preserves_editor_font():
    clean=clean_html('<p onclick="bad()"><span style="font-size:24px;position:fixed">文字</span><a href="javascript:bad()">x</a></p>')
    assert 'onclick' not in clean and 'javascript:' not in clean and 'position' not in clean
    assert 'font-size:24px' in clean


def test_catalog_rename_links_products_and_navigation(client,seeded):
    with SessionLocal() as db:
        x=CatalogEntry(kind='categories',name='Old');db.add(x)
        p=db.get(Product,seeded['product']);p.category='Old'
        db.add(Navigation(label='Old',action='category',action_value='Old'))
        db.commit();id=x.id
    h=authenticate(client,seeded['helper'],'admin')
    assert client.patch('/api/v1/admin/catalog/categories/'+id,headers=h,json={'name':'New'}).status_code==200
    with SessionLocal() as db:
        assert db.get(Product,seeded['product']).category=='New'
        assert db.scalar(select(Navigation)).action_value=='New'


def test_valid_store_checkout_endpoint_and_duplicate_request(client,seeded):
    from app.integrations.seven_eleven import cache
    payload=order_payload(seeded['variant']).model_dump()
    cache['台北市']=(time.monotonic()+600,[payload['store']])
    h=authenticate(client,seeded['member'],'member');h['Idempotency-Key']='api-once'
    a=client.post('/api/v1/orders',headers=h,json=payload)
    b=client.post('/api/v1/orders',headers=h,json=payload)
    assert a.status_code==201 and b.status_code==201
    assert a.json()['data']['id']==b.json()['data']['id']


def test_unverified_store_cannot_order(client,seeded):
    from app.integrations.seven_eleven import cache
    cache.clear()
    h=authenticate(client,seeded['member'],'member');h['Idempotency-Key']='store-check'
    r=client.post('/api/v1/orders',headers=h,json=order_payload(seeded['variant']).model_dump())
    assert r.status_code==422


def test_manual_request_does_not_create_guest_order(client,seeded):
    from app.modules.orders.models import Order
    h=authenticate(client,seeded['helper'],'admin')
    r=client.post('/api/v1/admin/purchase-requests',headers=h,json={'requested_name':'代找商品','contact':'LINE 客戶','quantity':1})
    assert r.status_code==201
    with SessionLocal() as db:assert list(db.scalars(select(Order)))==[]


def test_product_brand_optional_and_preorder_null_stock(client,seeded):
    h=authenticate(client,seeded['helper'],'admin')
    r=client.post('/api/v1/admin/products',headers=h,json={'title':'未指定品牌','kind':'preorder','variants':[{'color':'','size':'','stock_qty':None}]})
    assert r.status_code==201
    assert r.json()['data']['brand']=='' and r.json()['data']['variants'][0]['stock_qty'] is None


def test_original_stock_product_edit_preserves_variant(client,seeded):
    h=authenticate(client,seeded['helper'],'admin')
    with SessionLocal() as db:
        p=db.get(Product,seeded['product']);p.gallery=['/assets/products/wk-logo.jpg'];db.commit()
        data=product_data(p)
    allowed=['title','brand','category','country','kind','status','badge','price_amount','sale_amount','gallery','description_html','size_guide_html']
    payload={k:data[k] for k in allowed};payload['expected_version']=data['version'];payload['variants']=[{k:v[k] for k in ['id','color','size','stock_qty','enabled']} for v in data['variants']]
    payload['title']='修改後商品'
    r=client.patch('/api/v1/admin/products/'+seeded['product'],headers=h,json=payload)
    assert r.status_code==200
    assert r.json()['data']['variants'][0]['id']==seeded['variant']


def test_slide_ratio_roundtrip_and_reject_invalid(client,seeded):
    h=authenticate(client,seeded['helper'],'admin')
    current=client.get('/api/v1/admin/site-content').json()['data']
    value={**current['value'],'heroSlides':[{'id':'test-slide','image':'/assets/anti-fraud.svg','alt':'Reminder','enabled':True,'sortOrder':1,'aspectRatio':'16/9','fit':'contain'}]}
    response=client.patch('/api/v1/admin/site-content',headers=h,json={'value':value,'expected_version':current['version']})
    assert response.status_code==200
    assert client.get('/api/v1/site-content').json()['data']['heroSlides'][0]['fit']=='contain'
    value['heroSlides'][0]['aspectRatio']='invalid'
    response=client.patch('/api/v1/admin/site-content',headers=h,json={'value':value,'expected_version':response.json()['data']['version']})
    assert response.status_code in (400,422)


def test_sales_count_only_completed_orders(client,seeded):
    from app.modules.orders.models import Order
    order=make_order(seeded)
    rows=client.get('/api/v1/catalog/products').json()['data']
    assert next(p for p in rows if p['id']==seeded['product'])['sales_count']==0
    with SessionLocal() as db:
        db.get(Order,order['id']).status='completed';db.commit()
    rows=client.get('/api/v1/catalog/products').json()['data']
    assert next(p for p in rows if p['id']==seeded['product'])['sales_count']>0


def test_navigation_legacy_edit_ignores_readonly_fields(client,seeded):
    h=authenticate(client,seeded['helper'],'admin')
    payload={'label':'Outerwear','action':'category','action_value':'Outerwear','parent_id':None,'placement':'both','sort_order':1,'enabled':True}
    original=client.post('/api/v1/admin/navigation',headers=h,json=payload).json()['data']
    payload={**original,'id':'cannot-change-id','expected_version':original['version'],'label':'Jackets'}
    response=client.patch('/api/v1/admin/navigation/'+original['id'],headers=h,json=payload)
    assert response.status_code==200
    assert response.json()['data']['id']==original['id']
    assert response.json()['data']['label']=='Jackets'


def test_draft_preview_is_admin_only_and_not_public(client,seeded):
    with SessionLocal() as db:
        db.get(Product,seeded['product']).status='draft';db.commit()
    url='/api/v1/admin/products/'+seeded['product']+'/preview'
    assert client.get(url).status_code==401
    authenticate(client,seeded['helper'],'admin')
    assert client.get(url).status_code==200
    assert client.get('/api/v1/catalog/products/'+seeded['product']).status_code==404


def test_expired_sale_checkout_uses_original_price(seeded):
    from datetime import datetime,timedelta,timezone
    from app.modules.catalog.service import active_sale
    with SessionLocal() as db:
        p=db.get(Product,seeded['product']);p.sale_amount=500;p.sale_ends_at=datetime.now(timezone.utc)-timedelta(seconds=1);db.commit()
        assert not active_sale(p)
    assert make_order(seeded)['total_amount']==1060


def test_scheduled_sale_validation():
    import pytest
    from app.modules.catalog.schemas import ProductInput
    base={'title':'Test','sale_amount':500,'price_amount':1000,'variants':[{'size':'M'}]}
    with pytest.raises(ValueError):
        ProductInput(**base,sale_starts_at='2026-10-28T12:00:00+08:00',sale_ends_at='2026-10-27T12:00:00+08:00')


def test_size_guide_upload_is_public_only_after_publish(client,seeded):
    from PIL import Image
    from app.modules.catalog.schemas import ProductInput,VariantInput
    h=authenticate(client,seeded['helper'],'admin')
    body=BytesIO();Image.new('RGB',(20,10),'white').save(body,format='PNG')
    uploaded=client.post('/api/v1/admin/assets',headers=h,files={'file':('size.png',body.getvalue(),'image/png')}).json()['data']['url']
    data=next(p for p in client.get('/api/v1/admin/products').json()['data'] if p['id']==seeded['product'])
    payload={k:v for k,v in data.items() if k in ProductInput.model_fields}
    payload['variants']=[{k:v for k,v in row.items() if k in VariantInput.model_fields} for row in data['variants']]
    payload['expected_version']=data['version']
    payload['gallery']=['/assets/products/wk-logo.jpg']
    payload['size_guide_html']='<p>Size M</p><p><img src="'+uploaded+'" alt="size"></p>'
    response=client.patch('/api/v1/admin/products/'+data['id'],headers=h,json=payload)
    assert response.status_code==200
    assert uploaded in response.json()['data']['size_guide_html']
    client.cookies.clear()
    assert client.get(uploaded).status_code==200


def test_navigation_category_becomes_product_choice(client,seeded):
    h=authenticate(client,seeded['helper'],'admin')
    root=client.post('/api/v1/admin/navigation',headers=h,json={'label':'Categories','action':'category'}).json()['data']
    response=client.post('/api/v1/admin/navigation',headers=h,json={'label':'Sweaters','action':'category','action_value':'Sweaters','parent_id':root['id']})
    assert response.status_code==201
    names=[x['name'] for x in client.get('/api/v1/catalog/metadata').json()['data']['categories']]
    assert 'Sweaters' in names


def test_view_dedup_and_hidden_product_not_counted(client,seeded):
    h={'Origin':'http://localhost:8089'}
    url='/api/v1/catalog/products/'+seeded['product']+'/view'
    assert client.post(url,headers=h).json()['data']['counted'] is True
    assert client.post(url,headers=h).json()['data']['counted'] is False
    with SessionLocal() as db:
        db.get(Product,seeded['product']).status='draft';db.commit()
    assert client.post(url,headers=h).status_code==404


def test_popularity_orders_count_once_and_exclude_cancelled(client,seeded):
    from app.modules.orders.models import Order,OrderItem
    order=make_order(seeded)
    with SessionLocal() as db:
        item=db.scalar(select(OrderItem).where(OrderItem.order_id==order['id']))
        item.quantity=10;db.commit()
    row=next(p for p in client.get('/api/v1/catalog/products').json()['data'] if p['id']==seeded['product'])
    assert row['order_count']==1
    with SessionLocal() as db:
        db.get(Order,order['id']).status='cancelled';db.commit()
    row=next(p for p in client.get('/api/v1/catalog/products').json()['data'] if p['id']==seeded['product'])
    assert row['order_count']==0


def test_local_origin_allowlist_does_not_relax_production(monkeypatch):
    import pytest
    from starlette.requests import Request
    from fastapi import HTTPException
    from app.core.config import settings
    from app.core.dependencies import check_origin
    c=settings()
    monkeypatch.setattr(c,"app_env","local")
    monkeypatch.setattr(c,"local_allowed_origins","http://172.20.10.4:8089")
    def req(origin):
        return Request({"type":"http","headers":[(b"origin",origin.encode())]})
    check_origin(req(c.public_origin))
    check_origin(req("http://172.20.10.4:8089"))
    with pytest.raises(HTTPException):
        check_origin(req("http://evil.invalid"))
    monkeypatch.setattr(c,"app_env","production")
    with pytest.raises(HTTPException):
        check_origin(req("http://172.20.10.4:8089"))
