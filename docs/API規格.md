# API 規格

> 版本 0.3.1｜2026-10-27｜對應 new-site 一期實作；原 Worker API 保留不改。

## 通用合約

基底路徑 `/api/v1`。互動規格 `/api/docs`；完整欄位、限制、必填、回應 schema 以同版本 `/api/openapi.json` 及各模組 schemas.py 為準。成功回應 `{ "data": ... }`；204 無內容。錯誤 `{ "error": { "code": "...", "message": "..." }, "request_id": "..." }`，追蹤識別另有 X-Request-ID。金額為新台幣整數元，禁止浮點；空價格為 null，不能下單。

目前單店小量清單直接回 data 陣列，尚未實作 server cursor 分頁；前台顯示筆數／排序在前端。大量資料時再增加相容分頁，不宣稱已有未實作參數。UUID 是內部識別，畫面呈現名稱或訂單編號。

## Session 與權限

管理員帳密與會員 Google OAuth 各自使用獨立 opaque session cookie、CSRF token，資料庫只存 token 雜湊。兩位管理員同權限；沒有公開管理員註冊。管理帳號由 `app.cli admin` 建立、`reset-password` 重設。修改請求必須包含正確 Origin 與 X-CSRF-Token（登入本身只驗 Origin）。前端不儲存 bearer token。正式 HTTPS 使用 Secure/HttpOnly cookie；會員只能看自己的訂單與個人資料，其他會員資源回404。

## 已實作路徑

下表均加基底路徑。GET 為200，POST 新建一般201，PATCH 為200；特定登出／改密碼為204。各路徑精確回應以 OpenAPI 為準。

| 方法／路徑 | 權限 | 模組 |
|---|---|---|
| POST `/admin/assets` | 管理員／小幫手（同權限） | assets |
| POST `/admin/auth/login` | 管理員／小幫手（同權限） | auth |
| GET `/admin/auth/session` | 管理員／小幫手（同權限） | auth |
| GET `/auth/session` | 公開／登入流程 | auth |
| POST `/admin/auth/logout` | 管理員／小幫手（同權限） | auth |
| POST `/auth/logout` | 公開／登入流程 | auth |
| POST `/admin/auth/change-password` | 管理員／小幫手（同權限） | auth |
| GET `/auth/google/start` | 公開／登入流程 | auth |
| GET `/auth/google/callback` | 公開／登入流程 | auth |
| GET `/catalog/products` | 公開／登入流程 | catalog |
| GET `/catalog/products/{id}` | 公開／登入流程 | catalog |
| GET `/catalog/metadata` | 公開／登入流程 | catalog |
| GET `/admin/products` | 管理員／小幫手（同權限） | catalog |
| POST `/admin/products` | 管理員／小幫手（同權限） | catalog |
| PATCH `/admin/products/{id}` | 管理員／小幫手（同權限） | catalog |
| GET `/admin/navigation` | 管理員／小幫手（同權限） | catalog |
| POST `/admin/navigation` | 管理員／小幫手（同權限） | catalog |
| PATCH `/admin/navigation/{id}` | 管理員／小幫手（同權限） | catalog |
| DELETE `/admin/navigation/{id}` | 管理員／小幫手（同權限） | catalog |
| POST `/admin/catalog/{kind}` | 管理員／小幫手（同權限） | catalog |
| DELETE `/admin/catalog/{kind}/{id}` | 管理員／小幫手（同權限） | catalog |
| PATCH `/admin/catalog/{kind}/{id}` | 管理員／小幫手（同權限） | catalog |
| GET `/site-content` | 公開／登入流程 | content |
| GET `/admin/site-content` | 管理員／小幫手（同權限） | content |
| PATCH `/admin/site-content` | 管理員／小幫手（同權限） | content |
| GET `/admin/customers` | 管理員／小幫手（同權限） | customers |
| POST `/admin/customers` | 管理員／小幫手（同權限） | customers |
| PATCH `/admin/customers/{id}` | 管理員／小幫手（同權限） | customers |
| GET `/me/profile` | 登入會員 | customers |
| PATCH `/me/profile` | 登入會員 | customers |
| PATCH `/admin/members/{id}` | 管理員／小幫手（同權限） | customers |
| GET `/shipping/711-stores` | 公開／登入流程 | orders |
| POST `/orders` | 登入會員 | orders |
| GET `/orders` | 登入會員 | orders |
| GET `/orders/{id}` | 登入會員 | orders |
| GET `/admin/orders` | 管理員／小幫手（同權限） | orders |
| POST `/admin/orders/{id}/transition` | 管理員／小幫手（同權限） | orders |
| POST `/admin/orders/{id}/shipment` | 管理員／小幫手（同權限） | orders |
| POST `/admin/payments/{id}/confirm` | 管理員／小幫手（同權限） | payments |
| POST `/admin/payments/{id}/record-refund` | 管理員／小幫手（同權限） | payments |
| GET `/admin/purchase-requests` | 管理員／小幫手（同權限） | requests |
| POST `/admin/purchase-requests` | 管理員／小幫手（同權限） | requests |
| PATCH `/admin/purchase-requests/{id}` | 管理員／小幫手（同權限） | requests |

