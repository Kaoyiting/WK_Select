import { useEffect, useRef, useState } from "react";
import { api, money, startAtmCheckout } from "../../lib/api";
import { unitPrice } from "../../lib/pricing";
import type { CartItem, Content, Order } from "../../lib/types";
import { AtmPayment } from "../OrderView";
import { StorePicker, type PickupStore } from "./StorePicker";
import { OrderSummary } from "./OrderSummary";

export function Checkout({
  cart,
  content,
  onClose,
  onSuccess,
}: {
  cart: CartItem[];
  content: Content;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [order, setOrder] = useState<Order | null>(null),
    [picker, setPicker] = useState(false),
    [store, setStore] = useState<{
      id: string;
      name: string;
      address: string;
    } | null>(null),
    [shipping, setShipping] = useState("711_cod"),
    [atmEnabled,setAtmEnabled]=useState(false);
  useEffect(()=>{api<{atm_test_enabled:boolean}>("/payments/options").then(x=>setAtmEnabled(x.atm_test_enabled)).catch(()=>{});},[]);
  useEffect(()=>{api<{preferred_store?:PickupStore}>("/me/profile").then(p=>{if(p.preferred_store)setStore(p.preferred_store);}).catch(()=>{});},[]);
  const lastAttempt = useRef({ body: "", key: "" });
  const subtotal = cart.reduce(
      (s, x) =>
        s + unitPrice(x.product) * x.quantity,
      0,
    ),
    fee = subtotal >= content.freeShippingThreshold ? 0 : content.shippingFee;
  return (
    <>
      <section className="checkout-page wrap"><div className="commerce-heading"><h1>{order ? "訂單已送出" : "填寫訂購資料"}</h1>{!order && <button className="outline-btn" onClick={onClose}>返回購物車</button>}</div>
        {order ? (
          <div className="checkout-success">
            <div className="success-mark">✓</div><h2>感謝您的訂購</h2>
            <p>合計 {money(order.total_amount)}</p>
            <p>請至會員中心查看訂單與付款狀態。</p>
            <AtmPayment order={order}/>
            <button
              className="solid-btn"
              onClick={() => {
                onClose();
                location.hash = "#member";
              }}
            >
              查看我的訂單
            </button>
          </div>
        ) : (
          <>
            <p className="checkout-intro">
              請確認商品、配送門市與聯絡資訊。送出後訂單會進入待確認狀態。
            </p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!store) {
                  setError("請先選擇711門市");
                  return;
                }
                const f = new FormData(e.currentTarget);
                setBusy(true);
                setError("");
                try {
                  const body = JSON.stringify({
                    items: cart.map((x) => ({
                      variant_id: x.variant.id,
                      quantity: x.quantity,
                    })),
                    receiver: {
                      name: f.get("name"),
                      phone: f.get("phone"),
                      email: f.get("email"),
                    },
                    store,
                    shipping_method: shipping,
                    payment_method:
                      shipping === "711_cod" ? "711_cod" : atmEnabled ? "ecpay_atm_test" : "bank_transfer",
                    expected_total_amount: subtotal + fee,
                    note: f.get("note"),
                  });
                  if (body !== lastAttempt.current.body)
                    lastAttempt.current = { body, key: crypto.randomUUID() };
                  const result = await api<Order>("/orders", {
                    method: "POST",
                    headers: { "Idempotency-Key": lastAttempt.current.key },
                    body,
                  });
                  setOrder(result);
                  onSuccess();
                  if(result.payment_method==="ecpay_atm_test") await startAtmCheckout(result.id);
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <div className="checkout-grid">
                <div className="checkout-fields">
                  <div className="checkout-section-title">收件資料</div>
                  <label>
                    收件人姓名
                    <input
                      name="name"
                      required
                      maxLength={80}
                      autoComplete="name"
                    />
                  </label>
                  <label>
                    手機號碼
                    <input
                      name="phone"
                      required
                      pattern="09[0-9]{8}"
                      
                      autoComplete="tel"
                    />
                  </label>
                  <label>
                    Email（選填）
                    <input name="email" type="email" />
                  </label>
                  <div className="store-field">
                    <span className="store-field-label">7-11 門市</span>
                    <div className="store-field-row">
                      <input
                        readOnly
                        value={
                          store
                            ? store.name +
                              "（" +
                              store.id +
                              "） " +
                              store.address
                            : ""
                        }
                        placeholder="請選擇門市"
                      />
                      <button
                        type="button"
                        className="store-choose"
                        onClick={() => setPicker(true)}
                      >
                        選擇門市
                      </button>
                    </div>
                  </div>
                  <label>
                    配送方式
                    <select
                      value={shipping}
                      onChange={(e) => setShipping(e.target.value)}
                    >
                      <option value="711_cod">7-11 取貨付款</option>
                      <option value="711_prepaid">7-11 取貨不付款</option>
                    </select>
                  </label>
                  <label>
                    付款方式
                    <select
                      value={
                        shipping === "711_cod" ? "711_cod" : atmEnabled ? "ecpay_atm_test" : "bank_transfer"
                      }
                      disabled
                    >
                      <option value="711_cod">7-11 取貨付款</option>
                      {atmEnabled?<option value="ecpay_atm_test">ATM 虛擬帳號（測試，請勿轉帳）</option>:<option value="bank_transfer">銀行轉帳</option>}
                    </select>
                  </label>
                  <label>
                    訂單備註
                    <textarea name="note" maxLength={1000} />
                  </label>
                </div>
                <div>
                  <div className="checkout-summary">
                    <OrderSummary cart={cart} content={content} />
                  </div>
                  <p className="checkout-hint">
                    {shipping==="711_cod"?"請於取貨時付款。":atmEnabled?"ATM 為測試付款，請勿實際轉帳；測試訂單不會安排出貨。":"銀行轉帳請等候客服通知。"}混合現貨與預購商品將待商品到齊後一起寄出。
                  </p>
                </div>
              </div>
              {error && (
                <p className="app-error" role="alert">
                  {error}
                </p>
              )}
              <button className="solid-btn checkout-submit" disabled={busy}>
                {busy ? "送出中…" : "確認送出訂單"}
              </button>
            </form>
          </>
        )}
      </section>
      {picker && <StorePicker onClose={()=>setPicker(false)} onSelect={s=>{setStore(s);setPicker(false);}}/>}
    </>
  );
}
