import { api, image, money } from "../../lib/api";
import type { Product } from "../../lib/types";
import { Icon } from "../../components/Shared";
import { productPayload } from "./productPayload";

export function ProductTable({ rows, onEdit, action }: { rows: Product[]; onEdit: (product: Product) => void; action: (fn: () => Promise<unknown>) => Promise<void> }) {
  return (
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
                    onClick={() => onEdit(p)}
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
}
