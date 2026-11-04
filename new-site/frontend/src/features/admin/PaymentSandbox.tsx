import { useEffect, useState } from "react";
import type { Order } from "../../lib/types";
import { orderStatus, orderDate } from "../OrderView";
import { api, idempotent, money } from "../../lib/api";

type Transaction = { id:string; merchant_trade_no:string;amount:number;expire_days:number;status:string;source:string;bank_code:string;virtual_account:string;expires_on:string };
type State = { stage_ready:boolean; transactions:Transaction[] };
const statuses:Record<string,string>={created:"待測試",awaiting_payment:"已取號／待付款",paid:"測試付款成功",failed:"測試失敗"};
export function PaymentSandbox(){
  const [state,setState]=useState<State|null>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false),[orders,setOrders]=useState<Order[]>([]),[confirmExpiry,setConfirmExpiry]=useState("");
  async function load(){setState(await api<State>("/admin/payments/sandbox"));setOrders(await api<Order[]>("/admin/payments/order-tests"))}
  useEffect(()=>{load().catch(e=>setError(e.message))},[]);
  async function run(fn:()=>Promise<unknown>){setBusy(true);setError("");try{await fn();await load()}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
  async function checkout(t:Transaction){
    const data=await api<{action:string;fields:Record<string,string>}>(`/admin/payments/sandbox/${t.id}/checkout`,{method:"POST"});
    if(data.action!=="https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5")throw new Error("測試付款網址不符");
    const form=document.createElement("form");form.method="POST";form.action=data.action;
    for(const [name,value] of Object.entries(data.fields)){const input=document.createElement("input");input.type="hidden";input.name=name;input.value=value;form.append(input)}
    document.body.append(form);form.submit();form.remove();
  }
  return <><h1>ATM 金流測試</h1><section className="panel"><h2>會員訂單逾期測試</h2><p className="muted">僅限 ATM 測試訂單。按下後加速本機期限，先向綠界確認未付款，再取消並回補現貨；不會縮短綠界帳號本身的期限。若之後付款，訂單會待人工處理。</p>{orders.map(o=><article className="sandbox-transaction" key={o.id}><div className="sandbox-transaction-head"><strong>{o.order_number}</strong><span>{orderStatus(o.status)}</span></div><p>{money(o.total_amount)} · {o.payment?.status==="paid"?"已付款":"待付款"}</p>{o.payment_deadline&&<p>本機截止：{orderDate(o.payment_deadline)}</p>}{o.atm?.merchant_trade_no&&<small>{o.atm.merchant_trade_no}</small>}{["pending","confirmed"].includes(o.status)&&o.payment?.status==="unpaid"&&<div className="form-actions"><button className="btn" disabled={busy} onClick={()=>{if(confirmExpiry!==o.id){setConfirmExpiry(o.id);return;}run(()=>api(`/admin/payments/order-tests/${o.id}/expire`,{method:"POST"}));setConfirmExpiry("")}}>{confirmExpiry===o.id?"確認加速逾期並取消":"測試逾期未付款"}</button></div>}</article>)}<div className="form-actions"><button className="btn" disabled={busy} onClick={()=>run(load)}>重新整理訂單</button></div></section><section className="panel">
    <h2>本機模擬測試</h2><p className="muted">使用獨立測試交易，不會建立客戶訂單、扣庫存或實際收款。模擬帳號不能轉帳。</p>
    {!state?.stage_ready&&<p className="message">尚未設定公開 HTTPS 測試網址。目前可驗證本機流程；綠界實際取號與回傳通知尚未驗證。</p>}
    <form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);run(()=>api("/admin/payments/sandbox",idempotent({amount:Number(f.get("amount")),expire_days:Number(f.get("expire_days"))})))}}>
      <div className="form-grid"><label className="field">測試金額（新台幣）<input type="number" name="amount" min="16" max="49999" defaultValue="100" required/></label>
      <label className="field">測試繳費有效天數<input type="number" name="expire_days" min="1" max="60" defaultValue="1" required/></label></div>
      <div className="form-actions"><button className="btn primary" disabled={busy}>建立測試交易</button></div>
    </form>
    <p className="muted">訂單整合測試採 1 天，以綠界回傳截止日期的 23:59:59 為準。此頁獨立交易不會觸發訂單庫存回補。</p>
  </section>{error&&<p className="app-error" role="alert">{error}</p>}
  <section className="panel"><h2>最近測試交易</h2>{!state?.transactions.length&&<p className="muted">尚無測試交易。</p>}
  {state?.transactions.map(t=><article className="sandbox-transaction" key={t.id}>
    <div className="sandbox-transaction-head"><div><strong>{money(t.amount)}</strong><small>{t.merchant_trade_no}</small></div><span className="badge">{statuses[t.status]||t.status}</span></div>
    <p className="muted">{t.source==="local"?"本機模擬":"綠界測試環境"} · 有效天數 {t.expire_days} 天</p>
    {t.virtual_account&&<p>銀行代碼：{t.bank_code}　{t.source==="local"?"模擬帳號（不可轉帳）":"測試帳號（請勿真實轉帳）"}：{t.virtual_account}<br/>繳費期限：{t.expires_on}</p>}
    <div className="sandbox-actions">{t.source==="local"&&<>
      <button className="btn" disabled={busy||t.status!=="created"} onClick={()=>run(()=>api(`/admin/payments/sandbox/${t.id}/simulate`,{method:"POST",body:JSON.stringify({event:"info"})}))}>模擬取得帳號</button>
      <button className="btn" disabled={busy||t.status!=="awaiting_payment"} onClick={()=>run(()=>api(`/admin/payments/sandbox/${t.id}/simulate`,{method:"POST",body:JSON.stringify({event:"paid"})}))}>模擬付款通知</button>
    </>}{state.stage_ready&&t.status==="created"&&<button className="btn" disabled={busy} onClick={()=>run(()=>checkout(t))}>前往綠界測試取號</button>}</div>
  </article>)}<div className="form-actions"><button className="btn" disabled={busy} onClick={()=>run(load)}>重新整理結果</button></div></section></>;
}
