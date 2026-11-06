import { PaymentSandbox } from "./admin/PaymentSandbox";
import {OrderProducts,OrderDetails,orderStatus,paymentStatus,orderDate} from "./OrderView";
import { useEffect, useState } from "react";
import { api, setCsrf, money, idempotent } from "../lib/api";
import type {
  Product,
  Session,
  Metadata,
  Order,
} from "../lib/types";
import { Dialog, Icon } from "../components/Shared";
import { ProductEditor } from "./admin/ProductEditor";
import { ContentEditor } from "./admin/ContentEditor";
import { Records } from "./admin/AdminRecords";
import { AccountSettings } from "./admin/AccountSettings";
import { NavigationEditor } from "./admin/NavigationEditor";
import { ProductTable } from "./admin/ProductTable";
import { productPayload } from "./admin/productPayload";

const pages = [
  ["dashboard", "總覽"],
  ["products", "商品管理"],
  ["catalog", "品牌與分類"],
  ["navigation", "導覽選單"],
  ["stock", "庫存與預購"],
  ["customers", "客戶資料"],
  ["requests", "代購需求"],
  ["orders", "訂單管理"],
  ["payment-sandbox", "ATM 金流測試"],
  ["content", "網站內容"],
  ["settings", "帳號與操作紀錄"],
];
export function Admin() {
  const [session, setSession] = useState<Session | null>(null),
    [page, setPage] = useState("dashboard"),
    [products, setProducts] = useState<Product[]>([]),
    [orders, setOrders] = useState<Order[]>([]),
    [meta, setMeta] = useState<Metadata>({
      brands: [],
      categories: [],
      navigation: [],
    }),
    [error, setError] = useState(""),
    [editing, setEditing] = useState<Product | null | undefined>(),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState(""), [kindFilter,setKindFilter]=useState(""), [pendingOnly,setPendingOnly]=useState(false), [orderSearch,setOrderSearch]=useState("");
  async function refresh() {
    const [p, o, m] = await Promise.all([
      api<Product[]>("/admin/products"),
      api<Order[]>("/admin/orders"),
      api<Metadata>("/catalog/metadata"),
    ]);
    setProducts(p);
    setOrders(o);
    setMeta(m);
  }
  useEffect(() => {
    api<Session>("/admin/auth/session")
      .then((s) => {
        setSession(s);
        setCsrf("admin", s.csrf_token);
        if (s.authenticated) refresh().catch((e) => setError(e.message));
      })
      .catch((e) => setError(e.message));
  }, []);
  async function action(fn: () => Promise<unknown>) {
    setError("");
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  if (!session)
    return <div className="app-loading">{error || "載入管理後台…"}</div>;
  if (!session.authenticated)
    return (
      <div className="login">
        <div className="login-box">
          <h1>WK.SELECT 管理後台</h1>
          <p>請以管理員帳號密碼登入</p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              try {
                const s = await api<Session>("/admin/auth/login", {
                  method: "POST",
                  body: JSON.stringify(Object.fromEntries(f)),
                });
                setSession(s);
                setCsrf("admin", s.csrf_token);
                await refresh();
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            <label className="field">
              管理員帳號
              <input name="username" autoComplete="username" required />
            </label>
            <label className="field">
              密碼
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </label>
            <button className="btn primary">登入</button>
          </form>
          {error && (
            <p className="message" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    );
  return (
    <>
      <div className="shell">
        <aside className="side">
          <div className="brand">
            WK.SELECT<small>STORE ADMIN</small>
          </div>
          <nav className="nav">
            {pages.map(([id, label]) => (
              <button
                key={id}
                className={page === id ? "active" : ""}
                onClick={() => {
                  setPage(id); setStatus(""); setKindFilter(""); setPendingOnly(false); setSearch("");
                  setError("");
                }}
              >
                {label}
              </button>
            ))}
          </nav>
        </aside>
        <section className="main">
          <header className="top">
            <span>管理後台　/　{pages.find((p) => p[0] === page)?.[1]}</span>
            <button
              onClick={() =>
                action(async () => {
                  await api("/admin/auth/logout", { method: "POST" });
                  setSession({ authenticated: false, csrf_token: "" });
                })
              }
            >
              登出
            </button>
          </header>
          <main className="content">
            {error && (
              <div className="app-error" role="alert">
                {error}
              </div>
            )}
            {page === "dashboard" && (
              <>
                <div className="heading">
                  <div>
                    <h1>商店總覽</h1>
                    <p>WK.SELECT 商品與供貨狀況</p>
                  </div>
                  <button
                    className="btn primary"
                    onClick={() => setEditing(null)}
                  >
                    ＋ 新增商品
                  </button>
                </div>
                <div className="cards">
                  {[
                    ["商品總數", products.filter(p=>p.status!=="archived").length],
                    [
                      "目前上架",
                      products.filter((p) => p.status === "published").length,
                    ],
                    [
                      "預購商品",
                      products.filter((p) => p.kind === "preorder" && p.status !== "archived").length,
                    ],
                    [
                      "待處理訂單",
                      orders.filter((o) => ["pending","manual_review"].includes(o.status)).length,
                    ],
                  ].map(([label, count]) => (
                    <button className="stat stat-link" key={label} onClick={() => {setSearch("");setStatus(label==="目前上架"?"published":"");setKindFilter(label==="預購商品"?"preorder":"");setPendingOnly(label==="待處理訂單");setPage(label==="待處理訂單"?"orders":"products");}}>
                      <label>{label}</label>
                      <strong>{count}</strong>
                    </button>
                  ))}
                </div>
                <section className="panel">
                  <h2>最近更新商品</h2>
                  <ProductTable rows={products.filter(p=>p.status!=="archived").slice(0, 6)} onEdit={setEditing} action={action} />
                </section>
                <section className="panel">
                  <h2>營運提醒</h2>
                  <p className="tagline">
                    現貨下單自動扣除，取消未出貨訂單自動回補；預購不填庫存。目前尚未串接線上金流。
                  </p>
                </section>
              </>
            )}
            {page === "products" && (
              <>
                <div className="heading">
                  <div>
                    <h1>商品管理</h1>
                    <p>新增、編輯商品與上架狀態</p>
                  </div>
                  <button
                    className="btn primary"
                    onClick={() => setEditing(null)}
                  >
                    ＋ 新增商品
                  </button>
                </div>
                <section className="panel">
                  <div className="toolbar">
                    <input
                      placeholder="搜尋商品、品牌"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      <option value="">全部狀態</option>
                      <option value="published">已上架</option>
                      <option value="draft">草稿</option>
                      <option value="offline">已隱藏</option><option value="archived">已刪除（可還原）</option>
                    </select>
                    <select aria-label="供貨方式篩選" value={kindFilter} onChange={e=>setKindFilter(e.target.value)}><option value="">全部供貨方式</option><option value="preorder">預購</option><option value="stock">現貨</option></select>
                  </div>
                  <ProductTable
                    onEdit={setEditing}
                    action={action}
                    rows={products.filter(
                      (p) =>
                        (p.title + " " + p.brand).includes(search) &&
                        (status ? p.status === status : p.status !== "archived") && (!kindFilter || p.kind === kindFilter),
                    )}
                  />
                </section>
              </>
            )}
            {page === "stock" && (
              <>
                <div className="heading">
                  <h1>庫存與預購</h1>
                </div>
                <section className="panel">
                  <h2>現貨庫存</h2>
                  <ProductTable
                    onEdit={setEditing}
                    action={action}
                    rows={products.filter((p) => p.kind === "stock")}
                  />
                </section>
                <section className="panel">
                  <h2>預購商品（不填庫存）</h2>
                  <ProductTable
                    onEdit={setEditing}
                    action={action}
                    rows={products.filter((p) => p.kind === "preorder")}
                  />
                </section>
              </>
            )}
            {page === "content" && <ContentEditor />}
            {page === "navigation" && (
              <NavigationEditor meta={meta} onChange={refresh} />
            )}
            {page === "catalog" && (
              <>
                <h1>品牌與分類</h1>
                {(["brands", "categories"] as const).map((kind) => (
                  <section className="panel" key={kind}>
                    <h2>{kind === "brands" ? "品牌" : "商品分類"}</h2>
                    <form
                      className="toolbar"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const f = e.currentTarget;
                        const name = String(new FormData(f).get("name"));
                        action(async () => {
                          await api("/admin/catalog/" + kind, {
                            method: "POST",
                            body: JSON.stringify({ name }),
                          });
                          f.reset();
                        });
                      }}
                    >
                      <input name="name" required placeholder="新增名稱" />
                      <button className="btn">新增</button>
                    </form>
                    <div className="chips">
                      {meta[kind].map((x) => (
                        <span className="chip" key={x.id}>
                          {x.name}{" "}
                          <button
                            className="catalog-icon catalog-icon-edit"
                            title={"編輯 " + x.name}
                            aria-label={"編輯 " + x.name}
                            onClick={() => {
                              const name = prompt(
                                "修改名稱（會連動商品與導覽）",
                                x.name,
                              );
                              if (name && name !== x.name)
                                action(() =>
                                  api("/admin/catalog/" + kind + "/" + x.id, {
                                    method: "PATCH",
                                    body: JSON.stringify({ name }),
                                  }),
                                );
                            }}
                          >
                            <Icon name="edit" />
                          </button>
                          <button
                            className="catalog-icon catalog-icon-delete"
                            title={"刪除 " + x.name}
                            aria-label={"刪除 " + x.name}
                            onClick={() => {
                              if (confirm("確定刪除此名稱？"))
                                action(() =>
                                  api("/admin/catalog/" + kind + "/" + x.id, {
                                    method: "DELETE",
                                  }),
                                );
                            }}
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <circle cx="12" cy="12" r="12" fill="currentColor" />
                              <path d="m8 8 8 8m0-8-8 8" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                          </button>
                        </span>
                      ))}
                    </div>
                  </section>
                ))}
              </>
            )}
            {page === "customers" && <Records kind="customers" />}
            {page === "requests" && <Records kind="purchase-requests" />}
            {page === "orders" && (
              <>
                <h1>訂單管理</h1>
                {!orders.length && (
                  <section className="panel empty">目前沒有訂單</section>
                )}
                <div className="order-toolbar"><div className="order-search"><input type="search" aria-label="搜尋姓名或訂單編號" placeholder="搜尋姓名或訂單編號" value={orderSearch} onChange={e=>setOrderSearch(e.target.value)} />{orderSearch && <button type="button" onClick={()=>setOrderSearch("")}>清除</button>}</div><label><input type="checkbox" checked={pendingOnly} onChange={e=>setPendingOnly(e.target.checked)} /> 只顯示待處理訂單</label><span>{orders.filter(o=>(!pendingOnly || ["pending","manual_review"].includes(o.status)) && (!orderSearch.trim() || [o.receiver.name,o.order_number].some(v=>v.toLocaleLowerCase().includes(orderSearch.trim().toLocaleLowerCase())))).length} 筆訂單</span></div>
                {orders.length>0 && !orders.filter(o=>(!pendingOnly || ["pending","manual_review"].includes(o.status)) && (!orderSearch.trim() || [o.receiver.name,o.order_number].some(v=>v.toLocaleLowerCase().includes(orderSearch.trim().toLocaleLowerCase())))).length && <section className="panel empty">沒有符合條件的訂單</section>}
                {orders.filter(o=>(!pendingOnly || ["pending","manual_review"].includes(o.status)) && (!orderSearch.trim() || [o.receiver.name,o.order_number].some(v=>v.toLocaleLowerCase().includes(orderSearch.trim().toLocaleLowerCase())))).map((o) => (
                  <section className="panel admin-order-card" key={o.id}>
                    <div className="order-card-header"><div><span className="detail-eyebrow">{orderDate(o.created_at)}</span><h2>{o.receiver.name} 的訂單</h2><small className="order-number">{o.order_number}</small></div><span className={"order-status status-"+o.status}>{orderStatus(o.status)}{o.is_test&&" · 測試"}</span></div>
                    <OrderProducts order={o}/>
                    <div className="admin-order-summary"><span>{o.payment_method==="711_cod"?"取貨付款":o.is_test?"ATM 測試付款":"銀行轉帳"} · {paymentStatus(o.payment?.status)}</span><span>合計 <strong>{money(o.total_amount)}</strong></span></div>
                    {o.status==="manual_review"&&<p className="message">訂單待人工處理：取消後收到付款通知，庫存不會再次扣除。</p>}
                    <details className="admin-order-details"><summary>查看配送與訂單詳細資訊</summary><OrderDetails order={o} adminView/></details>
                    <div className="row-actions">
                      {o.status === "pending" && (
                        <button
                          onClick={() =>
                            action(() =>
                              api("/admin/orders/" + o.id + "/transition", {
                                method: "POST",
                                body: JSON.stringify({
                                  to_status: "confirmed",
                                  expected_version: o.version,
                                  reason: "",
                                }),
                              }),
                            )
                          }
                        >
                          確認訂單
                        </button>
                      )}
                      {["pending", "confirmed"].includes(o.status) && (
                        <button
                          onClick={() => {
                            if (confirm("取消未出貨訂單並回補現貨庫存？"))
                              action(() =>
                                api("/admin/orders/" + o.id + "/transition", {
                                  method: "POST",
                                  body: JSON.stringify({
                                    to_status: "cancelled",
                                    expected_version: o.version,
                                    reason: "管理員取消",
                                  }),
                                }),
                              );
                          }}
                        >
                          取消訂單
                        </button>
                      )}
                      {!o.is_test && o.payment.status === "unpaid" && (
                        <button
                          onClick={() => {
                            const reference = prompt(
                              "確認已實際入帳，請輸入對帳參考（不會執行線上收款）",
                            );
                            if (reference)
                              action(() =>
                                api(
                                  "/admin/payments/" +
                                    o.payment.id +
                                    "/confirm",
                                  idempotent({
                                    amount: o.total_amount,
                                    reference,
                                    expected_version: o.payment.version,
                                  }),
                                ),
                              );
                          }}
                        >
                          確認收款
                        </button>
                      )}
                      {!o.is_test && ["paid", "partially_refunded"].includes(
                        o.payment.status,
                      ) && (
                        <button
                          onClick={() => {
                            const amount = Number(
                              prompt("輸入已實際完成的退款金額"),
                            );
                            const reference =
                              amount > 0
                                ? prompt(
                                    "實際退款對帳參考（只記錄，不自動匯款）",
                                  )
                                : null;
                            if (reference)
                              action(() =>
                                api(
                                  "/admin/payments/" +
                                    o.payment.id +
                                    "/record-refund",
                                  idempotent({
                                    amount,
                                    reference,
                                    expected_version: o.payment.version,
                                  }),
                                ),
                              );
                          }}
                        >
                          記錄退款
                        </button>
                      )}
                      {!o.is_test && o.status === "confirmed" && (
                        <button
                          onClick={() => {
                            const tracking_number = prompt(
                              "確認整單商品已到齊，輸入物流單號後出貨",
                            );
                            if (tracking_number)
                              action(() =>
                                api("/admin/orders/" + o.id + "/shipment", {
                                  method: "POST",
                                  body: JSON.stringify({
                                    tracking_number,
                                    all_items_ready_confirmed: true,
                                    expected_version: o.version,
                                  }),
                                }),
                              );
                          }}
                        >
                          確認到齊並出貨
                        </button>
                      )}
                      {o.status === "shipped" && (
                        <button
                          onClick={() =>
                            action(() =>
                              api("/admin/orders/" + o.id + "/transition", {
                                method: "POST",
                                body: JSON.stringify({
                                  to_status: "completed",
                                  expected_version: o.version,
                                  reason: "",
                                }),
                              }),
                            )
                          }
                        >
                          完成訂單
                        </button>
                      )}
                    </div>
                    {o.tracking_number && <p>物流單號：{o.tracking_number}</p>}
                  </section>
                ))}
              </>
            )}
            {page === "payment-sandbox" && <PaymentSandbox />}
            {page === "settings" && <AccountSettings />}
          </main>
        </section>
      </div>
      {editing !== undefined && (
        <ProductEditor
          product={editing}
          meta={meta}
          onClose={() => setEditing(undefined)}
          onSave={async () => {
            await refresh();
            setEditing(undefined);
          }}
        />
      )}
    </>
  );
}