## 重要參數與業務合約

- 管理登入：username、password；回應 session/CSRF，連續失敗限制為每帳號及來源 15 分鐘8次。Google start 建立 state/nonce/PKCE；callback 伺服器驗證後建立會員 session，不接受自行填 email 作為登入。
- 商品：title、brand（可空）、category、country(korea/japan)、kind(stock/preorder)、status(draft/published/offline/archived)、price_amount、sale_amount、gallery(URL陣列)、image_colors(URL到顏色)、description_html、size_guide_html、variants。特價必須低於原價；上架至少一圖；每規格含 color、size、stock_qty、enabled，現貨 stock_qty>=0，預購必須 null。更新需 expected_version。
- 導覽：label、action、action_value、parent_id、placement(both/header/sidebar)、sort_order、enabled、expected_version；防循環與過深階層。全部商品直接到全部商品；商品類別保留下拉。品牌／分類 kind 為 brands/categories；使用中的項目不能直接刪除，改名同步商品及對應選單。
- 內容：GET 回 value/version；PATCH 接受 `{value: {...}, expected_version: n}` 整體更新，並驗證允許 key。公告與投影片含穩定 id、sort_order、enabled；公告無點擊連結。頁尾及共用說明為大文字區塊，HTML 經白名單清理；公開 API 不回編輯器密鑰。
- 圖片：POST multipart `file`，JPG/PNG/WEBP/GIF，單檔最大5MB；核對實際內容、像素限制、重新編碼後儲存；回圖片 URL。貼上與檔案選取走同一API。`/media/{id}`（無 /api/v1 前綴）供已公開引用圖片或管理員預覽。
- 711查詢：city 查詢門市，回 id/name/address；不是付款或物流建單API。建單須使用近期伺服器查詢所得門市，不接受任意自行填地址。
- 建單：必填 items[{variant_id,quantity}]、receiver{name,phone,email?}、store{id,name,address}、shipping_method(711_cod/711_prepaid)、payment_method(711_cod/bank_transfer)、expected_total_amount、note?。同規格合併數量；伺服器重算價格、運費與庫存。Header `Idempotency-Key` 必填；相同主體／操作／key／payload 重送回同筆結果，不同 payload 衝突。
- 運費：商品小計滿1800免運，否則60（後台可改）；建立訂單即快照。無自動折扣／外幣或成本欄位。
- 狀態轉換：to_status(confirmed/cancelled/completed)、expected_version、reason?；只能合法順序。現貨建立訂單扣庫存，未出貨取消只回補一次。出貨 POST tracking_number、all_items_ready_confirmed=true、expected_version；整單出貨，匯款需先確認付款。完成需已出貨。
- 收款／退款：confirm 與 record-refund 為人工記錄，使用 Idempotency-Key；必須核對金額與合法狀態，不會實際執行銀行退款。不得把標記已付當成線上金流成功。
- 客戶：人工建立客戶不自動取得會員登入；會員自己的 profile 回應不含 internal_notes。停用會員立即撤銷 session。代購需求由後台登錄，無訪客需求表或公開代填API。

