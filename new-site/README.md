# WK.SLELCT 新版（一期單店）

React + FastAPI + PostgreSQL + Docker Compose。原站在上層目錄，保持不變。本目錄是獨立新版，本機預覽不是正式上線。

## 本機啟動

需先安裝並啟動 Docker Desktop（Linux containers）及 Python 3.12+。

```powershell
cd C:\Users\User\Desktop\wk_select\new-site
python scripts/setup_local.py
```

前台：http://localhost:8089/#home

後台：http://localhost:8089/admin

API 文件：http://localhost:8089/api/docs

首次本機設定產生兩組獨立隨機帳密，存放 `.secrets/local-admins.json`；請在本機開啟查看，不要提交 Git 或分享。兩人權限完全相同。既有帳密不會因重跑設定而被覆寫。管理員可在後台更改自己的密碼；維運可用 `docker compose exec api python -m app.cli reset-password --username owner`。CLI 會互動要求密碼，不要將密碼放命令列。

`.env`、`.secrets/`、`backups/` 都不進 Git。只提供 `.env.example` 作為欄位範本。現貨庫存初始為0，避免猜測庫存；上線前請自行填入。會員與訂單不從原站搬入。

## 日常操作

```powershell
docker compose ps
docker compose logs --tail 100 api
docker compose stop
docker compose start
```

不要執行 `docker compose down -v`，那會清除新版資料 volume。停止容器不影響原站。

## 更新與 migration

先備份，再建置與 migration，成功後重啟。下面命令使用由本機設定產生的 migration 連線檔；正式環境須用自己的秘密管理方式。

```powershell
python scripts/backup.py
docker compose build api web
docker compose run --rm --volume C:/Users/User/Desktop/wk_select/new-site/.secrets/migration_database_url:/run/secrets/migration_url:ro -e DATABASE_URL_FILE=/run/secrets/migration_url api alembic upgrade head
docker compose up -d --wait
```

常駐 API 不使用資料庫擁有者權限。migration 只向前執行已審查版本；不要直接修改已使用的 migration。

## 測試與備份

```powershell
python scripts/verify_original.py
python scripts/backup.py
python scripts/restore_verify.py backups/<備份時間目錄>
```

還原驗證建立全新 `wk_restore_*` 資料庫，不覆蓋正在使用的新版或原站。備份含私人資料；本機副本不能代替加密異地備份。R2 的異地備份需另行配置，尚未宣稱完成。

後端整合測試需要獨立名稱以 `_test` 結尾的資料庫。本機設定後用 bootstrap 建立 `wk_select_test`，將對應連線寫在被忽略的 `.secrets/test_database_url`，再執行：

```powershell
docker compose run --rm --user root --volume C:/Users/User/Desktop/wk_select/new-site/.secrets/test_database_url:/run/secrets/test_url:ro -e DATABASE_URL_FILE=/run/secrets/test_url api uv run --frozen pytest -q
```

測試會清除該測試資料庫的資料表，絕不可指向使用中的資料庫。前端型別與正式建置驗證在 Docker build 時執行 `npm run build`。

## 尚需設定才能正式營運

- Google OAuth：會員登入所需；沒有設定時拒絕登入，不繞過會員驗證。
- R2：正式圖片儲存空間及受限權限金鑰；本機目前用 uploads volume。
- CKEditor：你尚未取得授權金鑰，後台保留設定欄，目前只顯示既有內容預覽。
- 金流：目前只有人工匯款／取貨付款紀錄，沒有信用卡、虛擬帳號自動收款或退款。711查詢不等於物流建單。
- 雲端主機、網域、HTTPS、監控、異地備份及正式驗收。

七份規格位於上層 docs。架構維持單店模組化單體，SaaS 多租戶與訂閱留待未來，不在本期增加複雜度。


### 同網路手機測試

