import { PaymentSandbox } from "./admin/PaymentSandbox";
import {OrderProducts,OrderDetails,orderStatus,paymentStatus,orderDate} from "./OrderView";
import { useEffect, useState } from "react";
import { api, setCsrf, money, image, idempotent } from "../lib/api";
import type {
  Product,
  Session,
  Metadata,
  Navigation,
  Order,
} from "../lib/types";
import { Dialog, Icon } from "../components/Shared";
import { ProductEditor } from "./admin/ProductEditor";
import { ContentEditor } from "./admin/ContentEditor";

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
          <h1>WK.SLELCT 管理後台</h1>
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
  const ProductTable = ({ rows }: { rows: Product[] }) => (
    <div className="table-wrap product-table-wrap">
      <table className="product-table">
        <thead>
          <tr>
            {[
              "商品",
              "品牌／分類",
              "供貨方式",
              "原價／特價",
              "狀態",
              "管理",
            ].map((x) => (
              <th key={x}>{x}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id}>
              <td>
                <div className="product-cell">
                  <img
                    className="thumb"
                    src={image(p.gallery[0] || "")}
                    alt=""
                  />
                  <span className="product-cell-title">{p.title}</span>
                </div>
              </td>
              <td>
                {p.brand || "未指定"}
                <br />
                {p.category}
              </td>
              <td>
                {p.kind === "stock" ? "現貨" : "預購"}
                {p.kind === "stock" && (
                  <small className="stock-count">
                    庫存{" "}
                    {p.variants.reduce((s, v) => s + (v.stock_qty || 0), 0)} 件
                  </small>
                )}
              </td>
              <td>
                {p.sale_amount !== null ? (
                  <>
                    <del>{money(p.price_amount!)}</del>
                    <strong style={{ color: "#a40000" }}>
                      {money(p.sale_amount)}
                    </strong>
                  </>
                ) : p.price_amount !== null ? (
                  money(p.price_amount)
                ) : (
                  "未設定"
                )}
              </td>
              <td>
                <span
                  className={"pill" + (p.status === "published" ? " live" : "")}
                >
                  {
                    (
                      {
                        published: "已上架",
                        draft: "草稿",
                        offline: "已下架",
                        archived: "已封存",
                      } as Record<string, string>
                    )[p.status]
                  }
                </span>
              </td>
              <td>
                <div className="row-actions">
                  <a className="icon-action" aria-label={"預覽 " + p.title} title="預覽商品頁（不會上架）" href={"/#preview/"+p.id} target="_blank" rel="noopener noreferrer"><Icon name="search" /></a>
                  <button
                    className="icon-action edit-icon" title={"編輯 " + p.title} aria-label={"編輯 " + p.title}
                    onClick={() => setEditing(p)}
                  >
                    <Icon name="edit" />
                  </button>
                  <button
                    className={"icon-action visibility-icon " + (p.status === "published" ? "is-visible" : "is-hidden")}
                    aria-label={(p.status === "published" ? "隱藏 " : "顯示 ") + p.title}
                    title={(p.status === "published" ? "隱藏 " : "顯示 ") + p.title}
                    onClick={() =>
                      action(() =>
                        api("/admin/products/" + p.id, {
                          method: "PATCH",
                          body: JSON.stringify(
                            productPayload(p, {
                              status:
                                p.status === "published"
                                  ? "offline"
                                  : "published",
                            }),
                          ),
                        }),
                      )
                    }
                  >
                    <Icon name="eye" />
                  </button>
                  <button className="icon-action delete-icon" aria-label={(p.status === "archived" ? "還原 " : "刪除 ")+p.title} title={(p.status === "archived" ? "還原 " : "刪除 ")+p.title} onClick={() => {if(p.status === "archived" || confirm("將商品移到已刪除？可還原，訂單紀錄會保留。")) action(() => api("/admin/products/"+p.id,{method:"PATCH",body:JSON.stringify(productPayload(p,{status:p.status === "archived" ? "offline" : "archived"}))}));}}>{p.status === "archived" ? "還原" : <Icon name="delete" />}</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <div className="empty">目前沒有商品</div>}
    </div>
  );
  return (
    <>
      <div className="shell">
        <aside className="side">
          <div className="brand">
            WK.SLELCT<small>STORE ADMIN</small>
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
                    <p>WK.SLELCT 商品與供貨狀況</p>
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
                  <ProductTable rows={products.filter(p=>p.status!=="archived").slice(0, 6)} />
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
                    rows={products.filter((p) => p.kind === "stock")}
                  />
                </section>
                <section className="panel">
                  <h2>預購商品（不填庫存）</h2>
                  <ProductTable
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

export function productPayload(p: Product, changes: Partial<Product> = {}) {
  const x = { ...p, ...changes };
  return {
    title: x.title,
    brand: x.brand,
    category: x.category,
    country: x.country,
    kind: x.kind,
    status: x.status,
    badge: x.badge,
    price_amount: x.price_amount,
    sale_amount: x.sale_amount,
    sale_starts_at: x.sale_starts_at || null,
    sale_ends_at: x.sale_ends_at || null,
    gallery: x.gallery,
    image_colors: x.image_colors || {},
    description_html: x.description_html,
    size_guide_html: x.size_guide_html,
    expected_version: x.version,
    variants: x.variants
      .filter((v) => v.enabled)
      .map(({ id, color, size, stock_qty, enabled }) => ({
        id,
        color,
        size,
        stock_qty,
        enabled,
      })),
  };
}

function NavigationEditor({
  meta,
  onChange,
}: {
  meta: Metadata;
  onChange: () => Promise<unknown>;
}) {
  const [rows, setRows] = useState<Navigation[]>([]),
    [error, setError] = useState(""),
    [editing, setEditing] = useState<Navigation | null>(null);
  const blank = {
    label: "",
    action: "all",
    action_value: "",
    parent_id: "",
    placement: "both",
    sort_order: 0,
    enabled: true,
  };
  const [form, setForm] = useState(blank);
  async function load() {
    setRows(await api("/admin/navigation"));
    await onChange();
  }
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);
  return (
    <>
      <h1>導覽選單</h1>
      <section className="panel">
        <h2>{editing ? "編輯" : "新增"}導覽項目</h2>
        <p className="content-help">新增「上衣」：顯示名稱填上衣、商品範圍選商品分類、上層選單選商品類別，分類名稱填上衣，再儲存。</p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await api(
                "/admin/navigation" + (editing ? "/" + editing.id : ""),
                {
                  method: editing ? "PATCH" : "POST",
                  body: JSON.stringify({
                    label: form.label,
                    action: form.action,
                    action_value: form.action_value || (form.action === "category" && form.parent_id ? form.label : ""),
                    placement: form.placement,
                    sort_order: form.sort_order,
                    enabled: form.enabled,
                    parent_id: form.parent_id || null,
                    expected_version: editing?.version,
                  }),
                },
              );
              setError("已儲存導覽項目");
              setEditing(null);
              setForm(blank);
              await load();
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          <div className="form-grid">
            <label className="field">
              顯示名稱
              <input
                required
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
              />
            </label>
            <label className="field">
              點擊後開啟的商品範圍
              <select
                value={form.action}
                onChange={(e) => setForm({ ...form, action: e.target.value })}
              >
                {[
                  ["all", "全部商品"],
                  ["category", "商品分類"],
                  ["brand", "品牌"],
                  ["stock", "現貨專區"],
                  ["korea", "韓國選品"],
                  ["japan", "日本代購"],
                  ["new", "本週新品"],
                  ["sale", "限時特價"],
                  ["custom", "自訂篩選"],
                ]
                  .filter(
                    ([v]) =>
                      ["all", "category", "custom"].includes(v) ||
                      rows.some((r) => r.action === v && r.enabled),
                  )
                  .map(([v, label]) => (
                    <option value={v} key={v}>
                      {rows.find((r) => r.action === v && !r.parent_id)
                        ?.label || label}
                    </option>
                  ))}
              </select>
            </label>
            <label className="field">
              上層選單
              <select
                value={form.parent_id}
                onChange={(e) =>
                  setForm({ ...form, parent_id: e.target.value })
                }
              >
                <option value="">主選單項目</option>
                {rows
                  .filter((r) => r.id !== editing?.id)
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
              </select>
            </label>
            <label className="field">
              分類／品牌名稱
              <input
                value={form.action_value}
                onChange={(e) =>
                  setForm({ ...form, action_value: e.target.value })
                }
                list="entryNames"
              />
              <datalist id="entryNames">
                {[...meta.brands, ...meta.categories].map((x) => (
                  <option key={x.id}>{x.name}</option>
                ))}
              </datalist>
            </label>
            <label className="field">
              顯示位置
              <select
                value={form.placement}
                onChange={(e) =>
                  setForm({ ...form, placement: e.target.value })
                }
              >
                <option value="both">頂部與左側</option>
                <option value="header">僅頂部</option>
                <option value="sidebar">僅左側</option>
              </select>
            </label>
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="btn"
              onClick={() => {
                setEditing(null);
                setForm(blank);
              }}
            >
              取消編輯
            </button>
            <button className="btn primary">儲存導覽項目</button>
          </div>
        </form>
        {error && <p className="app-error">{error}</p>}
      </section>
      <section className="panel">
        <h2>目前導覽項目</h2>
        {[...rows]
          .sort(
            (a, b) =>
              Number(b.enabled) - Number(a.enabled) ||
              a.sort_order - b.sort_order,
          )
          .map((n) => (
            <div className="admin-row" key={n.id}>
              <div className="navigation-item-summary">
                <span className="navigation-item-name">
                  {n.parent_id ? "↳ " : ""}{n.label}
                </span>
                <small className="navigation-item-details">
                  
                  <span>顯示位置：{{ both: "頂部與左側", header: "僅頂部", sidebar: "僅左側" }[n.placement]}</span>
                </small>
              </div>
              <div className="content-list-actions">
                <button
                  className="icon-action edit-icon"
                  aria-label={"編輯 " + n.label}
                  onClick={() => {
                    setEditing(n);
                    setForm({ ...n, parent_id: n.parent_id || "" });
                    window.scrollTo(0, 0);
                  }}
                >
                  <Icon name="edit" />
                </button>
                <button
                  className={
                    "icon-action visibility-icon " +
                    (n.enabled ? "is-visible" : "is-hidden")
                  }
                  aria-label={(n.enabled ? "隱藏 " : "顯示 ") + n.label}
                  aria-pressed={n.enabled}
                  onClick={async () => {
                    try {
                      await api("/admin/navigation/" + n.id, {
                        method: "PATCH",
                        body: JSON.stringify({
                          ...n,
                          expected_version: n.version,
                          id: undefined,
                          version: undefined,
                          enabled: !n.enabled,
                        }),
                      });
                      await load();
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  <Icon name="eye" />
                </button>
                <button
                  className="icon-action delete-icon" aria-label={"刪除 "+n.label} title={"刪除 "+n.label}
                  onClick={async () => {
                    if (confirm("確定刪除？有下層項目時需先處理下層。"))
                      try {
                        await api("/admin/navigation/" + n.id, {
                          method: "DELETE",
                        });
                        await load();
                      } catch (e) {
                        setError((e as Error).message);
                      }
                  }}
                >
                  <Icon name="delete" />
                </button>
              </div>
            </div>
          ))}
      </section>
    </>
  );
}

type RecordRow = Record<string, string | number | null>;
function Records({ kind }: { kind: "customers" | "purchase-requests" }) {
  const isRequest = kind === "purchase-requests";
  const [rows, setRows] = useState<RecordRow[]>([]),
    [customers, setCustomers] = useState<RecordRow[]>([]),
    [linkedProducts, setLinkedProducts] = useState<Product[]>([]),
    [linkedOrders, setLinkedOrders] = useState<Order[]>([]),
    [form, setForm] = useState<RecordRow | null>(null),
    [error, setError] = useState("");
  async function load() {
    setRows(await api("/admin/" + kind));
    if (isRequest) {
      const [c, p, o] = await Promise.all([
        api<RecordRow[]>("/admin/customers"),
        api<Product[]>("/admin/products"),
        api<Order[]>("/admin/orders"),
      ]);
      setCustomers(c);
      setLinkedProducts(p);
      setLinkedOrders(o);
    }
  }
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [kind]);
  const fields = isRequest
    ? [
        ["requested_name", "商品名稱"],
        ["contact", "聯絡人／聯絡方式"],
        ["product_url", "商品網址"],
        ["color", "顏色"],
        ["size", "尺寸"],
        ["quantity", "數量"],
        ["source", "來源"],
        ["notes", "備註"],
      ]
    : [
        ["name", "姓名"],
        ["phone", "電話"],
        ["email", "信箱"],
        ["notes", "內部備註"],
      ];
  return (
    <>
      <div className="heading">
        <h1>{isRequest ? "代購需求" : "客戶資料"}</h1>
        <button
          className="btn primary"
          onClick={() =>
            setForm(
              isRequest
                ? {
                    requested_name: "",
                    contact: "",
                    product_url: "",
                    color: "",
                    size: "",
                    quantity: 1,
                    source: "LINE",
                    notes: "",
                    status: "pending",
                    customer_id: null,
                    product_id: null,
                    order_id: null,
                  }
                : { name: "", phone: "", email: "", notes: "" },
            )
          }
        >
          ＋ 新增
        </button>
      </div>
      {error && <p className="app-error">{error}</p>}
      <section className={"panel " + (!isRequest ? "customer-directory" : "")}>
        {!isRequest && <div className="customer-directory-head"><span>姓名</span><span>電話</span><span>信箱</span><span>會員狀態</span><span>管理</span></div>}
        {rows.length ? (
          rows.map((r) => (
            <div className={isRequest ? "admin-row" : "admin-row customer-directory-row"} key={r.id}>
              {isRequest ? <div><strong>{r.requested_name}</strong><p>{r.contact}　{r.status}</p><small>{r.notes}</small></div> : <>
                <div className="customer-name" data-label="姓名"><strong>{r.name || "未填寫"}</strong>{r.notes && <small className="customer-note">備註：{r.notes}</small>}</div>
                <div data-label="電話">{r.phone ? <a href={"tel:"+r.phone}>{r.phone}</a> : <span className="customer-missing">未填寫</span>}</div>
                <div data-label="信箱">{r.email ? <a href={"mailto:"+r.email}>{r.email}</a> : <span className="customer-missing">未填寫</span>}</div>
                <div data-label="會員狀態"><span className={"customer-status " + (r.member_status === "disabled" ? "disabled" : "")}>{!r.member_id ? "人工建立" : r.member_status === "disabled" ? "已停用" : "使用中"}</span></div>
              </>}
              <div className="row-actions">
                <button className="btn" onClick={() => setForm(r)}>
                  編輯
                </button>
                {!isRequest && r.member_id && (
                  <button
                    className="btn"
                    onClick={async () => {
                      try {
                        await api("/admin/members/" + r.member_id, {
                          method: "PATCH",
                          body: JSON.stringify({
                            status:
                              r.member_status === "disabled"
                                ? "active"
                                : "disabled",
                          }),
                        });
                        await load();
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                  >
                    {r.member_status === "disabled" ? "啟用會員" : "停用會員"}
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="empty">目前沒有資料</div>
        )}
      </section>
      {form && (
        <Dialog
          className="admin-modal"
          title={isRequest ? "人工代購需求" : "客戶資料"}
          onClose={() => setForm(null)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const { id, version, member_id, member_status, preferred_store, ...data } = form;
              try {
                await api("/admin/" + kind + (id ? "/" + id : ""), {
                  method: id ? "PATCH" : "POST",
                  body: JSON.stringify({ ...data, expected_version: version }),
                });
                setForm(null);
                await load();
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            <div className="form-grid">
              {fields.map(([key, label]) => (
                <label className="field" key={key}>
                  {label}
                  {key === "notes" ? (
                    <textarea
                      value={String(form[key] ?? "")}
                      onChange={(e) =>
                        setForm({ ...form, [key]: e.target.value })
                      }
                    />
                  ) : (
                    <input
                      type={key === "quantity" ? "number" : "text"}
                      min={1}
                      required={key === "name" || key === "requested_name"}
                      value={String(form[key] ?? "")}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          [key]:
                            key === "quantity"
                              ? Number(e.target.value)
                              : e.target.value,
                        })
                      }
                    />
                  )}
                </label>
              ))}
              {isRequest && (
                <>
                  <label className="field">
                    關聯客戶
                    <select
                      value={String(form.customer_id || "")}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          customer_id: e.target.value || null,
                        })
                      }
                    >
                      <option value="">未關聯會員／客戶</option>
                      {customers.map((c) => (
                        <option value={String(c.id)} key={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    進度
                    <select
                      value={String(form.status)}
                      onChange={(e) =>
                        setForm({ ...form, status: e.target.value })
                      }
                    >
                      {[
                        ["pending", "待處理"],
                        ["purchasing", "採購中"],
                        ["arrived", "已到貨"],
                        ["unavailable", "無法取得"],
                        ["closed", "已結案"],
                      ].map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    關聯商品（選填）
                    <select
                      value={String(form.product_id || "")}
                      onChange={(e) =>
                        setForm({ ...form, product_id: e.target.value || null })
                      }
                    >
                      <option value="">未關聯</option>
                      {linkedProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    關聯訂單（選填）
                    <select
                      value={String(form.order_id || "")}
                      onChange={(e) =>
                        setForm({ ...form, order_id: e.target.value || null })
                      }
                    >
                      <option value="">未關聯</option>
                      {linkedOrders.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.order_number}　{o.receiver.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}
            </div>
            <div className="form-actions">
              <button className="btn primary">儲存</button>
            </div>
            {error && <p className="app-error">{error}</p>}
          </form>
        </Dialog>
      )}
    </>
  );
}

function AccountSettings() {
  const [error, setError] = useState(""),
    [logs, setLogs] = useState<RecordRow[]>([]);
  useEffect(() => {
    api<RecordRow[]>("/admin/audit-logs")
      .then(setLogs)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <>
      <h1>帳號與操作紀錄</h1>
      <section className="panel">
        <h2>修改自己的密碼</h2>
        <p>
          你與小幫手使用獨立帳號、權限相同。新增帳號／忘記密碼由維運命令處理。
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            api("/admin/auth/change-password", {
              method: "POST",
              body: JSON.stringify(
                Object.fromEntries(new FormData(e.currentTarget)),
              ),
            })
              .then(() => location.reload())
              .catch((e) => setError(e.message));
          }}
        >
          <div className="form-grid">
            <label className="field">
              目前密碼
              <input
                name="current_password"
                type="password"
                required
                autoComplete="current-password"
              />
            </label>
            <label className="field">
              新密碼（至少12字元）
              <input
                name="new_password"
                type="password"
                minLength={12}
                required
                autoComplete="new-password"
              />
            </label>
          </div>
          <div className="form-actions">
            <button className="btn primary">修改並重新登入</button>
          </div>
        </form>
        {error && <p className="app-error">{error}</p>}
      </section>
      <section className="panel">
        <h2>最近操作</h2>
        {logs.map((l) => (
          <div className="admin-row" key={l.id}>
            <span>{l.action}</span>
            <small>
              {l.admin_id}　{l.created_at}
            </small>
          </div>
        ))}
      </section>
    </>
  );
}
