"""ECPay AIO SHA256 signing. Only publicly documented STAGE credentials here."""
import hashlib
import secrets
from urllib.parse import quote_plus

STAGE_MERCHANT_ID = "3002607"
STAGE_HASH_KEY = "pwFHCqoQZGmho4w6"
STAGE_HASH_IV = "EkRm7iFT261dpevs"
STAGE_CHECKOUT = "https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5"


def check_mac(fields, key=STAGE_HASH_KEY, iv=STAGE_HASH_IV):
    pairs = sorted(((k, str(v)) for k, v in fields.items() if k != "CheckMacValue"), key=lambda x: x[0].lower())
    raw = "HashKey=" + key + "&" + "&".join(k+"="+v for k,v in pairs) + "&HashIV=" + iv
    # .NET HttpUtility encoding: ~ is encoded; !*() stay unencoded.
    encoded = quote_plus(raw, safe="-_.!*()").replace("~", "%7e").lower()
    return hashlib.sha256(encoded.encode()).hexdigest().upper()


def valid_mac(fields):
    supplied = fields.get("CheckMacValue", "")
    return len(supplied) == 64 and secrets.compare_digest(check_mac(fields), supplied)