## 錯誤與重試

| HTTP | 意義 |
|---|---|
| 401 AUTH_REQUIRED | 未登入或已過期 |
| 403 CSRF_INVALID | Origin/CSRF 不符 |
| 404 NOT_FOUND | 不存在或不屬於該會員 |
| 409 | 版本、庫存、金額、狀態或冪等衝突；畫面重載後確認，不能無限重試 |
| 422 VALIDATION_ERROR | 格式、限制或不允許欄位 |
| 429 | 登入速率限制 |
| 503 | 外部登入／圖片／門市服務未設定或暫時不可用 |

具體 domain error code 以 service 的 fail() 及 OpenAPI 實例為準；前端保留安全訊息與 request_id，不暴露堆疊或秘密。建立訂單／記錄金額遇網路中斷先以相同 key 重試，避免新建重複資料。

## 未來規劃

線上金流建立交易與 webhook、虛擬帳號對帳、正式物流建單、SaaS 租戶與訂閱均尚未提供路徑。待服務商與規則確認後另訂版本，不保留假成功端點。

## 商品預覽與特價時段補充

GET /api/v1/admin/products/{id}/preview 只允許登入管理員，提供草稿／隱藏商品預覽，不公開、不建立訂單。商品輸入新增 sale_starts_at、sale_ends_at，可空、必須帶時區，結束須晚於開始，設定時段必須已有特價。商品回應另有 sale_active；前端顯示倒數，建單以伺服器時間重算。

## 熱銷排行與瀏覽統計（2026-10-28）
商品清單新增 order_count、view_count。熱銷依未取消訂單筆數降序，同筆訂單多件／多規格只計一次；同分再依瀏覽次數、原有最新順序。售罄仍最後。POST /api/v1/catalog/products/{id}/view 僅公開上架商品、需正確 Origin；回 counted。匿名簽名Cookie，同瀏覽器／商品／30分鐘固定時段去重；不計預覽、不收集IP或Google資料；歷史瀏覽不推算。


### 2026-10-28 會員登入與購物車調整

POST /api/v1/auth/register：name、email、password（12～128 字元），成功 201，回傳會員 session 並設定 HttpOnly cookie。POST /api/v1/auth/login：email、password，成功 200。均驗證 Origin；登入錯誤 401、重複帳號 409、欄位錯誤 422、嘗試過多 429。不提供未接通的寄信重設 API。


### 2026-10-28 訂單詳情與常用門市

PUT /api/v1/me/preferred-store：會員權限與 CSRF，body={store:{id,name,address}}；store=null 清除。門市必須來自近期官方查詢快取，拒絕任意門市資料。GET /orders 和 /orders/{id} 明細新增 items[].image_url 與 shipped_at；單筆讀取限訂單所屬會員。會員結帳可使用帳戶已驗證保存的常用門市。


## 2026-10-29 STAGE 整合 API
- GET /api/v1/payments/options → {data:{atm_test_enabled:boolean}}；production 永遠 false。
- POST /api/v1/orders 原有會員＋CSRF＋Idempotency-Key 權限，新增 payment_method=ecpay_atm_test，僅啟用旗標且具 HTTPS 通知網址時可用；搭配 711_prepaid。金額與庫存由伺服器計算。
- POST /api/v1/orders/{id}/atm-checkout：會員＋CSRF，僅自己的未取消／未付款／未過期測試訂單；回 action（固定綠界 stage）與已簽章 fields。已取號回 ACCOUNT_EXISTS，禁止再次產生新交易。
- 訂單回應新增 is_test、payment_deadline、atm（bank_code/virtual_account/expires_on/status/merchant_trade_no）及 payment.paid_at。
- POST /api/v1/payments/sandbox/ecpay/info 與 /notify：無 cookie 權限，使用表單＋CheckMacValue 驗證，核對 MerchantID、TradeAmt、ATM、交易編號。只接受已建立的 stage 測試交易；不能指定更新任意正式訂單。純文字回應 1|OK。
- 原有管理員 API 保留；測試訂單拒絕實際出貨、人工確認真實收款／退款，錯誤 TEST_ORDER。
