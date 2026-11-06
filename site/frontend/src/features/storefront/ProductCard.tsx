import { useState } from "react";
import { image } from "../../lib/api";
import type { Navigation, Product } from "../../lib/types";
import { Icon, Price, SaleCountdown } from "../../components/Shared";

export function ProductCard({p,navigation,openProduct}:{p:Product;navigation:Navigation[];openProduct:(p:Product)=>void}) {
    const [favorite, setFavorite] = useState(false);
    const soldOut = p.kind === "stock" && !p.variants.some(v=>v.enabled && (v.stock_qty ?? 0)>0);
    const badgeAction = (
      { 本週新品: "new", 限時連線: "live", 限時特價: "sale" } as Record<
        string,
        string
      >
    )[p.badge];
    const badge =
      navigation.find((n) => n.action === badgeAction)?.label ||
      (!badgeAction ? p.badge : "");
    return (
      <article className={"card"+(soldOut?" is-sold-out":"")}>
        <div
          className="photo"
          role="link"
          tabIndex={0}
          aria-label={"查看商品：" + p.title}
          onClick={() => openProduct(p)}
          onKeyDown={(e) => {
            if (e.key === "Enter") openProduct(p);
          }}
        >
          <img src={image(p.gallery[0] || "")} alt={p.title} loading="lazy" />
          {soldOut ? <span className="badge sold-out-label">已售罄</span> : badge && <span className="badge">{badge}</span>}
          <div className="card-actions">
            <button
              className={"round favorite" + (favorite ? " active" : "")}
              aria-label={"收藏 " + p.title}
              aria-pressed={favorite}
              onClick={(e) => {
                e.stopPropagation();
                setFavorite(!favorite);
              }}
            >
              <Icon name="heart" />
            </button>
            <button
              className="round add" disabled={soldOut}
              aria-label={"加入 " + p.title + " 購物車"}
              onClick={(e) => {
                e.stopPropagation();
                openProduct(p);
              }}
            >
              <Icon name="cart" />
            </button>
          </div>
        </div>
        <button className="product-link" onClick={() => openProduct(p)}>
          <div className="product-title">{p.title}</div>
          <div className="product-sub">{soldOut ? "已售罄" : p.kind === "stock" ? "現貨" : ""}</div>
          <Price product={p} /><SaleCountdown product={p}/>
        </button>
      </article>
    );
  }