`WEB_BIND=0.0.0.0` 允許區網連線。`LOCAL_ALLOWED_ORIGINS` 填入實際手機開啟的電腦網址（例如 `http://172.20.10.4:8089`，可逗號分隔）。只有 APP_ENV=local 會採用此額外清單；正式環境仍只接受 PUBLIC_ORIGIN。Wi-Fi IP 更換時必須更新清單並執行 `docker compose up -d --wait api`。不採用任意來源或依 Host 自動放行。Google OAuth 的 callback 仍使用 PUBLIC_ORIGIN；手機 Google 登入需另外設定有效 HTTPS 測試網址。


## ATM 虛擬帳號測試（僅本機／測試環境）

管理後台新增「ATM 金流測試」。建立 NT$100、3 天的測試交易後，依序按「模擬取得帳號」「模擬付款通知」。銀行代碼 000 與全零帳號是本機模擬資料，不可轉帳。測試資料存放獨立 `atm_sandbox_transactions`，不建立客戶訂單、不扣庫存、不更新真實付款。預設 3 天不是正式業務規則，未啟用逾期自動取消。

`ECPAY_SANDBOX_ENABLED=true` 僅適用非 production。production 一律拒絕測試 API。使用綠界官方公開測試憑證，不能改用正式憑證收款。

目前已驗證：官方 SHA256 範例向量、管理員與 CSRF、重複建單、取號、付款、通知重送／順序顛倒、偽造簽章、金額／商店／交易號不符、與真實訂單隔離。未驗證：綠界實際取號與外部回傳。只有本機模擬通過不代表金流已上線。

### 下一步：公開 HTTPS 測試網址

Windows PowerShell 安裝 Cloudflare 官方通道工具：

```powershell
winget install --id Cloudflare.cloudflared --exact
```

重新開啟 PowerShell，確認本機網站可開啟，再執行：

```powershell
cloudflared tunnel --url http://localhost:8089
```

會輸出臨時 `https://隨機名稱.trycloudflare.com`。此通道會公開本機網站，測試完 Ctrl+C 關閉；重開網址可能不同，不適合正式上線。無需修改路由器或公開資料庫。不要啟用會攔截綠界通知的郵件登入驗證。

將網址填入 `new-site/.env` 的 `ECPAY_SANDBOX_CALLBACK_ORIGIN`（只填 origin、不含斜線路徑），重建 api 容器後，可在本機 admin 建立全新的交易，按「前往綠界測試取號」。保留本機 admin 操作，不必更改 Google OAuth 或 PUBLIC_ORIGIN。綠界回傳路徑為：

- `/api/v1/payments/sandbox/ecpay/info`：取號通知。
- `/api/v1/payments/sandbox/ecpay/notify`：付款通知。

回傳先驗證 SHA256 CheckMacValue、MerchantID、TradeAmt、付款方式與交易對應，再提交資料並回應純文字 `1|OK`。測試帳號公開，測試結果不能當成真實款項。綠界階段的交易禁止以本機模擬按鈕更新。實際通知成功後才可宣告外部串接完成。

官方文件：https://developers.ecpay.com.tw/2872/ 、 https://developers.ecpay.com.tw/2881/ 、 https://developers.ecpay.com.tw/2902/ 。


## 2026-10-29 Order ATM integration (STAGE only)

Enable `ECPAY_SANDBOX_ENABLED=true`, `ECPAY_ORDER_TESTING_ENABLED=true` and a public HTTPS `ECPAY_SANDBOX_CALLBACK_ORIGIN` in the local `.env`. Both flags default to false in `.env.example`; production rejects this testing flow. Restart `api`, `web`, and `payment-worker` after rebuilding.

Member checkout with prepaid 7-ELEVEN creates an explicitly marked test order. The member obtains a virtual account via ECPay STAGE; no real transfer or shipment is permitted. The one-day deadline follows ECPay's returned date, ending at 23:59:59 Asia/Taipei (not a rolling 24 hours). The worker checks every minute and verifies payment status before cancellation. Query failures defer cancellation. Cancellation returns stock once; late payment enters manual review without reserving stock again. Test orders are excluded from sales ranking and cannot be shipped or manually marked as real receipts.

Evidence and remaining external callback verification: see `驗證紀錄.md`. Responsive tests use a 390x844 viewport; physical iOS/Android testing remains required.
