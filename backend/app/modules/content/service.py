import json
from app.core.exceptions import fail
from app.modules.catalog.service import clean_html

TEXT_KEYS = {
    "logoUrl",
    "logoAlt",
    "brandName",
    "brandTagline",
    "bestSellersTitle",
    "catalogSubtitle",
    "emptyText",
    "footerBlock1",
    "footerBlock2",
    "footerBlock3",
    "footerPaymentMethods",
    "footerCopyright",
    "ckeditorLicenseKey",
    "productContentHtml",
    "deliveryPolicyHtml",
    "returnsPolicyHtml",
    "footerLayoutVersion",
}


def validate_content(db, value):
    if len(json.dumps(value)) > 300000:
        fail("VALIDATION_ERROR", "網站內容過大")
    if (
        set(value)
        - TEXT_KEYS
        - {"announcementRows", "heroSlides", "shippingFee", "freeShippingThreshold"}
    ):
        fail("VALIDATION_ERROR", "不支援的設定欄位")
    result = {}
    for key, val in value.items():
        if key in {"shippingFee", "freeShippingThreshold"}:
            if type(val) is not int or not 0 <= val <= 10000000:
                fail("VALIDATION_ERROR", "運費/門檻需為非負整數")
        elif key in {"announcementRows", "heroSlides"}:
            if not isinstance(val, list) or len(val) > 100:
                fail("VALIDATION_ERROR", "公告/投影片格式不正確")
            for item in val:
                if not isinstance(item, dict) or set(item) - {
                    "id",
                    "text",
                    "image",
                    "alt",
                    "sortOrder",
                    "enabled",
                    "aspectRatio",
                    "fit",
                }:
                    fail("VALIDATION_ERROR", "列格式不正確（公告沒有連結欄位）")
                if (
                    type(item.get("sortOrder", 0)) is not int
                    or type(item.get("enabled", True)) is not bool
                ):
                    fail("VALIDATION_ERROR", "順序或顯示設定不正確")
                if any(
                    not isinstance(item.get(k, ""), str) or len(item.get(k, "")) > 2000
                    for k in ["text", "image", "alt"]
                ):
                    fail("VALIDATION_ERROR", "內容過長")
                if key == "heroSlides" and (item.get("aspectRatio", "original") not in {"original", "16/9", "4/3", "1/1", "2/3"} or item.get("fit", "contain") not in {"contain", "cover"}):
                    fail("VALIDATION_ERROR", "投影片比例或圖片呈現不正確")
                if key == "heroSlides" and item.get("image"):
                    from app.modules.assets.service import validate_image_url

                    validate_image_url(db, item["image"])
        else:
            if not isinstance(val, str):
                fail("VALIDATION_ERROR", "文字格式不正確")
            if key in {"productContentHtml", "deliveryPolicyHtml", "returnsPolicyHtml"}:
                val = clean_html(val)
            if key == "logoUrl":
                from app.modules.assets.service import validate_image_url

                validate_image_url(db, val)
        result[key] = val
    return result
