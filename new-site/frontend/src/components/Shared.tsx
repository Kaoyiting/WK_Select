import { isSaleActive } from "../lib/pricing";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { money } from "../lib/api";
import type { Product } from "../lib/types";
export function Icon({
  name,
}: {
  name: "heart" | "cart" | "search" | "user" | "menu" | "edit" | "eye" | "delete";
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      {name === "heart" ? (
        <path d="M20.8 8.7c0 5.1-8.8 10-8.8 10s-8.8-4.9-8.8-10A4.7 4.7 0 0 1 12 6.2a4.7 4.7 0 0 1 8.8 2.5Z" />
      ) : name === "cart" ? (
        <>
          <path d="M3 4h2l2.1 11.4a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 1.9-1.5L22 8H6" />
          <circle cx="9.5" cy="20" r="1" />
          <circle cx="18" cy="20" r="1" />
        </>
      ) : name === "search" ? (
        <>
          <circle cx="10.8" cy="10.8" r="6.5" />
          <path d="m16 16 5 5" />
        </>
      ) : name === "user" ? (
        <>
          <circle cx="12" cy="8" r="3.2" />
          <path d="M5 20c.5-3.5 3.2-5.3 7-5.3s6.5 1.8 7 5.3" />
          <circle cx="12" cy="12" r="9.5" />
        </>
      ) : name === "menu" ? (
        <path d="M4 6h16M4 12h16M4 18h16" />
      ) : name === "delete" ? (<><circle cx="12" cy="12" r="11" fill="currentColor" stroke="none" /><path d="m8 8 8 8m0-8-8 8" stroke="white" strokeWidth="2" strokeLinecap="round" /></>) : name === "edit" ? (
        <>
          <path d="m4 16 12-12 4 4L8 20H4zM14 6l4 4" />
        </>
      ) : (
        <>
          <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );
}
export function SaleCountdown({product:p}:{product:Product}) {const [t,setT]=useState(Date.now());useEffect(()=>{const timer=setInterval(()=>setT(Date.now()),1000);return()=>clearInterval(timer);},[]);if(!p.sale_ends_at || !isSaleActive(p))return null;const remaining=Math.max(0,Math.floor((Date.parse(p.sale_ends_at)-t)/1000));return <div className="sale-countdown">特價倒數 {Math.floor(remaining/86400)}天 {String(Math.floor(remaining/3600)%24).padStart(2,"0")}:{String(Math.floor(remaining/60)%60).padStart(2,"0")}:{String(remaining%60).padStart(2,"0")}</div>;}
export function Price({ product: p }: { product: Product }) {
  const [,tick]=useState(0);useEffect(()=>{if(!p.sale_starts_at&&!p.sale_ends_at)return;const timer=setInterval(()=>tick(n=>n+1),1000);return()=>clearInterval(timer);},[p.sale_starts_at,p.sale_ends_at]);
  return (
    <div className={"price" + (isSaleActive(p) ? " is-sale" : "")}>
      {isSaleActive(p) ? (
        <>
          <span className="old-price">
            {p.price_amount !== null ? money(p.price_amount) : ""}
          </span>
          <strong className="sale-price">{money(p.sale_amount!)}</strong>
        </>
      ) : p.price_amount !== null ? (
        <strong>{money(p.price_amount)}</strong>
      ) : null}
    </div>
  );
}
export function Dialog({
  children,
  onClose,
  className = "",
  title,
}: {
  children: ReactNode;
  onClose: () => void;
  className?: string;
  title?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current!;
    d.showModal();
    return () => {
      d.close();
    };
  }, []);
  return (
    <dialog ref={ref} className={className} onCancel={onClose}>
      <button
        type="button"
        className="close"
        onClick={onClose}
        aria-label="關閉"
      >
        ×
      </button>
      {title && <h2>{title}</h2>}
      {children}
    </dialog>
  );
}
