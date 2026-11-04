import time
import httpx
from defusedxml import ElementTree
from app.core.exceptions import fail

CITIES = "基隆市 台北市 新北市 桃園市 新竹市 新竹縣 苗栗縣 台中市 彰化縣 南投縣 雲林縣 嘉義縣 嘉義市 台南市 高雄市 屏東縣 宜蘭縣 花蓮縣 台東縣 連江縣 金門縣 澎湖縣".split()
cache = {}


CITY_IDS = dict(zip("台北市 基隆市 新北市 桃園市 新竹市 新竹縣 苗栗縣 台中市 彰化縣 南投縣 雲林縣 嘉義市 嘉義縣 台南市 高雄市 屏東縣 宜蘭縣 花蓮縣 台東縣 澎湖縣 金門縣 連江縣".split(), "01 02 03 04 05 06 07 08 10 11 12 13 14 15 17 19 20 21 22 23 25 24".split()))
town_cache = {}

async def towns(city):
    if city not in CITY_IDS:
        fail("VALIDATION_ERROR", "請選擇有效縣市")
    if city in town_cache and town_cache[city][0] > time.monotonic():
        return town_cache[city][1]
    try:
        async with httpx.AsyncClient(timeout=20) as c:
            r = await c.post("https://emap.pcsc.com.tw/EMapSDK.aspx", data={"commandid": "GetTown", "cityid": CITY_IDS[city]})
            r.raise_for_status()
        root = ElementTree.fromstring(r.content)
        rows = [n.findtext("TownName", "").strip() for n in root.iter("GeoPosition")]
        rows = [x for x in rows if x]
        if not rows:
            raise ValueError()
        town_cache[city] = (time.monotonic() + 21600, rows)
        return rows
    except Exception:
        fail("UPSTREAM_UNAVAILABLE", "711行政區查詢暫時無法使用，請重試", 502)

async def stores(city, town=""):
    if not town or town not in await towns(city):
        fail("VALIDATION_ERROR", "請選擇有效行政區")
    key = (city, town)
    if city not in CITIES:
        fail("VALIDATION_ERROR", "請選擇有效縣市")
    if key in cache and cache[key][0] > time.monotonic():
        return cache[key][1]
    try:
        async with httpx.AsyncClient(timeout=20) as c:
            r = await c.post(
                "https://emap.pcsc.com.tw/EMapSDK.aspx",
                data={"commandid": "SearchStore", "city": city, "town": town},
            )
            r.raise_for_status()
        if len(r.content) > 12000000:
            raise ValueError()
        root = ElementTree.fromstring(r.content)
        result = [
            {
                "id": n.findtext("POIID", "").strip(),
                "name": n.findtext("POIName", "").strip(),
                "address": n.findtext("Address", "").strip(),
            }
            for n in root.iter("GeoPosition")
        ]
        result = [s for s in result if s["id"].isdigit() and s["name"] and s["address"]]
        if not result:
            raise ValueError()
        cache[key] = (time.monotonic() + 21600, result)
        return result
    except Exception:
        fail("UPSTREAM_UNAVAILABLE", "711門市查詢暫時無法使用，請稍後再試", 502)
