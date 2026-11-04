"""Phase-one acceptance checks; fixtures enforce a disposable *_test database."""
from concurrent.futures import ThreadPoolExecutor
from time import perf_counter
import json
from conftest import authenticate
from test_commerce import make_order
from app.core.database import SessionLocal
from app.modules.catalog.models import Variant


def test_full_order_fulfillment_visible_to_member(client,seeded):
    o=make_order(seeded)
    h=authenticate(client,seeded["helper"],"admin")
    base=f"/api/v1/admin/orders/{o['id']}"
    premature=client.post(base+"/shipment",headers=h,json={"tracking_number":"QA-NO-SHIP", "all_items_ready_confirmed":True,"expected_version":o["version"]})
    assert premature.status_code==409
    r=client.post(base+"/transition",headers=h,json={"to_status":"confirmed","expected_version":o["version"]})
    assert r.status_code==200,r.text
    confirmed=r.json()["data"]
    r=client.post(base+"/shipment",headers=h,json={"tracking_number":"QA-NO-SHIP", "all_items_ready_confirmed":True,"expected_version":confirmed["version"]})
    assert r.status_code==201,r.text
    shipped=r.json()["data"]
    assert shipped["status"]=="shipped" and shipped["tracking_number"]=="QA-NO-SHIP"
    assert client.post(base+"/transition",headers=h,json={"to_status":"cancelled","expected_version":shipped["version"]}).status_code==409
    r=client.post(base+"/transition",headers=h,json={"to_status":"completed","expected_version":shipped["version"]})
    assert r.status_code==200 and r.json()["data"]["status"]=="completed"
    authenticate(client,seeded["member"],"member")
    visible=client.get(f"/api/v1/orders/{o['id']}").json()["data"]
    assert visible["status"]=="completed" and visible["tracking_number"]=="QA-NO-SHIP"
    with SessionLocal() as db:
        assert db.get(Variant,seeded["variant"]).stock_qty==0


def test_basic_read_load_200_requests(client,seeded):
    paths=["/api/v1/catalog/products","/api/v1/site-content","/health/ready"]
    def read(i):
        start=perf_counter()
        r=client.get(paths[i%len(paths)])
        return r.status_code,(perf_counter()-start)*1000
    start=perf_counter()
    with ThreadPoolExecutor(max_workers=10) as pool:
        results=list(pool.map(read,range(200)))
    elapsed=perf_counter()-start
    assert all(code==200 for code,_ in results)
    times=sorted(t for _,t in results)
    print("ACCEPTANCE_LOAD="+json.dumps({"requests":200,"concurrency":10,"errors":0,"seconds":round(elapsed,3),"p95_ms":round(times[189],2),"max_ms":round(times[-1],2)}))
