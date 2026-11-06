import { useEffect, useState } from "react";
import { api, money } from "../../lib/api";
import type { Order, Session } from "../../lib/types";
import { Dialog } from "../../components/Shared";
import { OrderDetails, OrderProducts, orderDate, orderStatus, paymentStatus } from "../OrderView";
import { StorePicker, type PickupStore } from "./StorePicker";

export function MemberPage({
  session,
  onLogin,
  onLogout,
}: {
  session: Session;
  onLogin: (s:Session)=>void;
  onLogout: () => void;
}) {
  const [selectedOrder,setSelectedOrder]=useState<Order|null>(null),[preferredStore,setPreferredStore]=useState<PickupStore|null>(null),[storePicker,setStorePicker]=useState(false);
  const [registering,setRegistering]=useState(false), [authBusy,setAuthBusy]=useState(false), [showPassword,setShowPassword]=useState(false);
  const [orders, setOrders] = useState<Order[]>([]),
    [error, setError] = useState(
      location.hash.includes("error=")
        ? "Google登入未完成，請重試或聯絡店主"
        : "",
    ),
    [profile, setProfile] = useState({
      name: "",
      phone: "",
      email: "",
      version: 0,
    });
  useEffect(() => {
    if (session.authenticated) {
      api<Order[]>("/orders")
        .then(setOrders)
        .catch((e) => setError(e.message));
      api<typeof profile & {preferred_store?:PickupStore}>("/me/profile")
        .then(p=>{setProfile(p);setPreferredStore(p.preferred_store||null);})
        .catch((e) => setError(e.message));
    }
  }, [session.authenticated]);
  return (
    <section className={"member-page wrap " + (!session.authenticated ? "member-login" : "member-account")}>
      <h1>{session.authenticated ? "會員中心" : registering ? "註冊會員" : "登入"}</h1>
      {error && (
        <p className="app-error" role="alert">
          {error}
        </p>
      )}
      {!session.authenticated ? (
        <>
          <form className="member-auth-form" onSubmit={async e=>{
            e.preventDefault();setError("");setAuthBusy(true);const f=new FormData(e.currentTarget);
            try {const next=await api<Session>(registering?"/auth/register":"/auth/login",{method:"POST",body:JSON.stringify({email:f.get("email"),password:f.get("password"),...(registering?{name:f.get("name")}: {})})});onLogin(next);}
            catch(e){setError((e as Error).message);}finally{setAuthBusy(false);}
          }}>
            {registering && <label className="auth-line"><span>姓名</span><input name="name" required autoComplete="name" maxLength={120}/></label>}
            <label className="auth-line"><span>電子郵件</span><input name="email" type="email" required autoComplete="email" maxLength={254}/></label>
            <label className="auth-line auth-password"><span>密碼</span><input name="password" type={showPassword?"text":"password"} required minLength={registering?12:1} maxLength={128} autoComplete={registering?"new-password":"current-password"}/><button type="button" className="password-reveal" aria-label={showPassword?"隱藏密碼":"顯示密碼"} onClick={()=>setShowPassword(!showPassword)}><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>{!showPassword && <path d="M3 3l18 18"/>}</svg></button></label>
            {registering && <p className="auth-hint">密碼請使用至少 12 個字元。</p>}
            {!registering && <button type="button" className="forgot-password" onClick={()=>setError("忘記密碼請聯繫官方 LINE 客服協助。Google 會員請使用 Google 登入。")}>忘記密碼？</button>}
            <button className="auth-submit" disabled={authBusy}>{authBusy?"處理中…":registering?"註冊並開始購物":"開始購物吧！"}</button>
          </form>
          <div className="auth-separator"><span>或使用其他方式</span></div>
          {session.google_configured && <a className="google-signin" href="/api/v1/auth/google/start" aria-label="使用 Google 登入"><svg width="36" height="36" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.97-3.38.97-2.61 0-4.82-1.76-5.61-4.12H3.05v2.59A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.39 13.93A6 6 0 0 1 6.07 12c0-.67.12-1.32.32-1.93V7.48H3.05A10 10 0 0 0 2 12c0 1.61.38 3.14 1.05 4.52l3.34-2.59Z"/><path fill="#EA4335" d="M12 5.95c1.47 0 2.79.5 3.82 1.49l2.87-2.87A9.61 9.61 0 0 0 12 2a10 10 0 0 0-8.95 5.48l3.34 2.59C7.18 7.71 9.39 5.95 12 5.95Z"/></svg></a>}
          <div className="join-member"><h2>{registering?"已經是會員？":"還不是會員？"}</h2><p>建立會員帳號，方便查看訂單與管理聯絡資料。</p><button type="button" onClick={()=>{setRegistering(!registering);setError("");}}>{registering?"返回登入":"註冊會員"}</button></div>
        </>
      ) : (
        <>
          <p className="member-welcome">{session.name}，歡迎回來</p>
          <button
            onClick={() =>
              api("/auth/logout", { method: "POST" })
                .then(onLogout)
                .catch((e) => setError(e.message))
            }
          >
            登出
          </button>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              api<typeof profile>("/me/profile", {
                method: "PATCH",
                body: JSON.stringify({
                  name: profile.name,
                  phone: profile.phone,
                  email: profile.email,
                  expected_version: profile.version,
                }),
              })
                .then((p) => {
                  setProfile(p);
                  setError("資料已儲存");
                })
                .catch((e) => setError(e.message));
            }}
          >
            <label>
              姓名
              <input
                required
                value={profile.name}
                onChange={(e) =>
                  setProfile({ ...profile, name: e.target.value })
                }
              />
            </label>
            <label>
              電話
              <input
                value={profile.phone}
                onChange={(e) =>
                  setProfile({ ...profile, phone: e.target.value })
                }
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={profile.email}
                onChange={(e) =>
                  setProfile({ ...profile, email: e.target.value })
                }
              />
            </label>
            <button>儲存聯絡資料</button>
          </form>
          <section className="preferred-store-panel"><div className="account-section-heading"><h2>常用取貨門市</h2><button type="button" onClick={()=>setStorePicker(true)}>{preferredStore?"更換門市":"新增門市"}</button></div>{preferredStore?<div className="preferred-store-card"><span className="store-logo">7</span><div><strong>7-ELEVEN {preferredStore.name}</strong><p>{preferredStore.address}</p><small>結帳時自動帶入，仍可更換其他門市。</small></div></div>:<p className="account-empty">設定常用門市，讓下次結帳更方便。</p>}</section>
          {storePicker && <StorePicker onClose={()=>setStorePicker(false)} onSelect={async store=>{try{await api("/me/preferred-store",{method:"PUT",body:JSON.stringify({store})});setPreferredStore(store);setStorePicker(false);const p=await api<typeof profile>("/me/profile");setProfile(p);}catch(e){setError((e as Error).message);setStorePicker(false);}}}/>}
          <div className="account-section-heading"><h2>我的訂單</h2><span>{orders.length} 筆訂單</span></div>
          {orders.length?orders.map(o=><article className="member-order order-card" key={o.id}><div className="order-card-header"><div><span className="detail-eyebrow">下單時間</span><p>{orderDate(o.created_at)}</p></div><span className={"order-status status-"+o.status}>{orderStatus(o.status)}{o.is_test&&" · 測試"}</span></div><OrderProducts order={o}/><div className="order-card-footer"><div><small>{paymentStatus(o.payment?.status)}</small><span>合計 <strong>{money(o.total_amount)}</strong></span></div><button onClick={async()=>{try{setSelectedOrder(await api<Order>("/orders/"+o.id));}catch(e){setError((e as Error).message);}}}>查看訂單 <span>→</span></button></div></article>):<p className="account-empty">目前沒有訂單，歡迎挑選喜歡的商品。</p>}
          {selectedOrder && <Dialog className="order-detail-dialog" title="訂單詳情" onClose={()=>setSelectedOrder(null)}><div className="order-reference">訂單編號 {selectedOrder.order_number}<span>{orderDate(selectedOrder.created_at)}</span></div><OrderProducts order={selectedOrder}/><OrderDetails order={selectedOrder}/></Dialog>}
        </>
      )}
    </section>
  );
}
