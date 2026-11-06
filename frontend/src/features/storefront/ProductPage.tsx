import { useEffect, useState } from "react";
import { image, money } from "../../lib/api";
import { isSaleActive } from "../../lib/pricing";
import type { Content, Product, Variant } from "../../lib/types";
import { SaleCountdown } from "../../components/Shared";
import { cartLimit } from "./productRules";

export function ProductPage({
  p,
  content,
  add,
  checkout,
  preview = false,
}: {
  preview?: boolean;
  p: Product;
  content: Content;
  add: (p: Product, v: Variant, q: number) => void;
  checkout: (p: Product, v: Variant, q: number) => void;
}) {
  const [photo,setPhoto]=useState(0);
  const [,tickSale]=useState(0);useEffect(()=>{const timer=setInterval(()=>tickSale(n=>n+1),1000);return()=>clearInterval(timer);},[]);
  const variants = p.variants.filter((v) => v.enabled),
    colors = [...new Set(variants.map((v) => v.color))],
    sizes = [...new Set(variants.map((v) => v.size))].sort((a,b)=>{const list=["XXS","XS","S","M","L","XL","XXL","2XL","XXXL","3XL","4XL","5XL"];const x=list.indexOf(a.toUpperCase()),y=list.indexOf(b.toUpperCase());return x>=0 && y>=0 ? x-y : x>=0 ? -1 : y>=0 ? 1 : a.localeCompare(b,undefined,{numeric:true});});
  const [color, setColor] = useState(colors[0] || ""),
    [size, setSize] = useState(sizes[0] || ""),
    [quantity, setQuantity] = useState(1),
    [favorite, setFavorite] = useState(false),
    [error, setError] = useState("");
  const v = variants.find((v) => v.color === color && v.size === size),
    available =
      !preview && !!v &&
      (p.kind === "preorder" || (v.stock_qty ?? 0) >= quantity) &&
      p.price_amount !== null;
  return (
    <section className="product-page wrap">
      <div className="product-breadcrumb">
        <button onClick={() => (location.hash = "#catalog")}>全部商品</button> /{" "}
        {p.brand} / {p.title}
      </div>
      <div className="product-layout">
        <div className="product-gallery-layout">
          <div className="product-thumbs">
            {p.gallery.map((src, i) => (
              <button
                key={src}
                aria-label={"查看商品照片 " + (i + 1)}
                onClick={() => setPhoto(i)}
              >
                <img src={image(src)} alt="" />
              </button>
            ))}
          </div>
          <div className="product-gallery product-carousel">
            {p.gallery.length>0 && <img src={image(p.gallery[photo] || p.gallery[0])} alt={p.title+" "+(photo+1)} />}
            {p.gallery.length>1 && <><button className="product-photo-prev" aria-label="上一張商品照片" onClick={()=>setPhoto(n=>(n+p.gallery.length-1)%p.gallery.length)}>‹</button><button className="product-photo-next" aria-label="下一張商品照片" onClick={()=>setPhoto(n=>(n+1)%p.gallery.length)}>›</button></>}
          </div>
        </div>
        <div className="product-info">
          <div className="product-brand">
            {p.brand}　·　{p.kind === "stock" ? "現貨商品" : "預購商品"}
          </div>
          <h1>{p.title}</h1>
          {p.kind === "stock" && (
            <div className="product-note">
              <p>現貨商品，下單後 3 天內出貨。</p>
            </div>
          )}
          <div className="product-price">
            {isSaleActive(p) ? (
              <>
                <span className="old">{money(p.price_amount!)}</span>
                <strong className="sale">{money(p.sale_amount!)}</strong>
              </>
            ) : (
              <strong>
                {p.price_amount === null ? "價格洽詢" : money(p.price_amount)}
              </strong>
            )}
          </div>
          <SaleCountdown product={p}/><div className="product-controls">
            {colors.some(Boolean) && (
              <label className="product-control">
                顏色
                <select
                  value={color}
                  onChange={(e) => {
                    setColor(e.target.value);
                    const index = p.gallery.findIndex(
                      (url) => p.image_colors?.[url] === e.target.value,
                    );
                    if (index >= 0) setPhoto(index);
                  }}
                >
                  {colors.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
            )}
            {sizes.some(Boolean) && (
              <label className="product-control">
                尺寸
                <select value={size} onChange={(e) => setSize(e.target.value)}>
                  {sizes.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <div className="product-qty">
            <button
              aria-label="減少數量"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
            >
              −
            </button>
            <span>{quantity}</span>
            <button
              aria-label="增加數量"
              disabled={quantity >= (v ? cartLimit(p,v) : 0)}
              onClick={() => setQuantity(Math.min(quantity + 1,v ? cartLimit(p,v) : 1))}
            >
              ＋
            </button>
          </div>
          {!v && <p>此顏色尺寸組合未提供</p>}
          {p.kind === "stock" && v?.stock_qty === 0 && <p>目前售罄</p>}
          {p.price_amount === null && <p>價格洽詢</p>}
          <div className="product-actions">
            <button
              disabled={!available}
              onClick={() => v && add(p, v, quantity)}
            >
              加入購物車
            </button>
            <button
              disabled={!available}
              onClick={() => v && checkout(p, v, quantity)}
            >
              立即結帳
            </button>
          </div>
          <div className="product-utility">
            <button onClick={() => setFavorite(!favorite)}>
              {favorite ? "♥ 已加入追蹤清單" : "♡ 加入追蹤清單"}
            </button>
            <button
              onClick={() => {
                navigator.clipboard
                  .writeText(location.href)
                  .then(() => setError("已複製商品連結"))
                  .catch(() => setError("請複製網址列的商品連結"));
              }}
            >
              分享　↗
            </button>
          </div>
          {error && <p role="status">{error}</p>}
        </div>
      </div>
          <div className="product-sections product-details-below">
            <section className="product-section">
              <h2>商品描述</h2>
              <p>【Product】</p>
              <div
                className="product-rich-content"
                dangerouslySetInnerHTML={{
                  __html:
                    p.description_html || "<p>商品描述將由賣場編輯補充。</p>",
                }}
              />
            </section>
            <section className="product-section product-size-guide">
              <h2>尺寸數據參考</h2>
              <div
                className="product-rich-content"
                dangerouslySetInnerHTML={{
                  __html: p.size_guide_html || "<p>尺寸資訊請洽詢客服。</p>",
                }}
              />
            </section>
            <section className="product-section">
              <div
                className="product-rich-content"
                dangerouslySetInnerHTML={{
                  __html: String(content.productContentHtml || ""),
                }}
              />
            </section>
          </div>
    </section>
  );
}
