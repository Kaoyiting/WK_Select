import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import type { Product, Order } from "../../lib/types";
import { Dialog } from "../../components/Shared";

type RecordRow = Record<string, string | number | null>;
export function Records({ kind }: { kind: "customers" | "purchase-requests" }) {
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
