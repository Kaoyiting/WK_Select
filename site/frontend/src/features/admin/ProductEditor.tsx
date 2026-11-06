import { useState } from "react";
import { Dialog } from "../../components/Shared";
import type { Product, Metadata } from "../../lib/types";
import { api } from "../../lib/api";
import { productPayload } from "../Admin";
import { ImageUpload } from "./ImageUpload";
import { TextImageEditor } from "./TextImageEditor";
export function ProductEditor({
  product,
  meta,
  onClose,
  onSave,
}: {
  product: Product | null;
  meta: Metadata;
  onClose: () => void;
  onSave: () => Promise<void>;
}) {
  const blank: Product = {
    id: "",
    legacy_id: null,
    title: "",
    brand: "",
    category: "",
    country: "korea",
    kind: "preorder",
    status: "draft",
    badge: "",
    price_amount: null,
    sale_amount: null,
    gallery: [],
    description_html: "",
    size_guide_html: "",
    variants: [{ color: "", size: "", stock_qty: null, enabled: true }],
    date: 20261027,
    version: 1,
  };
  const [p, setP] = useState<Product>(
      product
        ? {
            ...structuredClone(product),
            variants: structuredClone(
              product.variants.filter((v) => v.enabled),
            ),
          }
        : blank,
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false);
  return (
    <Dialog
      className="admin-modal"
      title={product ? "編輯商品" : "新增商品"}
      onClose={onClose}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await api("/admin/products" + (product ? "/" + product.id : ""), {
              method: product ? "PATCH" : "POST",
              body: JSON.stringify(productPayload(p)),
            });
            await onSave();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="form-grid">
          <label className="field wide">
            商品名稱
            <input
              required
              maxLength={240}
              value={p.title}
              onChange={(e) => setP({ ...p, title: e.target.value })}
            />
          </label>
          <label className="field">
            品牌（選填）
            <input
              list="brands"
              value={p.brand}
              onChange={(e) => setP({ ...p, brand: e.target.value })}
            />
            <datalist id="brands">
              {meta.brands.map((b) => (
                <option key={b.id}>{b.name}</option>
              ))}
            </datalist>
          </label>
          <label className="field">
            商品分類
            <select value={p.category} onChange={e=>setP({...p,category:e.target.value})}>
              <option value="">請選擇商品分類</option>
              {[...new Set([...meta.categories.map(x=>x.name),...meta.navigation.filter(n=>["category","custom"].includes(n.action) && n.parent_id).map(n=>n.action_value || n.label),...(p.category?[p.category]:[])])].map(name=><option key={name} value={name}>{name}</option>)}
            </select>
          </label>
          <label className="field">
            供貨方式
            <select
              value={p.kind}
              onChange={(e) => {
                const kind = e.target.value as Product["kind"];
                setP({
                  ...p,
                  kind,
                  variants: p.variants.map((v) => ({
                    ...v,
                    stock_qty: kind === "stock" ? (v.stock_qty ?? 0) : null,
                  })),
                });
              }}
            >
              <option value="preorder">預購</option>
              <option value="stock">現貨</option>
            </select>
          </label>
          <label className="field">
            來源
            <select
              value={p.country}
              onChange={(e) => setP({ ...p, country: e.target.value })}
            >
              <option value="korea">韓國</option>
              <option value="japan">日本</option><option value="other">其他</option>
            </select>
          </label>
          <label className="field">
            原價（可留白）
            <input
              type="number"
              min={1}
              value={p.price_amount ?? ""}
              onChange={(e) =>
                setP({
                  ...p,
                  price_amount: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
          </label>
          <label className="field">
            特價（選填）
            <input
              type="number"
              min={1}
              value={p.sale_amount ?? ""}
              onChange={(e) =>
                setP({
                  ...p,
                  sale_amount: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
          </label>
          <label className="field">特價開始（台灣時間，選填）<input type="datetime-local" value={p.sale_starts_at ? new Date(new Date(p.sale_starts_at).getTime()+8*3600000).toISOString().slice(0,16):""} onChange={e=>setP({...p,sale_starts_at:e.target.value?new Date(e.target.value+"+08:00").toISOString():null})}/></label>
          <label className="field">特價結束（台灣時間，選填）<input type="datetime-local" value={p.sale_ends_at ? new Date(new Date(p.sale_ends_at).getTime()+8*3600000).toISOString().slice(0,16):""} onChange={e=>setP({...p,sale_ends_at:e.target.value?new Date(e.target.value+"+08:00").toISOString():null})}/></label>
          <label className="field">
            狀態
            <select
              value={p.status}
              onChange={(e) => setP({ ...p, status: e.target.value })}
            >
              <option value="draft">草稿</option>
              <option value="published">上架</option>
              <option value="offline">下架</option>
              <option value="archived">封存</option>
            </select>
          </label>
          <label className="field">
            商品標籤
            <select
              value={p.badge}
              onChange={(e) => setP({ ...p, badge: e.target.value })}
            >
              <option value="">無</option>
              {[
                ["new", "本週新品"],
                ["live", "限時連線"],
                ["sale", "限時特價"],
              ]
                .filter(([action]) =>
                  meta.navigation.some((n) => n.action === action),
                )
                .map(([a, label]) => (
                  <option value={label} key={a}>
                    {meta.navigation.find((n) => n.action === a)?.label ||
                      label}
                  </option>
                ))}
            </select>
          </label>
          <div className="wide">
            <h3>顏色與尺寸規格</h3>
            <p className="content-help">
              每列為實際提供的一種組合。
              {p.kind === "stock"
                ? "現貨必須填每種規格的數量。"
                : "預購不需要庫存數量。"}
            </p>
            <div className="stock-variants">
              {p.variants
                .filter((v) => v.enabled)
                .map((v, i) => (
                  <div key={v.id || i} className="variant-row">
                    <label className="variant-field">顏色<input
                      aria-label={"規格" + (i + 1) + "顏色"}
                      placeholder="顏色（無則留白）"
                      value={v.color}
                      onChange={(e) =>
                        setP({
                          ...p,
                          variants: p.variants.map((r, j) =>
                            i === j ? { ...r, color: e.target.value } : r,
                          ),
                        })
                      }
                    /></label>
                    <label className="variant-field">尺寸<input
                      aria-label={"規格" + (i + 1) + "尺寸"}
                      placeholder="尺寸（無則留白）"
                      value={v.size}
                      onChange={(e) =>
                        setP({
                          ...p,
                          variants: p.variants.map((r, j) =>
                            i === j ? { ...r, size: e.target.value } : r,
                          ),
                        })
                      }
                    /></label>
                    {p.kind === "stock" ? (
                      <label className="variant-field">庫存數量<input
                        placeholder="庫存數量"
                        aria-label={"規格" + (i + 1) + "庫存數量"}
                        type="number"
                        min={0}
                        required
                        value={v.stock_qty ?? ""}
                        onChange={(e) =>
                          setP({
                            ...p,
                            variants: p.variants.map((r, j) =>
                              i === j
                                ? {
                                    ...r,
                                    stock_qty: e.target.value
                                      ? Number(e.target.value)
                                      : null,
                                  }
                                : r,
                            ),
                          })
                        }
                      />
                      </label>
                    ) : (
                      <label className="variant-field">庫存數量<input value="預購不需填寫" disabled readOnly /></label>
                    )}
                    <button
                      type="button"
                      className="variant-remove" aria-label={"移除規格 " + (i+1)} title="移除規格"
                    disabled={p.variants.length === 1}
                      onClick={() =>
                        setP({
                          ...p,
                          variants: p.variants.filter((_, j) => i !== j),
                        })
                      }
                    >
                      ×
                    </button>
                  </div>
                ))}
            </div>
            <button
              type="button"
              className="btn add-variant-btn"
              onClick={() =>
                setP({
                  ...p,
                  variants: [
                    ...p.variants,
                    {
                      color: "",
                      size: "",
                      stock_qty: p.kind === "stock" ? 0 : null,
                      enabled: true,
                    },
                  ],
                })
              }
            >
              ＋ 新增規格
            </button>
          </div>
          <div className="wide">
            <h3>商品圖片</h3>
            <ImageUpload
              urls={p.gallery}
              onChange={(gallery) =>
                setP((old) => ({
                  ...old,
                  gallery,
                  image_colors: Object.fromEntries(
                    Object.entries(old.image_colors || {}).filter(([url]) =>
                      gallery.includes(url),
                    ),
                  ),
                }))
              }
              colors={[
                ...new Set(p.variants.map((v) => v.color).filter(Boolean)),
              ]}
              imageColors={p.image_colors || {}}
              onImageColorsChange={(image_colors) =>
                setP((old) => ({ ...old, image_colors }))
              }
              onBusy={setUploading}
            />
          </div>
          <div className="wide">
            <h3>商品描述</h3>
            <TextImageEditor label="商品描述"
              value={p.description_html}
              onChange={(description_html) =>
                setP((old) => ({ ...old, description_html }))
              }
            />
          </div>
          <div className="wide">
            <h3>尺寸數據參考</h3>
            <TextImageEditor label="尺寸數據參考" images onBusy={setUploading}
              value={p.size_guide_html}
              onChange={(size_guide_html) =>
                setP((old) => ({ ...old, size_guide_html }))
              }
            />
          </div>
        </div>
        {error && (
          <p className="app-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose}>
            取消
          </button>
          <button className="btn primary" disabled={busy || uploading}>
            {busy ? "儲存中…" : "儲存商品"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
