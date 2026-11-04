import { useEffect, useState } from "react";
import { api, image } from "../../lib/api";
import type { Content } from "../../lib/types";
import { Icon } from "../../components/Shared";
import { ImageUpload } from "./ImageUpload";
import { TextImageEditor } from "./TextImageEditor";

export function ContentEditor() {
  const [content, setContent] = useState<Content | null>(null),
    [version, setVersion] = useState(0),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false),
    [editing, setEditing] = useState<string | null>(null);
  useEffect(() => {
    api<{ value: Content; version: number }>("/admin/site-content")
      .then((c) => {
        setContent({
          ...c.value,
          announcementRows: c.value.announcementRows.map((r) => ({
            ...r,
            id: r.id || crypto.randomUUID(),
          })),
          heroSlides: c.value.heroSlides.map((r) => ({
            ...r,
            id: r.id || crypto.randomUUID(),
          })),
        });
        setVersion(c.version);
      })
      .catch((e) => setError(e.message));
  }, []);
  if (!content) return <p>{error || "載入網站內容…"}</p>;
  const c = content;
  function field(key: string, label: string, wide = false, multiline = false) {
    return (
      <label key={key} className={"field" + (wide ? " wide" : "")}>
        {label}
        {multiline ? (
          <textarea
            value={String(c[key] ?? "")}
            onChange={(e) => setContent({ ...c, [key]: e.target.value })}
          />
        ) : (
          <input
            value={String(c[key] ?? "")}
            onChange={(e) => setContent({ ...c, [key]: e.target.value })}
          />
        )}
      </label>
    );
  }
  return (
    <>
      <h1>網站內容</h1>
      <p className="tagline">
        修改公告、首頁投影片、頁尾與商品共用說明。新增或編輯完成後，按儲存即可更新前台。
      </p>
      {error && <p className="app-error" role="status">{error}</p>}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const saved = await api<{ value: Content; version: number }>(
              "/admin/site-content",
              {
                method: "PATCH",
                body: JSON.stringify({ value: c, expected_version: version }),
              },
            );
            setContent(saved.value);
            setVersion(saved.version);
            setError("已儲存，前台內容已更新");
            setEditing(null);
            localStorage.setItem("wk-content-updated", String(Date.now()));
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <section className="panel">
          <div className="content-section-head">
            <h2>公告</h2>
            <button
              type="button"
              className="btn"
              onClick={() => {
                const id = crypto.randomUUID();
                setContent({
                  ...c,
                  announcementRows: [
                    ...c.announcementRows,
                    {
                      id,
                      text: "",
                      sortOrder: c.announcementRows.length + 1,
                      enabled: true,
                    },
                  ],
                });
                setEditing(id);
              }}
            >
              ＋ 新增公告
            </button>
          </div>
          <div className="content-list">
            {[...c.announcementRows]
              .sort(
                (a, b) =>
                  Number(b.enabled) - Number(a.enabled) ||
                  a.sortOrder - b.sortOrder,
              )
              .map((r, i) => {
                const id = r.id || "announcement-" + i;
                const update = (data: Partial<typeof r>) =>
                  setContent({
                    ...c,
                    announcementRows: c.announcementRows.map((x) =>
                      x.id === r.id ? { ...x, ...data } : x,
                    ),
                  });
                return (
                  <div
                    key={id}
                    className={
                      "content-list-row" + (editing === id ? " is-editing" : "")
                    }
                  >
                    <div className="content-list-summary">
                      <div className="content-list-title">
                        {r.text || "尚未填寫公告"}
                      </div>
                      <div className="content-list-actions">
                        <button
                          type="button"
                          className="icon-action edit-icon"
                          aria-label="編輯公告"
                          onClick={() => setEditing(editing === id ? null : id)}
                        >
                          <Icon name="edit" />
                        </button>
                        <button
                          type="button"
                          className={
                            "icon-action visibility-icon " +
                            (r.enabled ? "is-visible" : "is-hidden")
                          }
                          aria-label={r.enabled ? "隱藏公告" : "顯示公告"}
                          aria-pressed={r.enabled}
                          onClick={() => update({ enabled: !r.enabled })}
                        >
                          <Icon name="eye" />
                        </button>
                        <button
                          type="button"
                          className="icon-action delete-icon" aria-label="刪除公告" title="刪除公告"
                          onClick={() =>
                            setContent({
                              ...c,
                              announcementRows: c.announcementRows.filter(
                                (x) => x !== r,
                              ),
                            })
                          }
                        >
                          <Icon name="delete" />
                        </button>
                      </div>
                    </div>
                    {editing === id && (
                      <div
                        className="content-row-editor"
                        style={{ display: "block" }}
                      >
                        <div className="form-grid">
                          <label className="field">
                            字幕文字
                            <input
                              value={r.text}
                              onChange={(e) => update({ text: e.target.value })}
                            />
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>

        </section>
        <section className="panel">
          <div className="content-section-head">
            <h2>首頁投影片</h2>
            <button
              type="button"
              className="btn"
              onClick={() => {
                const id = crypto.randomUUID();
                setContent({
                  ...c,
                  heroSlides: [
                    ...c.heroSlides,
                    {
                      id,
                      image: "",
                      alt: "",
                      sortOrder: c.heroSlides.length + 1,
                      enabled: true,
                    },
                  ],
                });
                setEditing(id);
              }}
            >
              ＋ 新增投影片
            </button>
          </div>
          {[...c.heroSlides]
            .sort(
              (a, b) =>
                Number(b.enabled) - Number(a.enabled) ||
                a.sortOrder - b.sortOrder,
            )
            .map((r, i) => {
              const id = r.id || "slide-" + i;
              const update = (data: Partial<typeof r>) =>
                setContent((old) =>
                  old
                    ? {
                        ...old,
                        heroSlides: old.heroSlides.map((x) =>
                          x.id === r.id ? { ...x, ...data } : x,
                        ),
                      }
                    : old,
                );
              return (
                <div key={id} className="content-list-row">
                  <div className="content-list-summary">
                    <div>
                      {r.image && (
                        <img
                          className="thumb"
                          src={image(r.image)}
                          alt={r.alt}
                        />
                      )}{" "}
                      {r.alt || "首頁圖片"}
                    </div>
                    <div className="content-list-actions">
                      <button
                        type="button"
                        className="icon-action edit-icon"
                        aria-label="編輯投影片"
                        onClick={() => setEditing(editing === id ? null : id)}
                      >
                        <Icon name="edit" />
                      </button>
                      <button
                        type="button"
                        className={
                          "icon-action visibility-icon " +
                          (r.enabled ? "is-visible" : "is-hidden")
                        }
                        aria-label={r.enabled ? "隱藏投影片" : "顯示投影片"}
                        onClick={() => update({ enabled: !r.enabled })}
                      >
                        <Icon name="eye" />
                      </button>
                      <button
                        type="button"
                        className="icon-action delete-icon" aria-label="刪除投影片" title="刪除投影片"
                        onClick={() =>
                          setContent({
                            ...c,
                            heroSlides: c.heroSlides.filter((x) => x !== r),
                          })
                        }
                      >
                        <Icon name="delete" />
                      </button>
                    </div>
                  </div>
                  {editing === id && (
                    <div
                      className="content-row-editor"
                      style={{ display: "block" }}
                    >
                      <div className="form-grid">
                        <label className="field">
                          圖片說明
                          <input
                            value={r.alt}
                            onChange={(e) => update({ alt: e.target.value })}
                          />
                        </label>
                        <label className="field">顯示比例<select value={r.aspectRatio || "original"} onChange={e=>update({aspectRatio:e.target.value})}><option value="original">原始比例（完整圖片）</option><option value="16/9">橫式 16:9</option><option value="4/3">橫式 4:3</option><option value="1/1">正方形 1:1</option><option value="2/3">直式 2:3</option></select></label>
                        <label className="field">圖片呈現<select value={r.fit || "contain"} onChange={e=>update({fit:e.target.value as "contain"|"cover"})}><option value="contain">完整顯示（不裁切）</option><option value="cover">填滿畫面（會裁切）</option></select></label>
                      </div>
                      <ImageUpload
                        crop
                        urls={r.image ? [r.image] : []}
                        onChange={(urls) =>
                          update({ image: urls.at(-1) || "" })
                        }
                        onBusy={setUploading}
                      />
                      <div className="content-editor-actions"><button type="submit" className="btn primary" disabled={busy || uploading || !r.image}>{busy ? "儲存中…" : "儲存"}</button></div>
                    </div>
                  )}
                </div>
              );
            })}

        </section>
        <section className="panel">
          <h2>品牌識別</h2>
          <div className="form-grid">
            {field("brandName", "品牌名稱")}
            {field("brandTagline", "品牌副標")}
            {field("logoAlt", "Logo替代文字")}
          </div>
          <ImageUpload
            urls={c.logoUrl ? [String(c.logoUrl)] : []}
            onChange={(urls) =>
              setContent((old) =>
                old ? { ...old, logoUrl: urls.at(-1) || "" } : old,
              )
            }
            onBusy={setUploading}
          />
        </section>
        <section className="panel">
          <h2>首頁與商品列表</h2>
          <div className="form-grid">
            {field("bestSellersTitle", "首頁商品區標題")}
            {field("catalogSubtitle", "商品列表副標")}
            {field("emptyText", "分類空頁提示", true, true)}
          </div>
        </section>
        <section className="panel">
          <h2>頁尾文字區塊</h2>
          <p className="content-help">
            每格是一個區塊；第一行為標題，其餘保留換行。連結可用
            [名稱](https://...)。
          </p>
          <div className="form-grid">
            {field("footerBlock1", "頁尾區塊1", true, true)}
            {field("footerBlock2", "頁尾區塊2", true, true)}
            {field("footerBlock3", "頁尾區塊3", true, true)}
            {field(
              "footerPaymentMethods",
              "付款方式文字（一行一項）",
              true,
              true,
            )}
            {field("footerCopyright", "版權文字", true)}
          </div>
        </section>
        <section className="panel">
          <h2>運費設定</h2>
          <div className="form-grid">
            <label className="field">
              運費（NT$）
              <input
                type="number"
                min={0}
                required
                value={c.shippingFee}
                onChange={(e) =>
                  setContent({ ...c, shippingFee: Number(e.target.value) })
                }
              />
            </label>
            <label className="field">
              免運商品小計門檻（NT$）
              <input
                type="number"
                min={0}
                required
                value={c.freeShippingThreshold}
                onChange={(e) =>
                  setContent({
                    ...c,
                    freeShippingThreshold: Number(e.target.value),
                  })
                }
              />
            </label>
          </div>
          <p className="content-help">
            新訂單使用更新後設定；既有訂單金額不變。
          </p>
        </section>
        <section className="panel">
          <h2>商品內容與訂購說明</h2>
          <TextImageEditor label="商品內容與訂購說明"
            value={String(c.productContentHtml || "")}
            onChange={(productContentHtml) =>
              setContent((old) => (old ? { ...old, productContentHtml } : old))
            }
          />
        </section>
        <section className="panel">
          <h2>寄送政策</h2>
          <TextImageEditor label="寄送政策內容" value={String(c.deliveryPolicyHtml || "")} onChange={deliveryPolicyHtml=>setContent(old=>old?{...old,deliveryPolicyHtml}:old)} />
        </section>
        <section className="panel">
          <h2>退換貨政策</h2>
          <p className="content-help">上線前請確認適用的退換貨條件與客服處理流程。</p>
          <TextImageEditor label="退換貨政策內容" value={String(c.returnsPolicyHtml || "")} onChange={returnsPolicyHtml=>setContent(old=>old?{...old,returnsPolicyHtml}:old)} />
        </section>

        {error && (
          <p className="app-error" role="status">
            {error}
          </p>
        )}
        <div className="content-savebar">
          <button className="btn primary" disabled={busy || uploading}>
            {busy ? "儲存中…" : "儲存網站內容"}
          </button>
        </div>
      </form>
    </>
  );
}
